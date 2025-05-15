import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material';
import { useCreateAssetMutation } from '@/graphql/models/generated';

interface CreateAssetDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const initialFormData = {
    name: '',
    description: '',
    category: '',
    riskLevel: '',
    growthRate: '',
    maturityDate: '',
    currency: '',
};

const CreateAssetDialog: React.FC<CreateAssetDialogProps> = ({ open, onClose, onSuccess }) => {
    const [formData, setFormData] = useState(initialFormData);

    const [errors, setErrors] = useState({
        name: false,
        category: false,
        riskLevel: false,
        currency: false,
    });

    const [createAsset, { loading }] = useCreateAssetMutation();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'growthRate' && value) {
            const regex = /^\d*\.?\d{0,2}$/;
            if (!regex.test(value)) return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const validateForm = () => {
        const newErrors = {
            name: !formData.name.trim(),
            category: !formData.category,
            riskLevel: !formData.riskLevel,
            currency: !formData.currency,
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some((error) => error);
    };

    const handleFormSubmit = async () => {
        if (!validateForm()) return;

        try {
            await createAsset({
                variables: {
                    input: {
                        ...formData,
                        maturityDate: formData.maturityDate
                            ? new Date(formData.maturityDate).toISOString()
                            : null,
                        currency: formData.currency,
                        growthRate: formData.growthRate
                            ? parseFloat(formData.growthRate)
                            : null,
                    },
                },
            });
            onSuccess(); // Trigger the callback to refresh the asset list
            handleClose(); // Close the dialog
        } catch (err) {
            console.error('Error creating asset:', err);
        }
    };

    const handleClose = () => {
        setFormData(initialFormData);
        setErrors({
            name: false,
            category: false,
            riskLevel: false,
            currency: false,
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Add Asset</DialogTitle>
            <DialogContent>
                <TextField
                    margin="dense"
                    label="Name"
                    name="name"
                    fullWidth
                    value={formData.name}
                    onChange={handleInputChange}
                    error={errors.name}
                    helperText={errors.name ? 'Name is required' : ''}
                />
                <TextField
                    margin="dense"
                    label="Description"
                    name="description"
                    fullWidth
                    value={formData.description}
                    onChange={handleInputChange}
                />
                <TextField
                    margin="dense"
                    label="Category"
                    name="category"
                    select
                    fullWidth
                    value={formData.category}
                    onChange={handleInputChange}
                    error={errors.category}
                    helperText={errors.category ? 'Category is required' : ''}
                >
                    <MenuItem value="BOND">BOND</MenuItem>
                    <MenuItem value="STOCK">STOCK</MenuItem>
                    <MenuItem value="DEPOSIT">DEPOSIT</MenuItem>
                </TextField>
                <TextField
                    margin="dense"
                    label="Risk Level"
                    name="riskLevel"
                    select
                    fullWidth
                    value={formData.riskLevel}
                    onChange={handleInputChange}
                    error={errors.riskLevel}
                    helperText={errors.riskLevel ? 'Risk Level is required' : ''}
                >
                    <MenuItem value="LOW">LOW</MenuItem>
                    <MenuItem value="MEDIUM">MEDIUM</MenuItem>
                    <MenuItem value="HIGH">HIGH</MenuItem>
                </TextField>
                <TextField
                    margin="dense"
                    label="Currency"
                    name="currency"
                    select
                    fullWidth
                    value={formData.currency}
                    onChange={handleInputChange}
                    error={errors.currency}
                    helperText={errors.currency ? 'Currency is required' : ''}
                >
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="INR">INR</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                    <MenuItem value="JPY">JPY</MenuItem>
                </TextField>
                <TextField
                    margin="dense"
                    label="Growth Rate"
                    name="growthRate"
                    fullWidth
                    value={formData.growthRate}
                    onChange={handleInputChange}
                    placeholder="e.g., 5.25"
                />
                <TextField
                    margin="dense"
                    label="Maturity Date"
                    name="maturityDate"
                    type="date"
                    fullWidth
                    value={formData.maturityDate}
                    onChange={handleInputChange}
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

export default CreateAssetDialog;