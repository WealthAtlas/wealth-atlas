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

interface ChartDataItem {
    name: string;
    month: string;
    year: string;
    amount: number;
    currency: string;
    date?: Date;
}

interface ExpenseChartProps {
    chartData: ChartDataItem[];
    handleViewMonthDetails: (month: string, year: string) => void;
}

const ExpenseChart = ({ chartData, handleViewMonthDetails }: ExpenseChartProps) => {
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
                            data={chartData}
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
                                formatter={(value, name) => {
                                    if (name === 'amount') {
                                        // Get currency from the item
                                        const item = chartData.find(item => item.amount === value);
                                        const currency = item ? item.currency : 'USD';
                                        return [`${value?.toFixed(2)} ${currency}`, 'Total Expenses'];
                                    }
                                    return [value, name];
                                }}
                            />
                            <Legend />
                            <Bar 
                                dataKey="amount" 
                                fill="#8884d8" 
                                name="Total Expenses"
                                cursor="pointer"
                                isAnimationActive={true}
                            >
                                <LabelList 
                                    dataKey="amount" 
                                    position="top" 
                                    formatter={(value: number) => value.toFixed(1)}
                                />
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`}
                                        fill={index === chartData.length - 1 ? '#8884d8' : '#82ca9d'} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </Card>
    );
};

export default ExpenseChart;
