import { AssetCategory } from '../entities/assets/AssetCategory';
import { InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { ExpenseCategory } from '../entities/expenses/ExpenseCategory';
import { Currency, DEFAULT_CURRENCIES } from '../entities/shared/Currency';
import { ImportContext, PendingAsset, toPromptContext } from './ImportContextBuilder';

/**
 * The allowed values are read from the real enums at runtime, so the prompt can
 * never drift from the code. Adding a new AssetCategory automatically teaches
 * the model about it.
 */
function list(values: readonly string[]): string {
  return values.map(value => `"${value}"`).join(', ');
}

/**
 * `currencies` is the list the user has configured, so the model is told about
 * a currency they added rather than a fixed three.
 */
export function buildSystemPrompt(currencies: Currency[] = DEFAULT_CURRENCIES): string {
  return `You convert personal-finance statement files into a list of database operations for a wealth tracking app.

Return ONLY a JSON object of this shape:
{
  "sourceSummary": "<one sentence describing what this file is>",
  "operations": [ ... ]
}

## Operation types

{"op":"createAsset","ref":"<your-placeholder-id>","name":str,"category":<AssetCategory>,"currency":<Currency>,"valueModel":<ValueModel>,"description":str?,"interestRate":num?,"maturityDate":"YYYY-MM-DD"?,"maturityAmount":num?,"manualValue":num?}
{"op":"updateAsset","assetId":num,"changes":{"name"?,"description"?,"category"?,"manualValue"?,"interestRate"?,"maturityDate":"YYYY-MM-DD"?,"maturityAmount"?}}
{"op":"deleteAsset","assetId":num}
{"op":"addTransaction","assetId":num | "assetRef":str,"type":<InvestmentType>,"quantity":num?,"totalAmount":num?,"unitPrice":num?,"date":"YYYY-MM-DD"}
{"op":"addExpense","amount":num,"currency":<Currency>,"date":"YYYY-MM-DD","category":<ExpenseCategory>,"isEssential":bool,"description":str}
{"op":"createLoan","ref":str,"name":str,"principalAmount":num,"currency":<Currency>,"startDate":"YYYY-MM-DD","description":str?}
{"op":"addLoanPayment","loanId":num | "loanRef":str,"date":"YYYY-MM-DD","amount":num,"description":str?}

These are the only operations that exist. There is no way to edit or delete an individual transaction, expense or loan payment — you are never shown their ids, so never invent one.

## Allowed values

AssetCategory: ${list(Object.values(AssetCategory))}
ValueModel: ${list(Object.values(ValueModel))}
InvestmentType: ${list(Object.values(InvestmentType))}
ExpenseCategory: ${list(Object.values(ExpenseCategory))}
Currency: ${list(currencies)}

## Rules

1. NEVER invent a number, and NEVER do arithmetic. Every number you report must be copied from a cell in the source file, character for character. If a value is not in the file, omit the field or skip the row. Numbers that cannot be traced back to the file are flagged for the user and default to unticked.
2. Trade value: if the file has a net/total/consideration column, copy it into "totalAmount". If it only gives a PER-UNIT price, copy that into "unitPrice" and the quantity into "quantity", and omit "totalAmount" — the app multiplies them. Do not multiply them yourself: your product would not appear anywhere in the file and would be flagged as unverified.
3. Sells are reported with "type":"sell" and a POSITIVE totalAmount and quantity. The app subtracts them. Never use negative numbers to indicate a sale.
4. Match rows to the existing assets listed below whenever the instrument is clearly the same (ticker, ISIN, or fund name). Use that asset's numeric "id" as "assetId". Only emit "createAsset" for instruments that are genuinely absent, and link their trades with "assetRef" matching the "ref" you gave. If the instrument appears under "assetsBeingCreatedByThisImport" it is already being created by an earlier part of this file — link to it with its listed "ref" and do NOT create it again.
5. Currency is always an ISO code from the list above, never a symbol.
6. Dates are always "YYYY-MM-DD". Infer the file's date format from context (DD-MM-YYYY is common in Indian statements, MM/DD/YYYY in US ones) and convert consistently.
7. Use "valueModel":"MARKET_BASED" for stocks, funds, ETFs, crypto and gold; "FIXED_INCOME" for deposits and bonds with a known rate (set interestRate); "MATURITY_BASED" only when the file states a maturity date and maturity value.
8. For expenses, set "isEssential" true for rent, utilities, groceries, insurance, health, transport and tax; false for dining out, entertainment, travel and gifts.
9. A holdings snapshot (current quantity and value, no trade dates) should update the asset's "manualValue" — do NOT invent purchase transactions for it. A tradebook (dated rows) should produce "addTransaction" operations.
10. Emit no operation at all for rows you cannot interpret confidently. A short, correct list beats a long, speculative one.
11. Only emit "deleteAsset" when the file makes it explicit that the holding was closed out or removed. Never delete to "tidy up".`;
}

export function buildUserPrompt(args: {
  context: ImportContext;
  sourceText: string;
  fileName?: string;
  pendingAssets?: PendingAsset[];
  partNumber?: number;
  partCount?: number;
  hasHeader?: boolean;
}): string {
  const parts: string[] = [];

  parts.push('## Existing data in the app\n');
  parts.push(toPromptContext(args.context, args.pendingAssets));

  if (args.fileName) {
    parts.push(`\n## File name\n\n${args.fileName}`);
  }

  if (args.partCount && args.partCount > 1) {
    parts.push(
      `\n## Note\n\nThis is part ${args.partNumber} of ${args.partCount} of a large file. ` +
        (args.hasHeader ? 'The header row is repeated in each part. ' : '') +
        'Only report operations for the rows shown here.'
    );
  }

  parts.push(`\n## File contents\n\n${args.sourceText}`);

  return parts.join('\n');
}
