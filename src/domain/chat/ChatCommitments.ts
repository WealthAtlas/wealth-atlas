import { Payment } from '../entities/loans/Payment';
import { addUtcMonths, isoDate } from '../utils/DateUtils';
import { ChatToolContext } from './ChatToolContext';

/**
 * Money already committed over a coming window: scheduled SIP instalments and
 * loan EMI payments, from the same `getPendingOccurrences` projection the SIP
 * and EMI pages use.
 *
 * Shared by the `getUpcomingCommitments` tool and by the always-on snapshot.
 * The snapshot needs it because a model asked "how much should I invest" tends
 * to reason about spare cash without checking what is already spoken for — one
 * local model asserted there were no commitments while citing a tool it had
 * never called. Putting the figure in front of it every turn removes the need
 * for it to remember the lookup.
 */

export interface CommittedInstalment {
  date: string;
  amount: number;
  amountInBase: number;
  /** Asset name for a SIP, loan name for an EMI. */
  towards: string;
}

export interface UpcomingCommitments {
  from: string;
  to: string;
  months: number;
  totalSipCommitment: number;
  totalEmiCommitment: number;
  totalCommitment: number;
  sipInstalments: CommittedInstalment[];
  emiPayments: CommittedInstalment[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function computeUpcomingCommitments(
  ctx: ChatToolContext,
  months: number
): Promise<UpcomingCommitments> {
  const till = addUtcMonths(ctx.today, months);

  const [assets, loans] = await Promise.all([ctx.assets(), ctx.loans()]);

  const sipInstalments: CommittedInstalment[] = [];

  for (const asset of assets) {
    if (asset.id === undefined) continue;
    for (const sip of await ctx.sipsOf(asset.id)) {
      for (const occurrence of sip.getPendingOccurrences(till)) {
        sipInstalments.push({
          date: isoDate(occurrence.date),
          amount: occurrence.totalAmount,
          amountInBase: round(ctx.converter.toBase(occurrence.totalAmount, asset.currency)),
          towards: asset.name,
        });
      }
    }
  }

  const emiPayments: CommittedInstalment[] = loans.flatMap(loan =>
    loan.emis.flatMap(emi =>
      emi.getPendingOccurrences(till).map((occurrence: Payment) => ({
        date: isoDate(occurrence.date),
        amount: occurrence.amount,
        amountInBase: round(ctx.converter.toBase(occurrence.amount, loan.currency)),
        towards: loan.name,
      }))
    )
  );

  const total = (instalments: CommittedInstalment[]): number =>
    instalments.reduce((sum, instalment) => sum + instalment.amountInBase, 0);

  return {
    from: isoDate(ctx.today),
    to: isoDate(till),
    months,
    totalSipCommitment: round(total(sipInstalments)),
    totalEmiCommitment: round(total(emiPayments)),
    totalCommitment: round(total(sipInstalments) + total(emiPayments)),
    sipInstalments,
    emiPayments,
  };
}
