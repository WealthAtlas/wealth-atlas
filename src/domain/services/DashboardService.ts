import { AssetService } from './AssetService';
import { ExpenseService } from './ExpenseService';
import { LoanService } from './LoanService';

export class DashboardService {
  private readonly assetService: AssetService;
  private readonly expenseService: ExpenseService;
  private readonly loanService: LoanService;

  constructor() {
    this.assetService = new AssetService();
    this.expenseService = new ExpenseService();
    this.loanService = new LoanService();
  }
}
