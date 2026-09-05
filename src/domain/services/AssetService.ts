import {
  AssetValueFailure,
  AssetValueRefreshReport,
  emitAssetValuesRefreshed,
} from '@/data/assetValueEvents';
import { emitDatabaseReplaced } from '@/data/databaseEvents';
import { AutoSyncService } from '@/data/sync/AutoSyncService';
import {
  AssetRepository,
  hasEmbeddedCollections,
} from '@/data/repositories/assets/AssetRepository';
import {
  clearScriptFailure,
  recordScriptFailure,
  shouldAttemptScript,
} from '@/data/repositories/assets/ScriptAttemptLog';
import { InvestmentRepository } from '@/data/repositories/assets/InvestmentRepository';
import { SIPRepository } from '@/data/repositories/assets/SIPRepository';
import { Asset, IAsset, needsScriptExecution } from '../entities/assets/Asset';
import { IInvestment, Investment } from '../entities/assets/Investment';
import { ISIP, SIP } from '../entities/assets/SIP';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { mapWithConcurrency } from '../utils/Concurrency';
import { Logger } from '../utils/Logger';
import { processSchedules } from '../utils/ScheduleProcessor';
import { executeValueScript } from '../utils/ScriptExecutor';

/**
 * Portfolio totals across assets that may each be in a different currency, so
 * every amount converts to the base currency before it is summed.
 */
export interface AssetPortfolioTotals {
  totalValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  currency: Currency;
  /** Currencies with no rate, whose holdings contributed 0 to the figures above. */
  unratedCurrencies: Currency[];
}

export function computeAssetPortfolioTotals(
  assets: Asset[],
  converter: CurrencyConverter
): AssetPortfolioTotals {
  const totalValue = assets.reduce(
    (sum, asset) => sum + converter.toBase(asset.getValue() || 0, asset.currency),
    0
  );
  const totalInvested = assets.reduce(
    (sum, asset) => sum + converter.toBase(asset.getTotalInvestedAmount(), asset.currency),
    0
  );
  const totalProfitLoss = totalValue - totalInvested;

  return {
    totalValue,
    totalInvested,
    totalProfitLoss,
    totalProfitLossPercentage: totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0,
    currency: converter.getBaseCurrency(),
    unratedCurrencies: converter.getUnratedCurrencies(assets.map(asset => asset.currency)),
  };
}

/**
 * What one script run did: wrote a value, failed, or was not due one. The three
 * are kept apart because a run skipped by the retry throttle must not be counted
 * as a refresh — that is the difference between "nothing needed doing" and
 * "everything is quietly broken".
 */
interface AssetValueOutcome {
  updated?: boolean;
  failure?: AssetValueFailure;
}

/**
 * How many value scripts may be in flight at once.
 *
 * Modest for `FundSources`' reason: these are third-party APIs nobody here has
 * an agreement with, and a portfolio's scripts are often several against the
 * same host.
 */
const SCRIPT_CONCURRENCY = 6;

export class AssetService {
  private readonly assetRepository: AssetRepository;
  private readonly investmentRepository: InvestmentRepository;
  private readonly sipRepository: SIPRepository;

  constructor() {
    this.assetRepository = new AssetRepository();
    this.investmentRepository = new InvestmentRepository();
    this.sipRepository = new SIPRepository();
  }

  /**
   * `skipValueUpdate` suppresses the per-asset value-script execution, which
   * otherwise fires a network call for every asset. Bulk callers (the AI
   * importer) pass it and run `updateValues()` once at the end instead.
   */
  public async createAsset(
    asset: IAsset,
    options: { skipValueUpdate?: boolean } = {}
  ): Promise<Asset> {
    const createdAsset = await this.assetRepository.create(asset).then(a => this.toAsset(a));
    if (!options.skipValueUpdate) {
      this.announceFailure(await this.updateValue(createdAsset));
    }
    return createdAsset;
  }

  /**
   * A changed script discards the value the old one produced.
   *
   * Every caller hands back the whole row it was given, and both the form and
   * the importer carry `scriptValue` and `scriptValueUpdatedAt` through
   * untouched. So changing the script — pointing it at a different scheme code,
   * or fixing one that was broken — left yesterday's stamp in place, and
   * `needsScriptExecution` then answered "no" for up to a day: the asset went on
   * showing the *old instrument's* price, and a fix appeared not to work.
   *
   * The failure throttle is cleared for the same reason. Someone who has just
   * rewritten a script that was failing is owed an attempt now, not in an hour.
   */
  public async updateAsset(asset: IAsset): Promise<Asset> {
    const stored =
      asset.id === undefined ? undefined : await this.assetRepository.getById(asset.id);
    const scriptChanged = stored !== undefined && stored.script !== asset.script;
    if (scriptChanged && asset.id !== undefined) clearScriptFailure(asset.id);

    const updatedAsset = await this.assetRepository
      .update(
        scriptChanged
          ? { ...asset, scriptValue: undefined, scriptValueUpdatedAt: undefined }
          : asset
      )
      .then(a => this.toAsset(a));
    this.announceFailure(await this.updateValue(updatedAsset));
    return updatedAsset;
  }

