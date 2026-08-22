import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { DecisionDraft, DecisionJournalPage } from '@/app/components/pages/DecisionJournalPage';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import {
  DecisionAction,
  DecisionStatus,
  IDecisionEvidence,
} from '@/domain/entities/journal/DecisionEntry';
import { AllocationPolicyService } from '@/domain/services/AllocationPolicyService';
import {
  DecisionJournalService,
  JournalEntryWithReview,
} from '@/domain/services/DecisionJournalService';
import { JournalSummary, summariseJournal } from '@/domain/journal/DecisionReview';
import { Logger } from '@/domain/utils/Logger';
import { validateDecisionEntry } from '@/domain/validation/EntityValidators';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const EMPTY_DRAFT: DecisionDraft = {
  category: AssetCategory.INDEX_FUND,
  action: 'buy',
  status: 'acted',
  amount: '',
  rationale: '',
};

export function DecisionJournalContainer() {
  const navigate = useNavigate();
  const { converter, baseCurrency } = useCurrency();
  const { notify } = useNotification();

  const journalService = useMemo(() => new DecisionJournalService(), []);
  const policyService = useMemo(() => new AllocationPolicyService(), []);

  const [entries, setEntries] = useState<JournalEntryWithReview[]>([]);
  const [summary, setSummary] = useState<JournalSummary>(() => summariseJournal([]));
  const [draft, setDraft] = useState<DecisionDraft>(EMPTY_DRAFT);
  const [evidence, setEvidence] = useState<IDecisionEvidence>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const reviewed = await journalService.review();
    setEntries(reviewed.entries);
    setSummary(reviewed.summary);
    setIsLoading(false);
  }, [journalService]);

  useEffect(() => {
    load().catch(error => {
      Logger.error('Failed to load the decision journal:', error);
      notify('Could not load the journal', 'error');
      setIsLoading(false);
    });
  }, [load, notify]);

  // The journal is read-only here, so a sync pull can be adopted outright — the
  // draft is separate state and is not touched.
  useDatabaseReplaced(() => {
    load().catch(error => Logger.error('Failed to reload the decision journal:', error));
  });

  /**
   * Gathers the figures for the chosen category, so an entry freezes what was on
   * screen rather than a recollection of it. Read from the same services the
   * pages and the assistant use, so there is no second implementation to drift.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const drift = await policyService.getDrift(converter);
      const row = drift?.rows.find(candidate => candidate.category === draft.category);
      if (cancelled) return;

      setEvidence(
        DecisionJournalService.evidenceFrom({
          targetPercent: row?.targetPercent,
          actualPercent: row?.actualPercent,
          driftPercent: row?.driftPercent,
        })
      );
    })().catch(error => Logger.error('Failed to gather decision evidence:', error));

    return () => {
      cancelled = true;
    };
  }, [policyService, converter, draft.category]);

  const evidencePreview = useMemo(() => {
    const lines: string[] = [];
    if (evidence.targetPercent !== undefined) {
      lines.push(
        `Target ${evidence.targetPercent}%, currently holding ${evidence.actualPercent}% ` +
          `(${evidence.driftPercent! > 0 ? '+' : ''}${evidence.driftPercent}pt)`
      );
    } else {
      lines.push('No target is set for this category, so no drift will be recorded.');
    }
    return lines;
  }, [evidence]);

  const candidate = useMemo(() => {
    const amount = Number(draft.amount);
    return {
      id: undefined,
      createdAt: new Date(),
      category: draft.category,
      action: draft.action as DecisionAction,
      status: draft.status as DecisionStatus,
      amount: draft.amount.trim() === '' || !Number.isFinite(amount) ? undefined : amount,
      currency: baseCurrency,
      rationale: draft.rationale,
      evidence,
      reviewedAt: undefined,
      reviewNote: undefined,
    };
  }, [draft, baseCurrency, evidence]);

  // Validated as the user types, so a missing amount is visible before saving.
  const draftIssues = useMemo(
    () =>
      draft.rationale.trim() === ''
        ? []
        : validateDecisionEntry(candidate).map(issue => issue.message),
    [candidate, draft.rationale]
  );

  const onRecord = useCallback(async () => {
    setIsSaving(true);
    try {
      await journalService.record(candidate);
      setDraft({ ...EMPTY_DRAFT, category: draft.category });
      await load();
      notify('Decision recorded', 'success');
    } catch (error) {
      Logger.error('Failed to record the decision:', error);
      notify(error instanceof Error ? error.message : 'Could not record the decision', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [journalService, candidate, draft.category, load, notify]);

  const onDelete = useCallback(
    async (id: number) => {
      try {
        await journalService.delete(id);
        await load();
        notify('Entry deleted', 'success');
      } catch (error) {
        Logger.error('Failed to delete the journal entry:', error);
        notify('Could not delete the entry', 'error');
      }
    },
    [journalService, load, notify]
  );

  return (
    <DecisionJournalPage
      entries={entries}
      summary={summary}
      categories={Object.values(AssetCategory)}
      draft={draft}
      draftIssues={draftIssues}
      isSaving={isSaving}
      isLoading={isLoading}
      currency={baseCurrency}
      evidencePreview={evidencePreview}
      onDraftChange={(field, value) => setDraft(current => ({ ...current, [field]: value }))}
      onRecord={onRecord}
      onDelete={onDelete}
      onBack={() => navigate('/dashboard')}
    />
  );
}
