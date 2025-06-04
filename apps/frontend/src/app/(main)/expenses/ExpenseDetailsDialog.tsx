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
    Tooltip,
    CircularProgress,
    Alert,
    AlertTitle,
    Snackbar
} from '@mui/material';
import { 
    useGetMonthlyExpensesQuery,
    useDeleteExpenseMutation
} from '@/graphql/models/generated';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import AddExpenseDialog from './AddExpenseDialog';

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
    // State for various dialogs and UI feedback
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    
    const { data, loading, error, refetch } = useGetMonthlyExpensesQuery({
        variables: { month, year, categories: [], tags: [] },
        skip: !open
    });

    const [deleteExpense] = useDeleteExpenseMutation();
    
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

    // Handle edit and delete
    const handleEdit = (id: string) => {
        // To be implemented
        console.log('Edit expense', id);
    };

    const handleDeleteClick = (id: string) => {
        setSelectedExpenseId(id);
        setDeleteDialogOpen(true);
    };
    
    const handleConfirmDelete = async () => {
        if (!selectedExpenseId) return;
        
        try {
            const result = await deleteExpense({
                variables: { expenseId: selectedExpenseId }
            });
            
            if (result.data?.deleteExpense) {
                setSnackbarMessage('Expense deleted successfully');
                setSnackbarOpen(true);
                refetch(); // Refresh the expenses list
                onSuccess(); // Notify parent component to refresh
            }
        } catch (error) {
            setSnackbarMessage(`Error deleting expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setSnackbarOpen(true);
        } finally {
            setDeleteDialogOpen(false);
            setSelectedExpenseId(null);
        }
    };
    
    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setSelectedExpenseId(null);
    };

    const handleAddExpense = () => {
        setAddDialogOpen(true);
    };
    
    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
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
            <Box sx={{ px: 3, pt: 0, pb: 2, display: 'flex', gap: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Chip 
                    label="Essential Expenses" 
                    color="primary"
                    sx={{ borderRadius: 1 }} 
                />
                <Chip 
                    label="Non-Essential Expenses" 
                    sx={{ borderRadius: 1, borderColor: 'warning.main', color: 'warning.main' }} 
                    variant="outlined"
                />
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Essential: Needed for family well-being | Non-essential: Luxurious expenses that can be avoided
                    </Typography>
                </Box>
            </Box>
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
                            
                            {/* Calculate essential vs non-essential expenses breakdown */}
                            {(() => {
                                // Calculate essential and non-essential totals based on tags
                                const essentialTotal = expenses
                                    .filter(exp => exp.tags.includes('Essential'))
                                    .reduce((sum, exp) => sum + exp.amount, 0);
                                
                                const nonEssentialTotal = expenses
                                    .filter(exp => exp.tags.includes('Non-essential'))
                                    .reduce((sum, exp) => sum + exp.amount, 0);
                                
                                const uncategorizedTotal = totalAmount - essentialTotal - nonEssentialTotal;
                                
                                return (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Essential</Typography>
                                            <Typography variant="body1" fontWeight="bold" color="primary.main">
                                                {essentialTotal.toFixed(2)} {expenses[0]?.currency}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {totalAmount ? `${Math.round((essentialTotal / totalAmount) * 100)}%` : '0%'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Non-essential</Typography>
                                            <Typography variant="body1" fontWeight="bold" color="warning.main">
                                                {nonEssentialTotal.toFixed(2)} {expenses[0]?.currency}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {totalAmount ? `${Math.round((nonEssentialTotal / totalAmount) * 100)}%` : '0%'}
                                            </Typography>
                                        </Box>
                                        {uncategorizedTotal > 0 && (
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">Uncategorized</Typography>
                                                <Typography variant="body1" fontWeight="bold" color="text.secondary">
                                                    {uncategorizedTotal.toFixed(2)} {expenses[0]?.currency}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {totalAmount ? `${Math.round((uncategorizedTotal / totalAmount) * 100)}%` : '0%'}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })()}
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
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Box 
                                                                component="span" 
                                                                sx={{ 
                                                                    width: 4, 
                                                                    height: 16, 
                                                                    bgcolor: expense.tags.includes('Essential') ? 'primary.main' : 'warning.main', 
                                                                    mr: 1,
                                                                    display: 'inline-block',
                                                                    borderRadius: 0.5
                                                                }}
                                                            />
                                                            {expense.category}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                            {expense.tags.map((tag: string) => {
                                                                if (tag === 'Essential') {
                                                                    return (
                                                                        <Chip
                                                                            key={tag}
                                                                            label={tag}
                                                                            size="small"
                                                                            color="primary"
                                                                            sx={{ borderRadius: 1 }}
                                                                        />
                                                                    );
                                                                } else if (tag === 'Non-essential') {
                                                                    return (
                                                                        <Chip
                                                                            key={tag}
                                                                            label={tag}
                                                                            size="small"
                                                                            sx={{ 
                                                                                borderRadius: 1,
                                                                                borderColor: 'warning.main', 
                                                                                color: 'warning.main' 
                                                                            }}
                                                                            variant="outlined"
                                                                        />
                                                                    );
                                                                }
                                                                return null; // Don't show any other tags
                                                            })}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography 
                                                            sx={{ 
                                                                fontWeight: 'bold',
                                                                color: expense.tags.includes('Non-essential') ? 'warning.main' : 
                                                                       expense.tags.includes('Essential') ? 'primary.main' : 
                                                                       'inherit'
                                                            }}
                                                        >
                                                            {expense.amount.toFixed(2)} {expense.currency}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip title="Edit">
                                                            <IconButton size="small" onClick={() => handleEdit(expense.id)}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton size="small" onClick={() => handleDeleteClick(expense.id)}>
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
            
            {/* Add Expense Dialog */}
            <AddExpenseDialog 
                open={addDialogOpen} 
                onClose={() => setAddDialogOpen(false)}
                onSuccess={() => {
                    refetch();
                    onSuccess();
                }}
                defaultDate={new Date(`${year}-${month.toString().padStart(2, '0')}-15`)}
            />
            
            {/* Confirm Delete Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCancelDelete}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete this expense? This action cannot be undone.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Feedback Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={handleCloseSnackbar}
                message={snackbarMessage}
            />
        </Dialog>
    );
};

export default ExpenseDetailsDialog;
