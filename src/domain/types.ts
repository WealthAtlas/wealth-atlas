// Domain types for the wealth management app
export interface User {
  id?: string; // Dexie auto-generates if not provided
  username: string;
  email?: string;
  createdAt?: Date; // Optional, Dexie can auto-populate
}

export interface PortfolioItem {
  id?: string;
  userId: string;
  name: string;
  value: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface DashboardData {
  totalValue: number;
  monthlyChange: number;
  portfolioItems: number;
  lastUpdated: Date;
}
