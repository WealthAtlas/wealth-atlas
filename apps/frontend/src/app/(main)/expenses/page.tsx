'use client';

import { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Fab,
    TextField,
    InputAdornment,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Chip,
    Card,
    Grid,
    Button,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DateRangeIcon from '@mui/icons-material/DateRange';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation } from '@apollo/client';
import { GET_AGGREGATED_EXPENSES, GET_MONTHLY_EXPENSES } from '@/graphql/queries/GetExpenses.query';

// Recharts components for visualization
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

// Dialog components that we'll create next
import AddExpenseDialog from './AddExpenseDialog';
import ExpenseDetailsDialog from './ExpenseDetailsDialog';

// Type definitions
interface AggregatedExpense {
    month: string;
    year: string;
    currency: string;
    totalAmount: number;
}

interface ExpenseDTO {
    id: string;
    description: string;
    amount: number;
    currency: string;
    category: string;
    tags: string[];
    date: Date;
}

interface ChartDataItem {
    name: string;
    month: string;
    year: string;
    amount: number;
    currency: string;
    date?: Date;
}

// Date/time utility for formatting
const formatMonth = (month: string) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1];
};

const getTimeRangeOptions = () => [
    { value: '3', label: 'Last 3 Months' },
    { value: '6', label: 'Last 6 Months' },
    { value: '12', label: 'Last 12 Months' },
    { value: '24', label: 'Last 2 Years' },
];

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
    const [currentTab, setCurrentTab] = useState(0); // 0 for chart view, 1 for list view
    
    // Fetch aggregated expenses
    const { data: aggregatedData, loading: aggregatedLoading, error: aggregatedError, refetch: refetchAggregated } = 
        useQuery(GET_AGGREGATED_EXPENSES, {
            variables: {
                categories: categoryFilter.length > 0 ? categoryFilter : undefined,
                tags: tagFilter.length > 0 ? tagFilter : undefined
            }
        });
    
    // Fetch monthly expenses when a month is selected
    const { data: monthlyData, loading: monthlyLoading, error: monthlyError, refetch: refetchMonthly } = 
        useQuery(GET_MONTHLY_EXPENSES, {
            variables: {
                month: selectedMonth?.month || '',
                year: selectedMonth?.year || '',
                categories: categoryFilter.length > 0 ? categoryFilter : undefined,
                tags: tagFilter.length > 0 ? tagFilter : undefined
            },
            skip: !selectedMonth
        });
    
    // Extract unique categories and tags for filters
    const categories = useMemo(() => {
        if (!aggregatedData?.aggregatedExpenses) return [];
        const uniqueCategories = new Set<string>();
        
        // We'll need to modify this to extract categories from the actual data
        // For now, it's a placeholder
        return ['Food', 'Transportation', 'Entertainment', 'Housing', 'Utilities', 'Other'];
    }, [aggregatedData]);
    
    const tags = useMemo(() => {
        if (!aggregatedData?.aggregatedExpenses) return [];
        
        // We'll need to modify this to extract tags from the actual data
        // For now, it's a placeholder
        return ['Essential', 'Luxury', 'Monthly', 'One-time', 'Shared'];
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
        return [...(aggregatedData.aggregatedExpenses as AggregatedExpense[])]
            .map((expense: AggregatedExpense) => ({
                name: `${formatMonth(expense.month)} ${expense.year}`,
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
            {/* Header with title */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Expenses
                </Typography>
                
                <Card sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6">Total Expenses</Typography>
                            <Typography variant="h4">
                                {aggregatedData.aggregatedExpenses && (aggregatedData.aggregatedExpenses as AggregatedExpense[]).length > 0 
                                    ? [...(aggregatedData.aggregatedExpenses as AggregatedExpense[])]
                                        .reduce((sum: number, item: AggregatedExpense) => sum + item.totalAmount, 0)
                                        .toFixed(2)
                                    : "0.00"}
                                {chartData.length > 0 && ` ${chartData[0].currency}`}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6">Top Category</Typography>
                            <Typography variant="h4">
                                Food & Dining
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6">Monthly Average</Typography>
                            <Typography variant="h4">
                                {aggregatedData.aggregatedExpenses && (aggregatedData.aggregatedExpenses as AggregatedExpense[]).length > 0 
                                    ? (
                                        [...(aggregatedData.aggregatedExpenses as AggregatedExpense[])]
                                            .reduce((sum: number, item: AggregatedExpense) => sum + item.totalAmount, 0) / 
                                            (aggregatedData.aggregatedExpenses as AggregatedExpense[]).length
                                      ).toFixed(2)
                                    : "0.00"}
                                {chartData.length > 0 && ` ${chartData[0].currency}`}
                            </Typography>
                        </Grid>
                    </Grid>
                </Card>
            </Box>
            
            {/* Tabs for switching between views */}
            <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Chart View" />
                <Tab label="List View" />
            </Tabs>
            
            {/* Filter controls */}
            <Card sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search expenses"
                            variant="outlined"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Time Range</InputLabel>
                            <Select
                                value={timeRange}
                                label="Time Range"
                                onChange={(e) => setTimeRange(e.target.value as string)}
                                startAdornment={
                                    <InputAdornment position="start">
                                        <DateRangeIcon />
                                    </InputAdornment>
                                }
                            >
                                {getTimeRangeOptions().map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Filter</InputLabel>
                            <Select
                                multiple
                                value={categoryFilter}
                                label="Filter"
                                onChange={(e) => setCategoryFilter(e.target.value as string[])}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => (
                                            <Chip key={value} label={value} />
                                        ))}
                                    </Box>
                                )}
                                startAdornment={
                                    <InputAdornment position="start">
                                        <FilterListIcon />
                                    </InputAdornment>
                                }
                            >
                                {categories.map((category) => (
                                    <MenuItem key={category} value={category}>
                                        {category}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
                
                {/* Active filters display */}
                {(categoryFilter.length > 0 || tagFilter.length > 0) && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {categoryFilter.map(category => (
                            <Chip 
                                key={category}
                                label={category}
                                onDelete={() => toggleCategoryFilter(category)}
                                color="primary"
                                variant="outlined"
                            />
                        ))}
                        {tagFilter.map(tag => (
                            <Chip 
                                key={tag}
                                label={`#${tag}`}
                                onDelete={() => toggleTagFilter(tag)}
                                color="secondary"
                                variant="outlined"
                            />
                        ))}
                    </Box>
                )}
            </Card>
            
            {/* Content based on selected tab */}
            {currentTab === 0 ? (
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
                                        if (data && data.activePayload && data.activePayload[0]) {
                                            const entry = data.activePayload[0].payload as ChartDataItem;
                                            handleViewMonthDetails(entry.month, entry.year);
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 12 }} 
                                        angle={-45} 
                                        textAnchor="end"
                                        height={70}
                                    />
                                    <YAxis />
                                    <Tooltip 
                                        formatter={(value: number) => [`${value.toFixed(2)}`, 'Amount']}
                                        labelFormatter={(label) => `Period: ${label}`}
                                        cursor={{ fillOpacity: 0.3 }}
                                    />
                                    <Legend />
                                    <Bar 
                                        dataKey="amount" 
                                        name="Total Expense" 
                                        fill="#8884d8"
                                    >
                                        <LabelList dataKey="currency" position="top" />
                                        {chartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`}
                                                fill={entry.month === (selectedMonth?.month || '') && entry.year === (selectedMonth?.year || '') 
                                                    ? '#82ca9d' 
                                                    : '#8884d8'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Box>
                </Card>
            ) : (
                <Card sx={{ p: 2, borderRadius: 2, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Monthly Expense Summary</Typography>
                    
                    {chartData.length === 0 ? (
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
                                    {[...(aggregatedData.aggregatedExpenses as AggregatedExpense[])]
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
                                                <Button 
                                                    variant="outlined" 
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewMonthDetails(expense.month, expense.year);
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Card>
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
