import { describe, expect, it } from 'vitest';
import { Currency } from '../entities/shared/Currency';
import { computeUpcomingCommitments } from './ChatCommitments';
import { asset, converter, fakeContext, loan, sip, USD_RATE } from './ChatFixtures';

describe('computeUpcomingCommitments', () => {
  it('reports nothing committed when there are no schedules', async () => {
    const commitments = await computeUpcomingCommitments(fakeContext(), 1);

    expect(commitments.totalCommitment).toBe(0);
    expect(commitments.sipInstalments).toEqual([]);
    expect(commitments.emiPayments).toEqual([]);
  });

  it('totals SIP instalments and EMI payments separately and together', async () => {
    const commitments = await computeUpcomingCommitments(
      fakeContext({
        assets: [asset({ id: 1, name: 'Nifty Index Fund' })],
        sipsByAsset: { 1: [sip({ price: 5000 })] },
        loans: [loan({ name: 'Home Loan', emiAmount: 25000 })],
      }),
      1
    );

    expect(commitments.totalSipCommitment).toBe(5000);
    expect(commitments.totalEmiCommitment).toBe(25000);
    expect(commitments.totalCommitment).toBe(30000);
  });

  it('names what each instalment goes towards', async () => {
    const commitments = await computeUpcomingCommitments(
      fakeContext({
        assets: [asset({ id: 1, name: 'Nifty Index Fund' })],
        sipsByAsset: { 1: [sip()] },
        loans: [loan({ name: 'Home Loan' })],
      }),
      1
    );

    expect(commitments.sipInstalments[0].towards).toBe('Nifty Index Fund');
    expect(commitments.emiPayments[0].towards).toBe('Home Loan');
  });

  it('picks up more instalments over a longer window', async () => {
    const context = () =>
      fakeContext({
        assets: [asset({ id: 1 })],
        sipsByAsset: { 1: [sip({ price: 5000 })] },
      });

    const oneMonth = await computeUpcomingCommitments(context(), 1);
    const sixMonths = await computeUpcomingCommitments(context(), 6);

    expect(sixMonths.sipInstalments.length).toBeGreaterThan(oneMonth.sipInstalments.length);
    expect(sixMonths.totalSipCommitment).toBeGreaterThan(oneMonth.totalSipCommitment);
  });

  it('converts a foreign-currency commitment into the base currency', async () => {
    const commitments = await computeUpcomingCommitments(
      fakeContext({
        assets: [asset({ id: 1, currency: Currency.USD })],
        sipsByAsset: { 1: [sip({ price: 100 })] },
        converter: converter({ [Currency.USD]: USD_RATE }),
      }),
      1
    );

    expect(commitments.sipInstalments[0].amount).toBe(100);
    expect(commitments.sipInstalments[0].amountInBase).toBe(100 * USD_RATE);
  });

  it('reports the window it covered', async () => {
    const commitments = await computeUpcomingCommitments(fakeContext(), 2);

    expect(commitments.from).toBe('2026-08-20');
    expect(commitments.to).toBe('2026-10-20');
    expect(commitments.months).toBe(2);
  });
});
