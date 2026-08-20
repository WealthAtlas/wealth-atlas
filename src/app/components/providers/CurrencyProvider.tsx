import { Currency, DEFAULT_CURRENCIES } from '@/domain/entities/shared/Currency';
import { CurrencyConverter } from '@/domain/entities/shared/CurrencyConverter';
import { DEFAULT_BASE_CURRENCY } from '@/domain/entities/shared/Settings';
import { CurrencyService } from '@/domain/services/CurrencyService';
import { Logger } from '@/domain/utils/Logger';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CurrencyContext } from './CurrencyContext';
import { useNotification } from './NotificationContext';

/**
 * Holds the converter for the lifetime of the app.
 *
 * Loads in two passes: the stored rates first, which is a local read and lets
 * the app paint, then any rate script that has gone stale, which can reach the
 * network. Children render only once the first pass is done — a converter with
 * no rates yet would briefly report every foreign holding as 0.
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotification();
  const [state, setState] = useState<
    { converter: CurrencyConverter; currencies: Currency[] } | undefined
  >();

  const load = useCallback(async (): Promise<void> => {
    setState(await new CurrencyService().getCurrencyState({ skipRateUpdate: true }));
  }, []);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    const initialise = async () => {
      await load();
      // Refreshing rates can fire a network call per currency, so it happens
      // after the first paint rather than blocking it.
      await new CurrencyService().updateRates();
      if (!cancelled) await load();
    };

    initialise().catch(error => {
      Logger.error('Failed to load currency settings:', error);
      notify('Could not load currency settings; totals may be incomplete', 'error');
      // Falling back to an empty converter keeps the app usable: unconvertible
      // holdings read as zero and every total says so, which beats a blank
      // screen with no way to reach Settings and fix it.
      setState(
        current =>
          current ?? {
            converter: new CurrencyConverter(DEFAULT_BASE_CURRENCY, new Map()),
            currencies: [...DEFAULT_CURRENCIES],
          }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [load, notify]);

  const value = useMemo(
    () =>
      state
        ? {
            converter: state.converter,
            currencies: state.currencies,
            baseCurrency: state.converter.getBaseCurrency(),
            reload,
          }
        : undefined,
    [state, reload]
  );

  if (!value) return null;

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
