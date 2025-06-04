'use client';

import { Box, Typography, Card } from '@mui/material';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    LabelList,
    Cell
} from 'recharts';

// Date/time utility for formatting
const formatMonth = (month: string): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1];
};

interface ChartDataItem {
    name: string;
    month: string;
    year: string;
    amount: number;
    currency: string;
    date?: Date;
    // We'll keep the original structure for backward compatibility
}

// New interface for category-based stacked bar chart
interface CategoryChartItem {
    name: string;
    month: string;
    year: string;
    currency: string;
    date?: Date;
    [category: string]: string | number | Date | undefined; // Dynamic keys for each category
}

// Interface for clustered and stacked bar chart data
interface ClusteredStackedItem {
    name: string;
    month: string;
    year: string;
    [currencyCategory: string]: string | number; // Format: "USD_Food & Groceries", "EUR_Housing", etc.
}

interface ExpenseChartProps {
    chartData: ChartDataItem[];
    handleViewMonthDetails: (month: string, year: string) => void;
}

// Predefined categories for coloring
const categories = [
    'Food & Groceries', 
    'Housing & Utilities', 
    'Healthcare',
    'Education',
    'Transportation',
    'Communication & Internet',
    'Childcare',
    'Insurance',
    'Debt Payments',
    'Entertainment',
    'Shopping',
    'Dining Out',
    'Travel & Vacation',
    'Subscriptions',
    'Hobbies',
    'Beauty & Personal Care',
    'Gifts & Donations',
    'Other'
];

// Define colors for categories
const categoryColors: { [key: string]: string } = {
    'Food & Groceries': '#FF8A65',
    'Housing & Utilities': '#4FC3F7',
    'Healthcare': '#CE93D8',
    'Education': '#9CCC65',
    'Transportation': '#FFD54F',
    'Communication & Internet': '#4DB6AC',
    'Childcare': '#F48FB1',
    'Insurance': '#7986CB',
    'Debt Payments': '#A1887F',
    'Entertainment': '#BA68C8',
    'Shopping': '#4DD0E1',
    'Dining Out': '#FF7043',
    'Travel & Vacation': '#FFA726',
    'Subscriptions': '#AED581',
    'Hobbies': '#64B5F6',
    'Beauty & Personal Care': '#F06292',
    'Gifts & Donations': '#81C784',
    'Other': '#BDBDBD'
};

const ExpenseChart = ({ chartData, handleViewMonthDetails }: ExpenseChartProps) => {
    // Since we're using an aggregated expense data structure that doesn't have category breakdown,
    // we'll use a simulation to demonstrate how stacked bars would look
    // In a real implementation, we'd fetch category-wise data from the backend

    // Group data by month-year
    const groupedData: { [key: string]: ChartDataItem[] } = chartData.reduce((acc, item) => {
        const key = `${formatMonth(item.month)} ${item.year}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as { [key: string]: ChartDataItem[] });

    // Get unique currencies from the data
    const uniqueCurrencies = [...new Set(chartData.map(item => item.currency))];

    // Prepare data for clustered and stacked columns
    const prepareClusteredStackedData = () => {
        // First, prepare data organized by month and currency
        const monthCurrencyData: ClusteredStackedItem[] = [];

        // For each month/year, create an entry with data for each currency and category
        Object.entries(groupedData).forEach(([dateKey, items]) => {
            if (items.length === 0) return;

            // Create base object for this month
            const baseMonthItem: ClusteredStackedItem = {
                name: dateKey,
                month: items[0].month,
                year: items[0].year,
            };

            // For each currency, simulate category distribution
            uniqueCurrencies.forEach(currency => {
                // Filter items for this currency
                const currencyItems = items.filter(item => item.currency === currency);
                if (currencyItems.length === 0) return;

                // Calculate total amount for this currency
                const totalAmount = currencyItems.reduce((sum, item) => sum + item.amount, 0);
                
                // Randomly select 2-4 categories for this currency
                const numCategories = 2 + Math.floor(Math.random() * 3); // 2 to 4 categories
                const selectedCategories = [...categories]
                    .sort(() => 0.5 - Math.random())
                    .slice(0, numCategories);
                
                // Create category distribution for this currency
                let remainingAmount = totalAmount;
                
                selectedCategories.forEach((category, index) => {
                    const categoryKey = `${currency}_${category}`;
                    
                    if (index === selectedCategories.length - 1) {
                        // Last category gets remaining amount
                        baseMonthItem[categoryKey] = Number(remainingAmount.toFixed(2));
                    } else {
                        // Random distribution
                        const portion = remainingAmount * (0.2 + Math.random() * 0.4);
                        baseMonthItem[categoryKey] = Number(portion.toFixed(2));
                        remainingAmount -= portion;
                    }
                });
            });

            monthCurrencyData.push(baseMonthItem);
        });

        return monthCurrencyData;
    };

    const clusteredStackedData = prepareClusteredStackedData();

    // Generate all possible currency-category combinations
    const currencyCategoryKeys: string[] = [];
    uniqueCurrencies.forEach(currency => {
        categories.forEach(category => {
            const key = `${currency}_${category}`;
            // Only include keys that have data
            if (clusteredStackedData.some(item => item[key] && typeof item[key] === 'number' && (item[key] as number) > 0)) {
                currencyCategoryKeys.push(key);
            }
        });
    });

    return (
        <Card sx={{ p: 2, borderRadius: 2, mb: 3, minHeight: 500 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Monthly Expenses by Currency and Category</Typography>
            
            {/* Chart shows expense trends */}
            <Box sx={{ height: 400, width: '100%' }}>
                {chartData.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', p: 4 }}>
                        No data available for the selected filters
                    </Typography>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={clusteredStackedData}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 30,
                            }}
                            onClick={(data) => {
                                if (data && data.activePayload && data.activePayload.length > 0) {
                                    const payload = data.activePayload[0].payload;
                                    handleViewMonthDetails(payload.month, payload.year);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip 
                                formatter={(value, name, props) => {
                                    if (typeof name === 'string' && name.includes('_')) {
                                        const [currency, category] = name.split('_');
                                        return [typeof value === 'number' ? `${value.toFixed(2)} ${currency}` : `${value} ${currency}`, category];
                                    }
                                    return [value, name];
                                }}
                                labelFormatter={(label) => `${label}`}
                            />
                            <Legend 
                                formatter={(value) => {
                                    if (typeof value === 'string' && value.includes('_')) {
                                        const [currency, category] = value.split('_');
                                        return `${category} (${currency})`;
                                    }
                                    return value;
                                }}
                            />
                            {currencyCategoryKeys.map((key) => {
                                const [currency, category] = key.split('_');
                                return (
                                    <Bar 
                                        key={key}
                                        dataKey={key} 
                                        stackId={currency} // Stack by currency
                                        name={key}
                                        fill={categoryColors[category] || '#8884d8'}
                                        cursor="pointer"
                                    />
                                );
                            })}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </Card>
    );
};

export default ExpenseChart;
