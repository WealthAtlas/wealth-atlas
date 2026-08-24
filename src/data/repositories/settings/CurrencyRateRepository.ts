import { db } from '@/data/database';
import { deleteSynced } from '@/data/sync/merge/Tombstones';
import { Currency } from '@/domain/entities/shared/Currency';
import { ICurrencyRate } from '@/domain/entities/shared/CurrencyRate';

export class CurrencyRateRepository {
  public async getAll(): Promise<ICurrencyRate[]> {
    return await db.currencyRates.toArray();
  }

  public async getByCode(code: Currency): Promise<ICurrencyRate | undefined> {
    return await db.currencyRates.where('code').equals(code).first();
  }

  /** One row per currency: an existing row for the same code is replaced. */
  public async save(rate: ICurrencyRate): Promise<ICurrencyRate> {
    const existing = await this.getByCode(rate.code);
    const row = { ...rate, id: rate.id ?? existing?.id };
    const id = await db.currencyRates.put(row);
    return { ...row, id };
  }

  public async delete(id: number): Promise<void> {
    await deleteSynced('currencyRates', [id]);
  }

  /** Used when the base currency changes and every stored rate loses its meaning. */
  public async clearAll(): Promise<void> {
    // Not `clear()`: a wholesale wipe records nothing, so every other device
    // would merge its own rates straight back in.
    const rows = await db.currencyRates.toArray();
    await deleteSynced(
      'currencyRates',
      rows.map(row => row.id)
    );
  }
}
