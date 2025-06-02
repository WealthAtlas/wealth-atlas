'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import { useQuery } from '@apollo/client';
import { GET_MONTHLY_EXPENSES } from '@/graphql/queries/GetExpenses.query';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';

interface ExpenseDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    month: string;
    year: string;
    onSuccess: () => void;
}

// Format date to a readable string
const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

// Format month number to name
const getMonthName = (month: string) => {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[parseInt(month) - 1];
};

const ExpenseDetailsDialog = ({ open, onClose, month, year, onSuccess }: ExpenseDetailsDialogProps) => {
    // State for AddExpenseDialog (could be refactored to use the same dialog as the main page)
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    
    const { data, loading, error } = useQuery(GET_MONTHLY_EXPENSES, {
        variables: { month, year },
        skip: !open
    });

    const expenses = data?.monthlyExpenses || [];
    
    // Group expenses by date
    const expensesByDate = expenses.reduce((acc: Record<string, any[]>, expense: any) => {
        const dateString = formatDate(expense.date);
        if (!acc[dateString]) {
            acc[dateString] = [];
        }
        acc[dateString].push(expense);
        return acc;
    }, {});
    
    // Calculate total for the month
    const totalAmount = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);

    // Handle edit and delete (to be implemented)
    const handleEdit = (id: string) => {
        // To be implemented
        console.log('Edit expense', id);
    };

    const handleDelete = (id: string) => {
        // To be implemented
        console.log('Delete expense', id);
    };

    const handleAddExpense = () => {
        setAddDialogOpen(true);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarMonthIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">
                        Expenses for {getMonthName(month)} {year}
                    </Typography>
                </Box>
                <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={handleAddExpense}
                >
                    Add Expense
                </Button>
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <Typography>Loading...</Typography>
                    </Box>
                ) : error ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <Typography color="error">Error: {error.message}</Typography>
                    </Box>
                ) : expenses.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <Typography>No expenses found for this month</Typography>
                    </Box>
                ) : (
                    <>
                        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="h6">
                                Total: {totalAmount.toFixed(2)} {expenses[0]?.currency}
                            </Typography>
                        </Box>

                        {Object.entries(expensesByDate).map(([date, dayExpenses]) => (
                            <Box key={date} sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    {date}
                                </Typography>
                                
                                <TableContainer component={Paper} variant="outlined">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Description</TableCell>
                                                <TableCell>Category</TableCell>
                                                <TableCell>Tags</TableCell>
                                                <TableCell align="right">Amount</TableCell>
                                                <TableCell>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {dayExpenses.map((expense) => (
                                                <TableRow key={expense.id}>
                                                    <TableCell>{expense.description}</TableCell>
                                                    <TableCell>{expense.category}</TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                            {expense.tags.map((tag: string) => (
                                                                <Chip
                                                                    key={tag}
                                                                    label={tag}
                                                                    size="small"
                                                                    sx={{ borderRadius: 1 }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {expense.amount.toFixed(2)} {expense.currency}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip title="Edit">
                                                            <IconButton size="small" onClick={() => handleEdit(expense.id)}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton size="small" onClick={() => handleDelete(expense.id)}>
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        ))}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
            
            {/* You would need to implement the AddExpenseDialog or reuse the component from the main page */}
            {/* 
            <AddExpenseDialog 
                open={addDialogOpen} 
                onClose={() => setAddDialogOpen(false)}
                onSuccess={onSuccess}
                defaultDate={new Date(`${year}-${month}-15`)}
            /> 
            */}
        </Dialog>
    );
};

export default ExpenseDetailsDialog;
