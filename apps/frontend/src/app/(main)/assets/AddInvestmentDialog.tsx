import { useAddInvestmentMutation } from '@/graphql/models/generated';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import React, { useState } from 'react';

interface AddInvestmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assetId: string;
}

const initialFormData = {
    amount: '',
    date: '',
    notes: '',
};

const AddInvestmentDialog: React.FC<AddInvestmentDialogProps> = ({ open, onClose, onSuccess, assetId }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({
        amount: false,
        date: false,
    });
    const [addInvestment, { loading }] = useAddInvestmentMutation();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const validateForm = () => {
        const newErrors = {
            amount: !formData.amount || isNaN(Number(formData.amount)),
            date: !formData.date,
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(Boolean);
    };

    const handleFormSubmit = async () => {
        if (!validateForm()) return;
        try {
            await addInvestment({
                variables: {
                    assetId,
                    input: {
                        valuePerQty: parseFloat(formData.amount),
                        date: new Date(formData.date),
                        qty: 1
                    },
                },
            });
            onSuccess();
            handleClose();
        } catch (err) {
            console.error('Error creating investment:', err);
        }
    };

    const handleClose = () => {
        setFormData(initialFormData);
        setErrors({ amount: false, date: false });
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Add Investment</DialogTitle>
            <DialogContent>
                <TextField
                    margin="dense"
                    label="Amount"
                    name="amount"
                    fullWidth
                    value={formData.amount}
                    onChange={handleInputChange}
                    error={errors.amount}
                    helperText={errors.amount ? 'Valid amount is required' : ''}
                />
                <TextField
                    margin="dense"
                    label="Date"
                    name="date"
                    type="date"
                    fullWidth
                    value={formData.date}
                    onChange={handleInputChange}
                    error={errors.date}
                    helperText={errors.date ? 'Date is required' : ''}
                    InputLabelProps={{ shrink: true }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleFormSubmit} color="primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddInvestmentDialog;
