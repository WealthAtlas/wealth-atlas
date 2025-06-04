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
    InputAdornment,
    ListSubheader,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormLabel,
    FormHelperText,
    Tooltip,
    IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCreateExpenseMutation } from '@/graphql/models/generated';
import InfoIcon from '@mui/icons-material/Info';

interface AddExpenseDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultDate?: Date;
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

// Predefined categories - these could come from the backend in the future
const predefinedCategories = [
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

// Types for essential classification - decoupled from categories
type EssentialClassification = 'Essential' | 'Non-essential';

const AddExpenseDialog = ({ open, onClose, onSuccess, defaultDate }: AddExpenseDialogProps) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState('');
    const [essentialClassification, setEssentialClassification] = useState<EssentialClassification | ''>('');
    const [date, setDate] = useState<Date | null>(defaultDate || new Date());
    const [currency, setCurrency] = useState('USD');  // Default currency
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [createExpense, { loading }] = useCreateExpenseMutation();

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setCategory('');
        setEssentialClassification('');
        setDate(defaultDate || new Date());
        setCurrency('USD');
        setErrors({});
    };
    
    // Handle category change - no longer auto-tags
    const handleCategoryChange = (newCategory: string) => {
        setCategory(newCategory);
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

        if (!essentialClassification) {
            newErrors.essentialClassification = 'Please classify if this expense is essential or non-essential';
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
                        tags: essentialClassification ? [essentialClassification] : [],
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
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            label="Category"
                        >
                            {predefinedCategories.map((category) => (
                                <MenuItem 
                                    key={category} 
                                    value={category}
                                >
                                    {category}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.category && (
                            <Typography color="error" variant="caption" sx={{ mt: 0.5, ml: 1.5 }}>
                                {errors.category}
                            </Typography>
                        )}
                    </FormControl>

                    <FormControl component="fieldset" error={!!errors.essentialClassification}>
                        <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center' }}>
                            Expense Classification
                            <Tooltip title="Essential: Needed for family well-being. Non-essential: Luxurious expenses that can be avoided or replaced with cheaper alternatives." arrow>
                                <IconButton size="small" sx={{ ml: 1 }}>
                                    <InfoIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </FormLabel>
                        <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Chip 
                                        label="Essential" 
                                        color="primary" 
                                        size="small" 
                                        sx={{ borderRadius: 1, minWidth: 100 }}
                                    />
                                    <Typography variant="body2">
                                        Needed expense for family well-being
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Chip 
                                        label="Non-essential" 
                                        size="small"
                                        sx={{ borderRadius: 1, borderColor: 'warning.main', color: 'warning.main', minWidth: 100 }}
                                        variant="outlined"
                                    />
                                    <Typography variant="body2">
                                        Luxurious expenses that can be avoided or replaced with cheaper alternatives
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        <RadioGroup
                            value={essentialClassification}
                            onChange={(e) => setEssentialClassification(e.target.value as EssentialClassification)}
                        >
                            <FormControlLabel value="Essential" control={<Radio />} label="Essential" />
                            <FormControlLabel value="Non-essential" control={<Radio />} label="Non-essential" />
                        </RadioGroup>
                        {errors.essentialClassification && (
                            <FormHelperText>{errors.essentialClassification}</FormHelperText>
                        )}
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
