import { AssetCategory } from '../entities/assets/AssetCategory';
import { InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { ExpenseCategory } from '../entities/expenses/ExpenseCategory';
import { Currency } from '../entities/shared/Currency';
import { ImportContext, toPromptContext } from './ImportContextBuilder';

/**
 * The allowed values are read from the real enums at runtime, so the prompt can
 * never drift from the code. Adding a new AssetCategory automatically teaches
 * the model about it.
 */
function list(values: readonly string[]): string {
  return values.map(value => `"${value}"`).join(', ');
}

export function buildSystemPrompt(): string {
  return `You convert personal-finance statement files into a list of database operations for a wealth tracking app.

Return ONLY a JSON object of this shape:
{
  "sourceSummary": "<one sentence describing what this file is>",
  "operations": [ ... ]
}

## Operation types

{"op":"createAsset","ref":"<your-placeholder-id>","name":str,"category":<AssetCategory>,"currency":<Currency>,"valueModel":<ValueModel>,"description":str?,"interestRate":num?,"maturityDate":"YYYY-MM-DD"?,"maturityAmount":num?,"manualValue":num?}
{"op":"updateAsset","assetId":num,"changes":{"name"?,"description"?,"category"?,"manualValue"?,"interestRate"?,"maturityDate"?,"maturityAmount"?}}
{"op":"deleteAsset","assetId":num}
{"op":"addTransaction","assetId":num | "assetRef":str,"type":<InvestmentType>,"quantity":num?,"totalAmount":num,"date":"YYYY-MM-DD"}
{"op":"deleteTransaction","investmentId":num}
{"op":"addExpense","amount":num,"currency":<Currency>,"date":"YYYY-MM-DD","category":<ExpenseCategory>,"isEssential":bool,"description":str}
{"op":"updateExpense","expenseId":num,"changes":{...}}
{"op":"deleteExpense","expenseId":num}
{"op":"createLoan","ref":str,"name":str,"principalAmount":num,"currency":<Currency>,"startDate":"YYYY-MM-DD","description":str?}
{"op":"addLoanPayment","loanId":num | "loanRef":str,"date":"YYYY-MM-DD","amount":num,"description":str?}
{"op":"deleteLoanPayment","paymentId":num}

## Allowed values

AssetCategory: ${list(Object.values(AssetCategory))}
ValueModel: ${list(Object.values(ValueModel))}
InvestmentType: ${list(Object.values(InvestmentType))}
ExpenseCategory: ${list(Object.values(ExpenseCategory))}
Currency: ${list(Object.values(Currency))}

## Rules

1. NEVER invent a number. Every amount and quantity must appear in the source file. If a value is not in the file, omit the field or skip the row. Numbers you make up will be rejected.
2. "totalAmount" is the TOTAL value of the trade, not the per-unit price. If the file gives a unit price and a quantity, multiply them and report the product. If it gives a net/total amount column, use that.
3. Sells are reported with "type":"sell" and a POSITIVE totalAmount and quantity. The app subtracts them. Never use negative numbers to indicate a sale.
4. Match rows to the existing assets listed below whenever the instrument is clearly the same (ticker, ISIN, or fund name). Use that asset's numeric "id" as "assetId". Only emit "createAsset" for instruments that are genuinely absent, and link their trades with "assetRef" matching the "ref" you gave.
5. Currency is always an ISO code from the list above, never a symbol.
6. Dates are always "YYYY-MM-DD". Infer the file's date format from context (DD-MM-YYYY is common in Indian statements, MM/DD/YYYY in US ones) and convert consistently.
7. Use "valueModel":"MARKET_BASED" for stocks, funds, ETFs, crypto and gold; "FIXED_INCOME" for deposits and bonds with a known rate (set interestRate); "MATURITY_BASED" only when the file states a maturity date and maturity value.
8. For expenses, set "isEssential" true for rent, utilities, groceries, insurance, health, transport and tax; false for dining out, entertainment, travel and gifts.
9. A holdings snapshot (current quantity and value, no trade dates) should update the asset's "manualValue" — do NOT invent purchase transactions for it. A tradebook (dated rows) should produce "addTransaction" operations.
10. Emit no operation at all for rows you cannot interpret confidently. A short, correct list beats a long, speculative one.
11. Only emit a delete operation when the file makes it explicit that something was removed. Do not delete to "tidy up".`;
}

export function buildUserPrompt(args: {
  context: ImportContext;
  sourceText: string;
  fileName?: string;
  chunkIndex?: number;
  chunkCount?: number;
}): string {
  const parts: string[] = [];

  parts.push('## Existing data in the app\n');
  parts.push(toPromptContext(args.context));

  if (args.fileName) {
    parts.push(`\n## File name\n\n${args.fileName}`);
  }

  if (args.chunkCount && args.chunkCount > 1) {
    parts.push(
      `\n## Note\n\nThis is part ${args.chunkIndex! + 1} of ${args.chunkCount} of a large file. ` +
        'The header row is repeated in each part. Only report operations for the rows shown here.'
    );
  }

  parts.push(`\n## File contents\n\n${args.sourceText}`);

  return parts.join('\n');
}
