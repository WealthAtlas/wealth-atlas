# Dashboard Feature

## Overview

The Dashboard provides a comprehensive overview of your wealth and asset portfolio with four key analytical components:

## Features

### 1. Total Wealth Calculation

- **Total Wealth**: Asset values minus outstanding loan amounts
- **Total Asset Value**: Current market value of all assets
- **Profit/Loss**: Difference between current value and invested amount
- **Total Invested**: Total capital deployed across all assets

### 2. Monthly Investment Chart

- Bar chart showing investment flow by month
- Displays last 12 months of investment activity
- Helps track investment consistency and patterns

### 3. Asset Category Pie Chart

- Visual breakdown of asset allocation by category
- Shows percentage distribution of wealth across different asset types
- Helps with portfolio diversification analysis

### 4. Timeline Graph

- Line chart comparing cumulative invested amount vs. asset value over time
- Shows investment performance trajectory
- Helps visualize wealth growth patterns

## Data Sources

- **Assets**: Pulls from AssetService for all asset data and valuations
- **Loans**: Pulls from LoanService for outstanding loan amounts
- **Calculations**: Uses existing business logic from Asset and Loan entities

## Components

### Services

- `DashboardService`: Main service for aggregating dashboard data
- Provides methods for metrics, monthly data, category data, and timeline data

### UI Components

- `DashboardPage`: Main UI component with responsive charts
- `DashboardContainer`: Container component handling state management
- Uses Material-UI for styling and @mui/x-charts for visualizations

### Error Handling

- Graceful fallbacks for failed calculations
- Robust error handling for asset/loan value computations
- Loading states and refresh functionality

## Technical Features

- Responsive design for mobile and desktop
- Real-time data refresh capability
- Robust error handling with fallback values
- Performance optimized with React.useCallback and useMemo
- TypeScript for type safety

## Usage

The dashboard is automatically available in the main navigation and updates whenever underlying asset or loan data changes.
