'use client';

import { Box, Typography, Card, Grid } from '@mui/material';

interface AggregatedExpense {
    __typename?: string;
    month: string;
    year: string;
    currency: string;
    totalAmount: number;
}

interface ChartDataItem {
    name: string;
    month: string;
    year: string;
    amount: number;
    currency: string;
    date?: Date;
}

interface ExpenseHeaderProps {
    aggregatedData: { aggregatedExpenses?: readonly AggregatedExpense[] | null };
    chartData: ChartDataItem[];
}

const ExpenseHeader = ({ aggregatedData, chartData }: ExpenseHeaderProps) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom fontWeight={700}>
                Expenses
            </Typography>
            
            <Card sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Grid container spacing={2}>
                    <Grid>
                        <Typography variant="h6">Total Expenses</Typography>
                        <Typography variant="h4">
                            {aggregatedData.aggregatedExpenses && (aggregatedData.aggregatedExpenses as unknown as AggregatedExpense[]).length > 0 
                                ? [...(aggregatedData.aggregatedExpenses as unknown as AggregatedExpense[])]
                                    .reduce((sum: number, item: AggregatedExpense) => sum + item.totalAmount, 0)
                                    .toFixed(2)
                                : "0.00"}
                            {chartData.length > 0 && ` ${chartData[0].currency}`}
                        </Typography>
                    </Grid>
                    <Grid>
                        <Typography variant="h6">Essential Expenses</Typography>
                        <Typography variant="h4">
                            {/* This would be calculated based on tagged data */}
                            {aggregatedData.aggregatedExpenses && (aggregatedData.aggregatedExpenses as AggregatedExpense[]).length > 0 
                                ? (
                                    [...(aggregatedData.aggregatedExpenses as unknown as AggregatedExpense[])]
                                        .reduce((sum: number, item: AggregatedExpense) => {
                                            // Get the actual essential tagged expenses from the API when available
                                            // For now using the static 60% as a placeholder
                                            return sum + (item.totalAmount * 0.6);
                                        }, 0)
                                        .toFixed(2)
                                )
                                : "0.00"}
                            {chartData.length > 0 && ` ${chartData[0].currency}`}
                        </Typography>
                        <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
                            Needed for family well-being
                        </Typography>
                    </Grid>
                    <Grid>
                        <Typography variant="h6">Non-Essential Expenses</Typography>
                        <Typography variant="h4">
                            {/* This would be calculated based on tagged data */}
                            {aggregatedData.aggregatedExpenses && (aggregatedData.aggregatedExpenses as AggregatedExpense[]).length > 0 
                                ? (
                                    [...(aggregatedData.aggregatedExpenses as unknown as AggregatedExpense[])]
                                        .reduce((sum: number, item: AggregatedExpense) => sum + (item.totalAmount * 0.4), 0)
                                        .toFixed(2)
                                )
                                : "0.00"}
                            {chartData.length > 0 && ` ${chartData[0].currency}`}
                        </Typography>
                        <Typography variant="body2" color="inherit" sx={{ opacity: 0.8, fontStyle: 'italic' }}>
                            Luxurious expenses that can be avoided
                        </Typography>
                    </Grid>
                </Grid>
            </Card>
        </Box>
    );
};

export default ExpenseHeader;
