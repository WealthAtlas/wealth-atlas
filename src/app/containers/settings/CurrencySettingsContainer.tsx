import { useNotification } from '@/app/components/providers/NotificationContext';
import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { CurrencyRateRow, CurrencySettingsView } from '@/app/components/views/CurrencySettingsView';
import { Currency } from '@/domain/entities/shared/Currency';
import { CurrencyRate, ICurrencyRate } from '@/domain/entities/shared/CurrencyRate';
import { CurrencyService } from '@/domain/services/CurrencyService';
import { Logger } from '@/domain/utils/Logger';
import { validateCurrencyRate } from '@/domain/validation/EntityValidators';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ALL_CURRENCIES = Object.values(Currency);

function toRow(code: Currency, stored: CurrencyRate | undefined): CurrencyRateRow {
  const rate = stored?.getPerUnitInBase();
  return {
    code,
    rate: rate !== undefined ? String(rate) : '',
    script: stored?.script ?? '',
    updatedAt: stored?.getUpdatedAt(),
    isDirty: false,
  };
}

export function CurrencySettingsContainer() {
  const { baseCurrency, reload } = useCurrency();
  const { notify } = useNotification();
  const currencyService = useMemo(() => new CurrencyService(), []);

  const [stored, setStored] = useState<CurrencyRate[]>([]);
  const [rows, setRows] = useState<CurrencyRateRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const rates = await currencyService.getRates();
    setStored(rates);
    setRows(
      ALL_CURRENCIES.filter(code => code !== baseCurrency).map(code =>
        toRow(
          code,
          rates.find(rate => rate.code === code)
        )
      )
    );
  }, [currencyService, baseCurrency]);

  useEffect(() => {
    load().catch(error => {
      Logger.error('Failed to load currency rates:', error);
      notify('Could not load exchange rates', 'error');
    });
  }, [load, notify]);

  const updateRow = useCallback((code: Currency, changes: Partial<CurrencyRateRow>) => {
    setRows(current =>
      current.map(row =>
        row.code === code ? { ...row, ...changes, isDirty: true, error: undefined } : row
      )
    );
  }, []);

  const handleRateChange = useCallback(
    (code: Currency, rate: string) => updateRow(code, { rate }),
    [updateRow]
  );

  const handleScriptChange = useCallback(
    (code: Currency, script: string) => updateRow(code, { script }),
    [updateRow]
  );

  const handleSaveRate = useCallback(
    async (code: Currency) => {
      const row = rows.find(candidate => candidate.code === code);
      if (!row) return;

      const trimmedRate = row.rate.trim();
      const parsedRate = trimmedRate === '' ? undefined : Number(trimmedRate);
      if (parsedRate !== undefined && Number.isNaN(parsedRate)) {
        setRows(current =>
          current.map(candidate =>
            candidate.code === code ? { ...candidate, error: 'Enter a number' } : candidate
          )
        );
        return;
      }

      const existing = stored.find(rate => rate.code === code);
      const script = row.script.trim() === '' ? undefined : row.script;
      const candidate: ICurrencyRate = {
        id: existing?.id,
        code,
        manualPerUnitInBase: parsedRate,
        // A hand-entered rate saved now must win over the last script run, which
        // is decided by recency — so stamp it.
        manualUpdatedAt:
          parsedRate !== undefined && parsedRate !== existing?.manualPerUnitInBase
            ? new Date()
            : existing?.manualUpdatedAt,
        script,
        scriptPerUnitInBase: existing?.scriptPerUnitInBase,
        scriptUpdatedAt: existing?.scriptUpdatedAt,
      };

      const issues = validateCurrencyRate(candidate);
      if (issues.length > 0) {
        setRows(current =>
          current.map(item => (item.code === code ? { ...item, error: issues[0].message } : item))
        );
        return;
      }

      setIsSaving(true);
      try {
        await currencyService.saveRate(candidate);
        await load();
        await reload();
        notify(`Saved ${code} rate`, 'success');
      } catch (error) {
        Logger.error(`Failed to save ${code} rate:`, error);
        notify(`Could not save the ${code} rate`, 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [rows, stored, currencyService, load, reload, notify]
  );

  const handleBaseCurrencyChange = useCallback(
    async (currency: Currency) => {
      setIsSaving(true);
      try {
        await currencyService.setBaseCurrency(currency);
        await reload();
        notify(`Base currency is now ${currency}. Re-enter your rates.`, 'info');
      } catch (error) {
        Logger.error('Failed to change base currency:', error);
        notify('Could not change the base currency', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [currencyService, reload, notify]
  );

  return (
    <CurrencySettingsView
      baseCurrency={baseCurrency}
      currencies={ALL_CURRENCIES}
      rates={rows}
      isSaving={isSaving}
      onBaseCurrencyChange={handleBaseCurrencyChange}
      onRateChange={handleRateChange}
      onScriptChange={handleScriptChange}
      onSaveRate={handleSaveRate}
    />
  );
}
