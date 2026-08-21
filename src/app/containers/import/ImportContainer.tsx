import { ImportPage, ImportStep } from '@/app/components/pages/ImportPage';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { ImportPlanReviewView } from '@/app/components/views/ImportPlanReviewView';
import { ImportResultView } from '@/app/components/views/ImportResultView';
import { ImportSourceView } from '@/app/components/views/ImportSourceView';
import { LlmError } from '@/data/llm/LlmClient';
import { ImportPlan } from '@/domain/import/ImportOperation';
import { ImportOperationError } from '@/domain/import/ImportPlanExecutor';
import {
  defaultSelection,
  selectAll,
  selectNone,
  toggleSelection,
  withoutOrphans,
} from '@/domain/import/ImportSelection';
import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { DataImportService } from '@/domain/services/DataImportService';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function ImportContainer() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { currencies } = useCurrency();
  const importService = useMemo(() => new DataImportService(), []);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const [step, setStep] = useState<ImportStep>('source');
  const [fileName, setFileName] = useState<string | undefined>();
  const [sourceText, setSourceText] = useState('');
  const [plan, setPlan] = useState<ImportPlan | undefined>();
  const [selected, setSelected] = useState<boolean[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  const handleFileSelected = useCallback(
    (file: File) => {
      file
        .text()
        .then(text => {
          setFileName(file.name);
          setSourceText(text);
        })
        .catch(error => {
          Logger.error('Could not read the selected file:', error);
          notify('Could not read that file.', 'error');
        });
    },
    [notify]
  );

  const handlePastedTextChange = useCallback((text: string) => {
    setSourceText(text);
    setFileName(undefined);
  }, []);

  const handleAnalyse = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStep('analysing');

    try {
      const built = await importService.buildPlan(
        { text: sourceText, fileName },
        controller.signal,
        currencies
      );
      setPlan(built);
      setSelected(defaultSelection(built.operations));
      setStep('review');
    } catch (error) {
      if (controller.signal.aborted) {
        setStep('source');
        return;
      }
      Logger.error('Import analysis failed:', error);
      notify(
        error instanceof LlmError ? error.message : `Analysis failed: ${String(error)}`,
        'error'
      );
      setStep('source');
    } finally {
      abortRef.current = undefined;
    }
  }, [fileName, importService, notify, sourceText, currencies]);

  const handleCancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    setStep('source');
  }, []);

  const handleToggle = useCallback(
    (index: number) => {
      if (!plan) return;
      setSelected(current => toggleSelection(plan.operations, current, index));
    },
    [plan]
  );

  const handleSelectAll = useCallback(() => {
    if (!plan) return;
    setSelected(selectAll(plan.operations));
  }, [plan]);

  const handleSelectNone = useCallback(() => {
    if (!plan) return;
    setSelected(selectNone(plan.operations));
  }, [plan]);

  const handleSelectVerified = useCallback(() => {
    if (!plan) return;
    setSelected(defaultSelection(plan.operations));
  }, [plan]);

  const handleApply = useCallback(async () => {
    if (!plan) return;

    // Backstop for the create-before-child invariant the toggles maintain: an
    // orphan would abort the whole transaction at apply time.
    const approvable = withoutOrphans(plan.operations, selected);
    const approved = plan.operations
      .filter((_, index) => approvable[index])
      .map(item => item.operation);

    setIsApplying(true);
    try {
      const result = await importService.applyPlan(approved);
      setAppliedCount(result.applied);
      setStep('done');
      notify(`Imported ${result.applied} change${result.applied === 1 ? '' : 's'}.`, 'success');
    } catch (error) {
      Logger.error('Import apply failed:', error);
      const detail =
        error instanceof ImportOperationError
          ? `${error.message} Nothing was saved — untick that item and try again.`
          : `Import failed: ${String(error)} Nothing was saved.`;
      notify(detail, 'error');
    } finally {
      setIsApplying(false);
    }
  }, [importService, notify, plan, selected]);

  const handleReset = useCallback(() => {
    setPlan(undefined);
    setSelected([]);
    setSourceText('');
    setFileName(undefined);
    setAppliedCount(0);
    setStep('source');
  }, []);

  const handleBack = useCallback(() => navigate('/dashboard'), [navigate]);

  return (
    <ImportPage
      step={step}
      providerHost={importService.getProviderHost()}
      onBack={handleBack}
      onCancelAnalysis={handleCancelAnalysis}
    >
      {step === 'source' && (
        <ImportSourceView
          configured={importService.isConfigured()}
          providerHost={importService.getProviderHost()}
          fileName={fileName}
          pastedText={sourceText}
          canAnalyse={sourceText.trim() !== ''}
          onFileSelected={handleFileSelected}
          onPastedTextChange={handlePastedTextChange}
          onAnalyse={handleAnalyse}
          onOpenSettings={() => navigate('/settings')}
        />
      )}

      {step === 'review' && plan && (
        <ImportPlanReviewView
          plan={plan}
          selected={selected}
          isApplying={isApplying}
          onToggle={handleToggle}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onSelectVerified={handleSelectVerified}
          onApply={handleApply}
          onBack={handleReset}
        />
      )}

      {step === 'done' && (
        <ImportResultView
          applied={appliedCount}
          onImportAnother={handleReset}
          onDone={handleBack}
        />
      )}
    </ImportPage>
  );
}
