'use client';

import { Box, Typography, Card } from '@mui/material';

interface ChartDataItem {
    name: string;
    month: string;
    year: string;
    amount: number;
    currency: string;
    date?: Date;
}

interface ExpenseInsightsProps {
    chartData: ChartDataItem[];
}

const ExpenseInsights = ({ chartData }: ExpenseInsightsProps) => {
    // Example calculation for demonstration
    const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);
    const essentialAmount = totalAmount * 0.6; // Just a placeholder - should be calculated from real data
    const nonEssentialAmount = totalAmount * 0.4; // Just a placeholder - should be calculated from real data
    const averageMonthlyExpense = totalAmount / (chartData.length || 1);
    const currency = chartData.length > 0 ? chartData[0].currency : 'USD';

    return (
        <Card sx={{ p: 2, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Spending Insights</Typography>
            
            {chartData.length === 0 ? (
                <Typography sx={{ textAlign: 'center', p: 4 }}>
                    No data available for the selected filters
                </Typography>
            ) : (
                <Box>
                    {/* Essential vs Non-essential spending breakdown */}
                    <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Essential vs. Non-essential Spending
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
                            <Box sx={{ flex: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
                                <Typography variant="subtitle2" color="primary.main" gutterBottom>
                                    Essential Expenses
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {essentialAmount.toFixed(2)} {currency}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {(essentialAmount / totalAmount * 100).toFixed(1)}% of total spending
                                </Typography>
                            </Box>
                            
                            <Box sx={{ flex: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
                                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                                    Non-essential Expenses
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {nonEssentialAmount.toFixed(2)} {currency}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {(nonEssentialAmount / totalAmount * 100).toFixed(1)}% of total spending
                                </Typography>
                            </Box>
                        </Box>
                    </Card>
                    
                    {/* Saving opportunities */}
                    <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Potential Saving Opportunities
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="body2">
                                Based on your spending patterns, you might be able to save up to <strong>{(nonEssentialAmount * 0.3).toFixed(2)} {currency}</strong> by reducing non-essential expenses.
                            </Typography>
                            
                            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px dashed', borderColor: 'warning.main' }}>
                                <Typography variant="body2" fontWeight="medium">
                                    Tip: Review your non-essential expenses and identify items you could reduce or eliminate, particularly in categories like entertainment, dining out, and subscriptions.
                                </Typography>
                            </Box>
                        </Box>
                    </Card>
                    
                    {/* Spending habits tips */}
                    <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Healthy Spending Habits
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <Typography variant="body2" component="div" sx={{ flex: 1 }}>
                                    <strong>50/30/20 Rule:</strong> Try to allocate 50% of your income to needs, 30% to wants, and 20% to savings and debt repayment.
                                </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <Typography variant="body2" component="div" sx={{ flex: 1 }}>
                                    <strong>Monthly Review:</strong> Schedule a monthly review of your expenses to identify patterns and opportunities for improvement.
                                </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" component="div" sx={{ flex: 1 }}>
                                        <strong>Mindful Spending:</strong> Before making a non-essential purchase, wait 24 hours to determine if it's really necessary.
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Card>
                </Box>
            )}
        </Card>
    );
};

export default ExpenseInsights;
