import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material';
import { useCreateAssetMutation } from '@/graphql/models/generated';

interface CreateAssetDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateAssetDialog: React.FC<CreateAssetDialogProps> = ({ open, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        riskLevel: '',
        growthRate: '',
        maturityDate: '',
    });

    const [errors, setErrors] = useState({
        name: false,
        category: false,
        riskLevel: false,
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
                        currency: 'USD',
                        growthRate: formData.growthRate
                            ? parseFloat(formData.growthRate)
                            : null,
                    },
                },
            });
            onSuccess(); // Trigger the callback to refresh the asset list
            onClose(); // Close the dialog
        } catch (err) {
            console.error('Error creating asset:', err);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
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
                    InputLabelProps={{ shrink: true }}
                    value={formData.maturityDate}
                    onChange={handleInputChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
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