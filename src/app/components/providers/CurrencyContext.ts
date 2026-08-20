import { Currency } from '@/domain/entities/shared/Currency';
import { CurrencyConverter } from '@/domain/entities/shared/CurrencyConverter';
import { createContext, useContext } from 'react';

export interface CurrencyContextValue {
  /** Base currency every cross-entity total is reported in. */
  baseCurrency: Currency;
  /** Translates a single entity's amount into any other currency. */
  converter: CurrencyConverter;
  /** The codes the user has configured; what every currency picker offers. */
  currencies: Currency[];
  /** Re-reads the base currency and rates; call after editing them in Settings. */
  reload: () => Promise<void>;
}

export const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

/**
 * Every total that spans more than one entity is reported in the base currency,
 * so views reach for this rather than an entity's own `currency` field. An
 * entity shown on its own — one asset card, one expense row — keeps its native
 * currency.
 */
export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
