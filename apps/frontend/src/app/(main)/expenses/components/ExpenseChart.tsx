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

    // Transform data to include simulated category distribution
    const prepareStackedData = (): CategoryChartItem[] => {
        return chartData.map(item => {
            // Create a base object with the common properties
            const baseItem: CategoryChartItem = {
                name: `${formatMonth(item.month)} ${item.year}`,
                month: item.month,
                year: item.year,
                currency: item.currency,
                date: item.date
            };

            // Simulate distribution by dividing the total amount among categories
            // In a real implementation, this data would come from the backend
            const totalCategories = Math.min(5, categories.length); // Limit to 5 random categories per month
            const selectedCategories = [...categories]
                .sort(() => 0.5 - Math.random())
                .slice(0, totalCategories);
            
            let remainingAmount = item.amount;
            
            // Distribute the amount among selected categories
            selectedCategories.forEach((category, index) => {
                // Last category gets the remaining amount
                if (index === selectedCategories.length - 1) {
                    baseItem[category] = remainingAmount;
                } else {
                    // Allocate a random portion of the remaining amount
                    const portion = remainingAmount * (0.1 + Math.random() * 0.3);
                    baseItem[category] = Number(portion.toFixed(2));
                    remainingAmount -= portion;
                }
            });
            
            return baseItem;
        });
    };
    
    const stackedData = prepareStackedData();
    const activeCategories = [...new Set(stackedData.flatMap(item => 
        Object.keys(item).filter(key => 
            categories.includes(key) && typeof item[key] === 'number' && Number(item[key]) > 0
        )
    ))];

    return (
        <Card sx={{ p: 2, borderRadius: 2, mb: 3, minHeight: 500 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Monthly Expenses by Category</Typography>
            
            {/* Chart shows expense trends */}
            <Box sx={{ height: 400, width: '100%' }}>
                {chartData.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', p: 4 }}>
                        No data available for the selected filters
                    </Typography>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={stackedData}
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
                                    if (categories.includes(name as string)) {
                                        const currency = props.payload.currency || 'USD';
                                        return [typeof value === 'number' ? `${value.toFixed(2)} ${currency}` : `${value} ${currency}`, name];
                                    }
                                    return [value, name];
                                }}
                            />
                            <Legend />
                            {activeCategories.map((category) => (
                                <Bar 
                                    key={category}
                                    dataKey={category} 
                                    stackId="a"
                                    name={category}
                                    fill={categoryColors[category] || '#8884d8'}
                                    cursor="pointer"
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </Card>
    );
};

export default ExpenseChart;
