'use client';

import { 
    Card, 
    Typography, 
    TableContainer, 
    Table, 
    TableHead, 
    TableRow, 
    TableCell, 
    TableBody,
    Chip,
    Box
} from '@mui/material';

interface ChartDataItem {
    name: string;
    month: string;
    year: string;
    amount: number;
    currency: string;
    date?: Date;
}

interface AggregatedExpense {
    __typename?: string;
    month: string;
    year: string;
    currency: string;
    totalAmount: number;
}

// Date/time utility for formatting
const formatMonth = (month: string): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1];
};

interface ExpenseListProps {
    chartData: ChartDataItem[];
    aggregatedData: { aggregatedExpenses?: readonly AggregatedExpense[] | null };
    handleViewMonthDetails: (month: string, year: string) => void;
    selectedMonth: { month: string; year: string } | null;
}

const ExpenseList = ({ 
    aggregatedData, 
    handleViewMonthDetails, 
    selectedMonth
}: ExpenseListProps) => {
    const expenses = aggregatedData?.aggregatedExpenses || [];
    
    return (
        <Card sx={{ p: 2, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Monthly Expense Summary</Typography>
            
            {expenses.length === 0 ? (
                <Typography sx={{ textAlign: 'center', p: 4 }}>
                    No data available for the selected filters
                </Typography>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Period</TableCell>
                                <TableCell align="right">Total Amount</TableCell>
                                <TableCell>Currency</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {[...expenses]
                                .sort((a, b) => {
                                    // Sort by date, most recent first
                                    const dateA = new Date(parseInt(a.year), parseInt(a.month) - 1);
                                    const dateB = new Date(parseInt(b.year), parseInt(b.month) - 1);
                                    return dateB.getTime() - dateA.getTime();
                                })
                                .map((expense: AggregatedExpense) => (
                                    <TableRow 
                                        key={`${expense.month}-${expense.year}-${expense.currency}`}
                                        hover
                                        sx={{
                                            backgroundColor: 
                                                expense.month === selectedMonth?.month && expense.year === selectedMonth?.year
                                                    ? 'rgba(130, 202, 157, 0.1)'
                                                    : 'inherit',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleViewMonthDetails(expense.month, expense.year)}
                                    >
                                        <TableCell>{`${formatMonth(expense.month)} ${expense.year}`}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                            {expense.totalAmount.toFixed(2)}
                                        </TableCell>
                                        <TableCell>{expense.currency}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label="View Details" 
                                                size="small" 
                                                color="primary" 
                                                variant="outlined"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewMonthDetails(expense.month, expense.year);
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Card>
    );
};

export default ExpenseList;
