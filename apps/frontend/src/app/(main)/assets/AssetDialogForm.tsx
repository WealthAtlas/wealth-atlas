import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material';

// Types
export interface AssetFormData {
    name: string;
    description: string;
    category: string;
    riskLevel: string;
    currency: string;
    maturityDate: string;
    valueStrategyType: string; // 'fixed', 'dynamic', 'manual'
    growthRate: string; // for fixed
    apiSource: string; // for dynamic
    manualValue: string; // for manual
}

export interface AssetFormErrors {
    name: boolean;
    category: boolean;
    riskLevel: boolean;
    currency: boolean;
    valueStrategyType: boolean;
    growthRate: boolean;
    apiSource: boolean;
    manualValue: boolean;
}

export const initialFormData: AssetFormData = {
    name: '',
    description: '',
    category: '',
    riskLevel: '',
    currency: '',
    maturityDate: '',
    valueStrategyType: '',
    growthRate: '',
    apiSource: '',
    manualValue: '',
};

export const initialFormErrors: AssetFormErrors = {
    name: false,
    category: false,
    riskLevel: false,
    currency: false,
    valueStrategyType: false,
    growthRate: false,
    apiSource: false,
    manualValue: false,
};

// We're not defining a strict AssetInput interface here to avoid type conflicts with the GraphQL types
// Each component will handle the creation of properly typed input objects

interface AssetDialogFormProps {
    open: boolean;
    onClose: () => void;
    title: string;
    submitButtonText: string;
    formData: AssetFormData;
    setFormData: React.Dispatch<React.SetStateAction<AssetFormData>>;
    errors: AssetFormErrors;
    setErrors: React.Dispatch<React.SetStateAction<AssetFormErrors>>;
    handleSubmit: () => void;
    isLoading: boolean;
}

const AssetDialogForm: React.FC<AssetDialogFormProps> = ({
    open,
    onClose,
    title,
    submitButtonText,
    formData,
    setFormData,
    errors,
    setErrors,
    handleSubmit,
    isLoading
}) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if ((name === 'growthRate' || name === 'manualValue') && value) {
            const regex = /^\d*\.?\d{0,2}$/;
            if (!regex.test(value)) return;
        }
        setFormData({ ...formData, [name]: value });
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{title}</DialogTitle>
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
                <Button onClick={onClose} disabled={isLoading}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} color="primary" disabled={isLoading}>
                    {isLoading ? 'Processing...' : submitButtonText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/**
 * Helper function to build asset input
 * Note: This function is left here for reference but we're not using it directly
 * due to type compatibility issues with GraphQL generated types.
 * Each component handles the input creation based on its specific requirements.
 */
export const buildAssetInput = (formData: AssetFormData): any => {
    const assetInput: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        riskLevel: formData.riskLevel,
        currency: formData.currency,
        maturityDate: formData.maturityDate
            ? new Date(formData.maturityDate).toISOString()
            : null,
    };

    // Set the correct value strategy based on the type
    if (formData.valueStrategyType === 'fixed') {
        assetInput.fixedValueStrategy = {
            type: 'fixed',
            growthRate: parseFloat(formData.growthRate)
        };
    } else if (formData.valueStrategyType === 'dynamic') {
        assetInput.dynamicValueStrategy = {
            type: 'dynamic',
            apiSource: formData.apiSource
        };
    } else if (formData.valueStrategyType === 'manual') {
        assetInput.manualValueStrategy = {
            type: 'manual',
            value: parseFloat(formData.manualValue)
        };
    }

    return assetInput;
};

// Validation function
export const validateAssetForm = (formData: AssetFormData): [boolean, AssetFormErrors] => {
    const newErrors: AssetFormErrors = {
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
    
    const isValid = !Object.values(newErrors).some((error) => error);
    return [isValid, newErrors];
};

export default AssetDialogForm;
