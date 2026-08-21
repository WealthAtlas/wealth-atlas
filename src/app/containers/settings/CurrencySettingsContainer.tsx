import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { useNotification } from '@/app/components/providers/NotificationContext';
import { CurrencySettingsView } from '@/app/components/views/CurrencySettingsView';
import { Currency } from '@/domain/entities/shared/Currency';
import {
  parseCurrencyConfig,
  serializeCurrencyConfig,
} from '@/domain/entities/shared/CurrencyConfig';
import { CurrencyService } from '@/domain/services/CurrencyService';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function CurrencySettingsContainer() {
  const { baseCurrency, currencies, reload } = useCurrency();
  const { notify } = useNotification();
  const currencyService = useMemo(() => new CurrencyService(), []);

  const [stored, setStored] = useState('');
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // What the editor was last handed, readable without making `load` depend on it
  // — the effect below re-runs whenever the currency context reloads, which now
  // includes a sync pull landing mid-session.
  const storedRef = useRef('');

  const load = useCallback(async () => {
    const rates = await currencyService.getRates();
    const text = serializeCurrencyConfig(currencies, rates, baseCurrency);
    // Adopted into the editor only when there is nothing to lose. A pull can
    // arrive while the user is halfway through typing a rate, and silently
    // replacing the text under the cursor is worse than showing it stale.
    setDraft(current => (current === storedRef.current ? text : current));
    storedRef.current = text;
    setStored(text);
  }, [currencyService, currencies, baseCurrency]);

  useEffect(() => {
    load().catch(error => {
      Logger.error('Failed to load currency settings:', error);
      notify('Could not load currency settings', 'error');
    });
  }, [load, notify]);

  // Parsed on every keystroke so problems are visible before saving, rather
  // than only after the user commits.
  const parsed = useMemo(() => parseCurrencyConfig(draft, baseCurrency), [draft, baseCurrency]);
  const isDirty = draft !== stored;

  const handleSaveConfig = useCallback(async () => {
    if (!parsed.config) return;

    setIsSaving(true);
    try {
      await currencyService.saveConfig(parsed.config);
      await reload();
      notify('Currencies and rates saved', 'success');
    } catch (error) {
      Logger.error('Failed to save currency settings:', error);
      notify('Could not save currencies and rates', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [parsed.config, currencyService, reload, notify]);

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
      currencies={currencies}
      config={draft}
      configIssues={isDirty ? parsed.issues : []}
      isDirty={isDirty}
      isSaving={isSaving}
      onBaseCurrencyChange={handleBaseCurrencyChange}
      onConfigChange={setDraft}
      onSaveConfig={handleSaveConfig}
      onRevertConfig={() => setDraft(stored)}
    />
  );
}
