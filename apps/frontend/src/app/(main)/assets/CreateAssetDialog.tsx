import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material';
import { useCreateAssetMutation } from '@/graphql/models/generated';

interface CreateAssetDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (manualValueData?: { assetId: string, manualValue: number }) => void;
}

const initialFormData = {
    name: '',
    description: '',
    category: '',
    riskLevel: '',
    currency: '',
    maturityDate: '',
    valueStrategyType: '', // 'fixed', 'dynamic', 'manual'
    growthRate: '', // for fixed
    apiSource: '', // for dynamic
    manualValue: '', // for manual
};

const CreateAssetDialog: React.FC<CreateAssetDialogProps> = ({ open, onClose, onSuccess }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({
        name: false,
        category: false,
        riskLevel: false,
        currency: false,
        valueStrategyType: false,
        growthRate: false,
        apiSource: false,
        manualValue: false,
    });
    const [createAsset, { loading }] = useCreateAssetMutation();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if ((name === 'growthRate' || name === 'manualValue') && value) {
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
            valueStrategyType: !formData.valueStrategyType,
            growthRate: false,
            apiSource: false,
            manualValue: false,
        };
        if (formData.valueStrategyType === 'fixed') {
            newErrors.growthRate = !formData.growthRate;
        }
        if (formData.valueStrategyType === 'dynamic') {
            newErrors.apiSource = !formData.apiSource;
        }
        if (formData.valueStrategyType === 'manual') {
            newErrors.manualValue = !formData.manualValue;
        }
        setErrors(newErrors);
        return !Object.values(newErrors).some((error) => error);
    };

    const handleFormSubmit = async () => {
        if (!validateForm()) return;
        // AssetInput only supports growthRate, not valueStrategy directly
        let growthRate: number | null = null;
        
        if (formData.valueStrategyType === 'fixed') {
            growthRate = parseFloat(formData.growthRate);
        }
        
        try {
            // Create the asset first
            const assetResult = await createAsset({
                variables: {
                    input: {
                        name: formData.name,
                        description: formData.description,
                        category: formData.category,
                        riskLevel: formData.riskLevel,
                        currency: formData.currency,
                        maturityDate: formData.maturityDate
                            ? new Date(formData.maturityDate).toISOString()
                            : null,
                        growthRate: growthRate,
                    },
                },
            });
        
            onSuccess();
            handleClose();
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
            valueStrategyType: false,
            growthRate: false,
            apiSource: false,
            manualValue: false,
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
                {/* Value Strategy Type */}
                <TextField
                    margin="dense"
                    label="Value Strategy"
                    name="valueStrategyType"
                    select
                    fullWidth
                    value={formData.valueStrategyType}
                    onChange={handleInputChange}
                    error={errors.valueStrategyType}
                    helperText={errors.valueStrategyType ? 'Value Strategy is required' : ''}
                >
                    <MenuItem value="fixed">Fixed</MenuItem>
                    <MenuItem value="dynamic">Dynamic</MenuItem>
                    <MenuItem value="manual">Manual</MenuItem>
                </TextField>
                {/* Show fields based on value strategy */}
                {formData.valueStrategyType === 'fixed' && (
                    <TextField
                        margin="dense"
                        label="Growth Rate (%)"
                        name="growthRate"
                        fullWidth
                        value={formData.growthRate}
                        onChange={handleInputChange}
                        error={errors.growthRate}
                        helperText={errors.growthRate ? 'Growth Rate is required' : ''}
                        placeholder="e.g., 5.25"
                    />
                )}
                {formData.valueStrategyType === 'dynamic' && (
                    <TextField
                        margin="dense"
                        label="API Source"
                        name="apiSource"
                        fullWidth
                        value={formData.apiSource}
                        onChange={handleInputChange}
                        error={errors.apiSource}
                        helperText={errors.apiSource ? 'API Source is required' : ''}
                        placeholder="e.g., https://api.example.com/value"
                    />
                )}
                {formData.valueStrategyType === 'manual' && (
                    <TextField
                        margin="dense"
                        label="Initial Value"
                        name="manualValue"
                        fullWidth
                        value={formData.manualValue}
                        onChange={handleInputChange}
                        error={errors.manualValue}
                        helperText={errors.manualValue ? 'Initial Value is required' : ''}
                        placeholder="e.g., 5000.00"
                    />
                )}
                <TextField
                    margin="dense"
                    label="Maturity Date"
                    name="maturityDate"
                    type="date"
                    fullWidth
                    value={formData.maturityDate}
                    onChange={handleInputChange}
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

export default CreateAssetDialog;