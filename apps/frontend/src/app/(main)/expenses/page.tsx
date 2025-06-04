'use client';

import { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Fab,
    Tab,
    Tabs,
    Card
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { 
    useGetAggregatedExpensesQuery, 
    useGetMonthlyExpensesQuery 
} from '@/graphql/models/generated';
import AddExpenseDialog from './AddExpenseDialog';
import ExpenseDetailsDialog from './ExpenseDetailsDialog';
import {
    ExpenseHeader,
    ExpenseFilters,
    ExpenseChart,
    ExpenseList
} from './components';

// Type definitions for props and state - more specific types are in components
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

// This space intentionally left empty - moved to respective components

// This space intentionally left empty - moved to respective components

const ExpensesPage = () => {
    // Dialog states
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<{ month: string; year: string } | null>(null);
    
    // Filter states
    const [timeRange, setTimeRange] = useState('6'); // Default to 6 months
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    
    // Current view
    const [currentTab, setCurrentTab] = useState(0); // 0 for chart view, 1 for list view        // Fetch aggregated expenses using the generated hook
    const { data: aggregatedData, loading: aggregatedLoading, error: aggregatedError, refetch: refetchAggregated } = 
        useGetAggregatedExpensesQuery({
            variables: {
                categories: categoryFilter.length > 0 ? categoryFilter as any : [],
                tags: tagFilter.length > 0 ? tagFilter as any : []
            }
        });
    
    // Fetch monthly expenses when a month is selected using the generated hook
    const { data: monthlyData, loading: monthlyLoading, error: monthlyError, refetch: refetchMonthly } = 
        useGetMonthlyExpensesQuery({
            variables: {
                month: selectedMonth?.month || '',
                year: selectedMonth?.year || '',
                categories: categoryFilter.length > 0 ? categoryFilter as any : [],
                tags: tagFilter.length > 0 ? tagFilter as any : []
            },
            skip: !selectedMonth
        });
    
    // Extract unique categories and tags for filters
    const categories = useMemo(() => {
        if (!aggregatedData?.aggregatedExpenses) return [];
        
        // Predefined categories with essential/non-essential classification
        return [
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
    }, [aggregatedData]);
    
    const tags = useMemo(() => {
        if (!aggregatedData?.aggregatedExpenses) return [];
        
        // Simplified tags focused on essential vs non-essential only
        return [
            'Essential', 
            'Non-essential'
        ];
    }, [aggregatedData]);
    
    // Toggle category filter
    const toggleCategoryFilter = (category: string) => {
        setCategoryFilter(prev => 
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };
    
    // Toggle tag filter
    const toggleTagFilter = (tag: string) => {
        setTagFilter(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };
    
    // Format data for the chart
    const chartData = useMemo(() => {
        if (!aggregatedData?.aggregatedExpenses) return [];
        
        // Convert to array, sort by date, and limit to the selected time range
        const currentDate = new Date();
        const monthsToShow = parseInt(timeRange);
        
        // Create a copy of the aggregatedExpenses array to avoid mutating the Apollo cache
        return [...(aggregatedData.aggregatedExpenses as unknown as AggregatedExpense[])]
            .map((expense: AggregatedExpense) => ({
                name: `${expense.month}/${expense.year}`, // Simple format, will be formatted properly in chart component
                month: expense.month,
                year: expense.year,
                amount: expense.totalAmount,
                currency: expense.currency,
                // Create date for sorting
                date: new Date(parseInt(expense.year), parseInt(expense.month) - 1, 1)
            }))
            .sort((a: ChartDataItem, b: ChartDataItem) => 
                (a.date?.getTime() || 0) - (b.date?.getTime() || 0)) // Sort from oldest to newest
            .filter((item: ChartDataItem) => {
                // Filter to show only the last X months based on timeRange
                if (!item.date) return true;
                const cutoffDate = new Date();
                cutoffDate.setMonth(currentDate.getMonth() - monthsToShow);
                return item.date >= cutoffDate;
            })
            .map(({ name, month, year, amount, currency }: ChartDataItem) => ({
                name, month, year, amount, currency
            }));
    }, [aggregatedData, timeRange]);
    
    // Handle tab change
    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };
    
    // Dialog handlers
    const handleAddExpense = () => {
        setAddDialogOpen(true);
    };
    
    const handleViewMonthDetails = (month: string, year: string) => {
        setSelectedMonth({ month, year });
        setDetailsDialogOpen(true);
    };
    
    const handleExpenseCreated = () => {
        refetchAggregated();
        if (selectedMonth) {
            refetchMonthly();
        }
    };
    
    // Handle loading and error states
    if (aggregatedLoading) return <p>Loading...</p>;
    if (aggregatedError) return <p>Error: {aggregatedError.message}</p>;
    
    const hasExpenses = aggregatedData?.aggregatedExpenses && aggregatedData.aggregatedExpenses.length > 0;
    
    if (!hasExpenses) {
        return (
            <Box sx={{ padding: 2 }}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    No Expenses Found
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    You can record your first expense by clicking the button below.
                </Typography>
                <Fab
                    color="primary"
                    aria-label="add"
                    sx={{ position: 'fixed', bottom: 16, right: 16 }}
                    onClick={handleAddExpense}
                >
                    <AddIcon />
                </Fab>
                <AddExpenseDialog
                    open={addDialogOpen}
                    onClose={() => setAddDialogOpen(false)}
                    onSuccess={handleExpenseCreated}
                />
            </Box>
        );
    }
    
    return (
        <Box sx={{ padding: 2 }}>
            {/* Header with title and summary */}
            <ExpenseHeader 
                aggregatedData={aggregatedData as any} 
                chartData={chartData} 
            />
            
            {/* Tabs for switching between views */}
            <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Chart View" />
                <Tab label="List View" />
            </Tabs>
            
            {/* Filter controls */}
            <ExpenseFilters 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                tagFilter={tagFilter}
                setTagFilter={setTagFilter}
                toggleCategoryFilter={toggleCategoryFilter}
                toggleTagFilter={toggleTagFilter}
                categories={categories}
                tags={tags}
            />
            
            {/* Content based on selected tab */}
            {currentTab === 0 ? (
                <ExpenseChart 
                    chartData={chartData}
                    handleViewMonthDetails={handleViewMonthDetails}
                />
            ) : (
                <ExpenseList 
                    chartData={chartData}
                    aggregatedData={aggregatedData as any}
                    handleViewMonthDetails={handleViewMonthDetails}
                    selectedMonth={selectedMonth}
                />
            )}
            
            <Fab
                color="primary"
                aria-label="add"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                onClick={handleAddExpense}
            >
                <AddIcon />
            </Fab>
            
            {/* Dialogs */}
            <AddExpenseDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onSuccess={handleExpenseCreated}
            />
            
            {selectedMonth && (
                <ExpenseDetailsDialog
                    open={detailsDialogOpen}
                    onClose={() => { setDetailsDialogOpen(false); setSelectedMonth(null); }}
                    month={selectedMonth.month}
                    year={selectedMonth.year}
                    onSuccess={handleExpenseCreated}
                />
            )}
        </Box>
    );
};

export default ExpensesPage;