  public async deleteAsset(id: number): Promise<void> {
    await this.assetRepository
      .delete(id)
      .then(() => this.investmentRepository.deleteByAssetId(id))
      .then(() => this.sipRepository.deleteByAssetId(id));
  }

  public async getAssetById(id: number): Promise<Asset> {
    return await this.assetRepository.getById(id).then(async asset => {
      return this.toAsset(asset);
    });
  }

  public async getAssets(): Promise<Asset[]> {
    const assets = (await this.assetRepository.getAll()).sort((a, b) => {
      if (a.manualValue !== undefined && b.manualValue !== undefined) {
        return b.manualValue - a.manualValue;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    return Promise.all(
      assets.map(async asset => {
        return this.toAsset(asset);
      })
    );
  }

  public async addInvestment(investment: IInvestment): Promise<Investment> {
    const createdTransaction = await this.investmentRepository.create(investment);
    return new Investment({
      ...createdTransaction,
    });
  }

  public async updateInvestment(investment: IInvestment): Promise<Investment> {
    const updatedTransaction = await this.investmentRepository.update(investment);
    return new Investment({
      ...updatedTransaction,
    });
  }

  public async getInvestmentByAssetId(assetId: number): Promise<Investment[]> {
    return (await this.investmentRepository.getByAssetId(assetId))
      .map(investment => {
        return new Investment({
          ...investment,
        });
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  public async deleteInvestment(id: number): Promise<void> {
    await this.investmentRepository.delete(id);
  }

  public async addSIP(sip: ISIP): Promise<SIP> {
    const createdTransaction = await this.sipRepository.create(sip);
    return new SIP({
      ...createdTransaction,
    });
  }

  public async updateSIP(sip: ISIP): Promise<SIP> {
    await this.investmentRepository.deleteBySipId(sip.id!);
    const updatedTransaction = await this.sipRepository.update(sip);
    return new SIP({
      ...updatedTransaction,
    });
  }

  public async getSIPsByAssetId(assetId: number): Promise<SIP[]> {
    return (await this.sipRepository.getByAssetId(assetId)).map(sip => {
      return new SIP({
        ...sip,
      });
    });
  }

  public async deleteSIP(id: number): Promise<void> {
    await this.investmentRepository.deleteBySipId(id);
    await this.sipRepository.delete(id);
  }

  /**
   * Clears the transaction copies a past whole-row value write left inside the
   * asset rows — see `hasEmbeddedCollections` for how they got there.
   *
   * Here rather than in a schema upgrade, deliberately. A `version().upgrade()`
   * would cost a Dexie version bump, and a store at a version above what an
   * older bundle asks for is a store that bundle cannot open at all — a real
   * cost to every other device, paid to remove bytes nothing reads. This sweep
   * needs no such promise: it is idempotent, it runs off a read the value
   * refresh was making anyway, and a device that has not run it yet is a device
   * carrying a slightly larger row.
   *
   * Suppressed for the reason every non-user write is. These rows are not the
   * user changing their mind, so publishing them would have every device push
   * its whole database on the first launch after this build, racing its own
   * first pull — and the wrapper spans only the writes, never a wait.
   *
   * A pull can hand back rows another device has not swept yet. That settles
   * itself: `App` pulls before it refreshes values, so the very next launch
   * cleans what arrived.
   */
  private async pruneEmbeddedCollections(rows: IAsset[]): Promise<void> {
    const embedded = rows.filter(hasEmbeddedCollections);
    if (embedded.length === 0) return;

    Logger.info(`Removing embedded transaction copies from ${embedded.length} asset rows`);
    await AutoSyncService.withoutScheduling(async () => {
      for (const row of embedded) {
        if (row.id === undefined) continue;
        await this.assetRepository.clearEmbeddedCollections(row.id);
      }
    });
  }

  /**
   * Puts a single failed run on the toast surface.
   *
   * Saving an asset runs its script too, and that run failing is the moment the
   * user is most able to act on it — they are looking at the script they just
   * wrote. There is no matching success announcement because the dialog's own
   * reload already shows the new figure.
   */
  private announceFailure(outcome: AssetValueOutcome): void {
    if (!outcome.failure) return;
    emitAssetValuesRefreshed({ updated: 0, failures: [outcome.failure] });
  }

  /**
   * Refreshes one asset's script value.
   *
   * The write is suppressed and the script run is not, and the split is the
   * point. Suppression is a global flag, not something scoped to the work that
   * asked for it, so anything it spans is claimed as automatic — including an
   * edit the *user* makes in the meantime, which then gets no new `updatedAt`
   * and no unpushed mark, and is silently overwritten by the next merge. Holding
   * it across a script that fetches a price left that window open for as long as
   * the network took, once per asset, on every launch.
   *
   * The write itself does belong under it: a value refresh is not the user
   * changing their mind, so it must neither wake a push nor outrank a real edit
   * made on another device. It goes through `updateScriptValue` rather than a
   * whole row for the reasons stated there — the same edit-in-flight the split
   * above protects is one a full-row write would have clobbered anyway.
   *
   * The value is stamped even when it comes back unchanged, unlike
   * `CurrencyService.updateRate`, which skips that write. The stamp *is* the
   * freshness gate here, so leaving it alone on an unchanged NAV — a weekend, a
   * holiday — would ask for the same figure again on the next launch, and the
   * write costs nothing it can push.
   */
  private async updateValue(asset: IAsset): Promise<AssetValueOutcome> {
    if (asset.id === undefined || !needsScriptExecution(asset)) return {};

    // A failing script has no stamp to gate it, so without this it is retried on
    // every launch for ever. See `ScriptAttemptLog`.
    if (!shouldAttemptScript(asset.id)) return {};

    try {
      const newValue = await executeValueScript(asset.script!);
      Logger.info(`Updating script value for ${asset.name} to ${newValue}`);
      await AutoSyncService.withoutScheduling(() =>
        this.assetRepository.updateScriptValue(asset.id!, newValue, new Date())
      );
      clearScriptFailure(asset.id);
      return { updated: true };
    } catch (error) {
      recordScriptFailure(asset.id);
      Logger.warn(`Failed to update script value for ${asset.name}:`, error);
      return {
        failure: {
          asset: asset.name,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Runs every stale value script and announces what happened.
   *
   * Reads the rows rather than `getAssets()`: the staleness question never looks
   * at a transaction, and building the entities to ask it costs two extra
   * queries per asset.
   *
   * Concurrent rather than serial. One at a time meant the last asset's price
   * arrived N round trips after the first, so on a portfolio of any size the
   * figures kept changing under a user who was already reading them — and the
   * ones at the end of the list simply never arrived if the tab was closed
   * first. The limit is modest because these scripts hit third-party APIs
   * nobody here has an agreement with, and several of them are usually the same
   * host.
   */
  public async updateValues(): Promise<AssetValueRefreshReport> {
    const rows = await this.assetRepository.getAll();
    await this.pruneEmbeddedCollections(rows);

    const stale = rows.filter(needsScriptExecution);

    const outcomes = await mapWithConcurrency(
      stale,
      asset => this.updateValue(asset),
      SCRIPT_CONCURRENCY
    );

    const failures: AssetValueFailure[] = [];
    let updated = 0;
    for (const outcome of outcomes) {
      // `updateValue` swallows its own errors, so a rejection here would be a
      // bug rather than a bad script; count it as neither.
      if (outcome.status !== 'fulfilled') continue;
      if (outcome.value.failure) failures.push(outcome.value.failure);
      else if (outcome.value.updated) updated++;
    }

    // Two announcements, because they are two different pieces of news. A
    // rewritten row is the one thing every container that holds assets has to
    // hear about — which is what `onDatabaseReplaced` already means to them, and
    // reusing it is what saves each of them a second subscription. The report is
    // for whoever is going to tell the user, and only that.
    if (updated > 0) emitDatabaseReplaced();

    const report = { updated, failures };
    if (updated > 0 || failures.length > 0) emitAssetValuesRefreshed(report);
    return report;
  }

  public async createSIPInvestments(): Promise<void> {
    const assets = await this.getAssets();
    const allSips = (await Promise.all(assets.map(a => this.getSIPsByAssetId(a.id!)))).flat();
    const entries = allSips.map(sip => ({
      schedule: sip,
      occurrences: sip.getPendingOccurrences(new Date()),
    }));
    await processSchedules(
      entries,
      investment => this.investmentRepository.create(investment),
      (sip, lastGeneratedDate) => this.sipRepository.update({ ...sip, lastGeneratedDate })
    );
  }

  private async toAsset(data: IAsset): Promise<Asset> {
    const investments = (await this.getInvestmentByAssetId(data.id!)).map(
      inv => new Investment(inv)
    );
    const sips = (await this.getSIPsByAssetId(data.id!)).map(sip => new SIP(sip));
    return new Asset({
      ...data,
      investments: investments,
      sips,
    });
  }
}
