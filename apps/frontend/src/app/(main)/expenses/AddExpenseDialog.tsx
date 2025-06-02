'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Chip,
    OutlinedInput,
    Typography,
    InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useMutation } from '@apollo/client';
import { CREATE_EXPENSE } from '@/graphql/queries/CreateExpense.query';

interface AddExpenseDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

// Predefined categories and tags - these could come from the backend in the future
const predefinedCategories = [
    'Food & Dining',
    'Transportation',
    'Entertainment',
    'Housing',
    'Utilities',
    'Shopping',
    'Medical',
    'Education',
    'Travel',
    'Personal Care',
    'Taxes',
    'Investments',
    'Gifts & Donations',
    'Other'
];

const predefinedTags = [
    'Essential',
    'Luxury',
    'Monthly',
    'One-time',
    'Shared',
    'Work',
    'Personal'
];

const AddExpenseDialog = ({ open, onClose, onSuccess }: AddExpenseDialogProps) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [date, setDate] = useState<Date | null>(new Date());
    const [currency, setCurrency] = useState('USD');  // Default currency
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [createExpense, { loading }] = useMutation(CREATE_EXPENSE);

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setCategory('');
        setTags([]);
        setDate(new Date());
        setCurrency('USD');
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!description.trim()) {
            newErrors.description = 'Description is required';
        }

        if (!amount) {
            newErrors.amount = 'Amount is required';
        } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
            newErrors.amount = 'Amount must be a positive number';
        }

        if (!category) {
            newErrors.category = 'Category is required';
        }

        if (!date) {
            newErrors.date = 'Date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            await createExpense({
                variables: {
                    input: {
                        description,
                        amount: Number(amount),
                        category,
                        tags,
                        date,
                        currency
                    }
                }
            });

            onSuccess();
            handleClose();
        } catch (error) {
            console.error('Error creating expense:', error);
            // Handle error (could set a form error or show a notification)
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Description"
                        fullWidth
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        error={!!errors.description}
                        helperText={errors.description}
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Amount"
                            type="number"
                            fullWidth
                            value={amount}
                            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''}
                                    </InputAdornment>
                                ),
                            }}
                            error={!!errors.amount}
                            helperText={errors.amount}
                        />

                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Currency</InputLabel>
                            <Select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                label="Currency"
                            >
                                <MenuItem value="USD">USD</MenuItem>
                                <MenuItem value="EUR">EUR</MenuItem>
                                <MenuItem value="GBP">GBP</MenuItem>
                                <MenuItem value="INR">INR</MenuItem>
                                <MenuItem value="JPY">JPY</MenuItem>
                                <MenuItem value="CAD">CAD</MenuItem>
                                <MenuItem value="AUD">AUD</MenuItem>
                                <MenuItem value="CNY">CNY</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <FormControl fullWidth error={!!errors.category}>
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            label="Category"
                        >
                            {predefinedCategories.map((cat) => (
                                <MenuItem key={cat} value={cat}>
                                    {cat}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.category && (
                            <Typography color="error" variant="caption" sx={{ mt: 0.5, ml: 1.5 }}>
                                {errors.category}
                            </Typography>
                        )}
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Tags</InputLabel>
                        <Select
                            multiple
                            value={tags}
                            onChange={(e) => setTags(e.target.value as string[])}
                            input={<OutlinedInput label="Tags" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={value} />
                                    ))}
                                </Box>
                            )}
                            MenuProps={MenuProps}
                        >
                            {predefinedTags.map((tag) => (
                                <MenuItem key={tag} value={tag}>
                                    {tag}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            label="Date"
                            value={date}
                            onChange={(newDate) => setDate(newDate)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.date,
                                    helperText: errors.date
                                }
                            }}
                        />
                    </LocalizationProvider>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    color="primary"
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddExpenseDialog;
