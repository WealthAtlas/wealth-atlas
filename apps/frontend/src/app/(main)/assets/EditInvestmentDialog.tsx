import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useUpdateInvestmentMutation } from '@/graphql/models/generated';

// Define our own type that matches the data we get from the query
interface Investment {
  id: string;
  date: string | Date;
  qty: number | null;
  valuePerQty: number;
  amount?: number;
}

interface EditInvestmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    investment: Investment | null;
    currency: string;
}

const EditInvestmentDialog: React.FC<EditInvestmentDialogProps> = ({ 
    open, 
    onClose, 
    onSuccess, 
    investment,
    currency 
}) => {
    const [formData, setFormData] = useState({
        date: '',
        qty: '',
        valuePerQty: ''
    });

    const [errors, setErrors] = useState({
        date: false,
        valuePerQty: false
    });
    
    const [updateInvestment, { loading }] = useUpdateInvestmentMutation();
    
    // Get notification context
    const { showNotification } = useNotification();

    // Initialize form data when investment changes
    useEffect(() => {
        if (investment) {
            setFormData({
                date: investment.date ? new Date(investment.date).toISOString().substring(0, 10) : '',
                qty: investment.qty?.toString() || '1',
                valuePerQty: investment.valuePerQty?.toString() || '0'
            });
        }
    }, [investment]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const validateForm = () => {
        const newErrors = {
            date: !formData.date,
            valuePerQty: !formData.valuePerQty || isNaN(Number(formData.valuePerQty)) || Number(formData.valuePerQty) < 0
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(Boolean);
    };

    const handleFormSubmit = async () => {
        if (!validateForm() || !investment) return;
        
        try {
            await updateInvestment({
                variables: {
                    investmentId: investment.id,
                    input: {
                        date: new Date(formData.date),
                        qty: formData.qty ? parseFloat(formData.qty) : null,
                        valuePerQty: parseFloat(formData.valuePerQty)
                    },
                },
            });
            onSuccess();
            showNotification(`Investment updated successfully`, 'success');
            handleClose();
        } catch (err) {
            console.error('Error updating investment:', err);
            showNotification(`Failed to update investment: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };

    const handleClose = () => {
        setErrors({ date: false, valuePerQty: false });
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Investment</DialogTitle>
            <DialogContent>
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
                
                <TextField
                    margin="dense"
                    label="Quantity"
                    name="qty"
                    type="number"
                    fullWidth
                    value={formData.qty}
                    onChange={handleInputChange}
                    helperText="Leave as 1 if not applicable"
                    InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                    margin="dense"
                    label={`Value per Quantity (${currency})`}
                    name="valuePerQty"
                    type="number"
                    fullWidth
                    value={formData.valuePerQty}
                    onChange={handleInputChange}
                    error={errors.valuePerQty}
                    helperText={errors.valuePerQty ? 'Valid value is required' : ''}
                    InputLabelProps={{ shrink: true }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleFormSubmit} color="primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Investment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditInvestmentDialog;
