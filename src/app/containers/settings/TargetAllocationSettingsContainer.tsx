import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { useNotification } from '@/app/components/providers/NotificationContext';
import {
  TargetAllocationRow,
  TargetAllocationSettingsView,
} from '@/app/components/views/TargetAllocationSettingsView';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { ICategoryTarget } from '@/domain/entities/shared/Settings';
import { AllocationDrift, DriftRow } from '@/domain/market/AllocationDrift';
import { AllocationPolicyService } from '@/domain/services/AllocationPolicyService';
import { Logger } from '@/domain/utils/Logger';
import { validateTargetAllocation } from '@/domain/validation/EntityValidators';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** One draft row per category, so a category is left out by clearing its field. */
type Draft = Record<string, { targetPercent: string; bandPercent: string }>;

function emptyDraft(): Draft {
  return Object.fromEntries(
    Object.values(AssetCategory).map(category => [category, { targetPercent: '', bandPercent: '' }])
  );
}

function toDraft(targets: ICategoryTarget[]): Draft {
  const draft = emptyDraft();
  targets.forEach(target => {
    draft[target.category] = {
      // A 0% target is deliberate and must survive the round trip, so this
      // checks for undefined rather than falsiness.
      targetPercent: String(target.targetPercent),
      bandPercent: target.bandPercent === undefined ? '' : String(target.bandPercent),
    };
  });
  return draft;
}

/** Empty target means "not part of the policy"; a blank band means "use the default". */
function toTargets(draft: Draft): ICategoryTarget[] {
  return Object.entries(draft)
    .filter(([, fields]) => fields.targetPercent.trim() !== '')
    .map(([category, fields]) => {
      const band = Number(fields.bandPercent);
      return {
        category,
        targetPercent: Number(fields.targetPercent),
        ...(fields.bandPercent.trim() === '' || !Number.isFinite(band)
          ? {}
          : { bandPercent: band }),
      };
    });
}

export function TargetAllocationSettingsContainer() {
  const { converter, baseCurrency } = useCurrency();
  const { notify } = useNotification();
  const service = useMemo(() => new AllocationPolicyService(), []);

  const [stored, setStored] = useState<Draft>(emptyDraft);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [drift, setDrift] = useState<AllocationDrift | undefined>();
  const [hasSavedPolicy, setHasSavedPolicy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Both held in refs so `load` does not depend on them: a dependency on the
  // draft would rebuild `load` on every keystroke, and the effect below would
  // then refetch as the user types.
  const storedRef = useRef<Draft>(emptyDraft());
  const draftRef = useRef<Draft>(draft);
  draftRef.current = draft;

  const load = useCallback(async () => {
    const targets = await service.getTargetAllocation();
    const next = toDraft(targets);

    // Adopted into the editor only when there is nothing to lose. A sync pull
    // can land while the user is halfway through typing a percentage, and
    // replacing the field under the cursor is worse than showing it stale.
    const isClean = JSON.stringify(draftRef.current) === JSON.stringify(storedRef.current);
    if (isClean) setDraft(next);

    storedRef.current = next;
    setStored(next);
    setHasSavedPolicy(targets.length > 0);
    setDrift(await service.getDrift(converter));
  }, [service, converter]);

  useEffect(() => {
    load().catch(error => {
      Logger.error('Failed to load target allocation:', error);
      notify('Could not load the target allocation', 'error');
    });
  }, [load, notify]);

  useDatabaseReplaced(() => {
    load().catch(error => Logger.error('Failed to reload target allocation:', error));
  });

  const targets = useMemo(() => toTargets(draft), [draft]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(stored);

  // Validated on every keystroke so an over-100 total is visible before saving
  // rather than only after the write is refused.
  const issues = useMemo(
    () => (isDirty ? validateTargetAllocation(targets).map(issue => issue.message) : []),
    [isDirty, targets]
  );

  const totalPercent = useMemo(
    () =>
      Math.round(
        targets.reduce(
          (sum, target) => sum + (Number.isFinite(target.targetPercent) ? target.targetPercent : 0),
          0
        ) * 100
      ) / 100,
    [targets]
  );

  const driftByCategory = useMemo(() => {
    const map = new Map<string, DriftRow>();
    drift?.rows.forEach(row => map.set(row.category, row));
    return map;
  }, [drift]);

  const actualByCategory = useMemo(() => {
    const map = new Map<string, number>();
    drift?.rows.forEach(row => map.set(row.category, row.actualPercent));
    drift?.untargeted.forEach(row => map.set(row.category, row.actualPercent));
    return map;
  }, [drift]);

  const rows: TargetAllocationRow[] = useMemo(
    () =>
      Object.values(AssetCategory).map(category => ({
        category,
        targetPercent: draft[category]?.targetPercent ?? '',
        bandPercent: draft[category]?.bandPercent ?? '',
        actualPercent: actualByCategory.get(category),
        drift: driftByCategory.get(category),
      })),
    [draft, actualByCategory, driftByCategory]
  );

  const onChange = useCallback(
    (category: string, field: 'targetPercent' | 'bandPercent', value: string) => {
      setDraft(current => ({
        ...current,
        [category]: { ...current[category], [field]: value },
      }));
    },
    []
  );

  const onSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await service.saveTargetAllocation(targets);
      await load();
      notify('Target allocation saved', 'success');
    } catch (error) {
      Logger.error('Failed to save target allocation:', error);
      notify(error instanceof Error ? error.message : 'Could not save the allocation', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [service, targets, load, notify]);

  return (
    <TargetAllocationSettingsView
      rows={rows}
      totalPercent={totalPercent}
      issues={issues}
      isDirty={isDirty}
      isSaving={isSaving}
      hasSavedPolicy={hasSavedPolicy}
      currency={baseCurrency}
      onChange={onChange}
      onSave={onSave}
      onRevert={() => setDraft(stored)}
    />
  );
}
