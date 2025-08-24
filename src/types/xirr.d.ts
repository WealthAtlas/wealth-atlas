declare module 'xirr' {
  export interface XirrCashFlow {
    amount: number;
    when: Date;
  }
  export function xirr(cashflows: XirrCashFlow[], guess?: number): number;
}
