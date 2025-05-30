import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Select, FormControl, InputLabel, Box, Typography } from '@mui/material';
import { scriptTemplates } from '@/utils/scriptTemplates';

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
    scriptCode: string; // for dynamic - JavaScript code as string
    manualValue: string; // for manual
}

export interface AssetFormErrors {
    name: boolean;
    category: boolean;
    riskLevel: boolean;
    currency: boolean;
    valueStrategyType: boolean;
    growthRate: boolean;
    scriptCode: boolean;
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
    scriptCode: '',
    manualValue: '',
};

export const initialFormErrors: AssetFormErrors = {
    name: false,
    category: false,
    riskLevel: false,
    currency: false,
    valueStrategyType: false,
    growthRate: false,
    scriptCode: false,
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
    // State for script testing
    const [scriptTestResult, setScriptTestResult] = React.useState<number | null>(null);
    const [scriptTestError, setScriptTestError] = React.useState<string | null>(null);
    const [isTestingScript, setIsTestingScript] = React.useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if ((name === 'growthRate' || name === 'manualValue') && value) {
            const regex = /^\d*\.?\d{0,2}$/;
            if (!regex.test(value)) return;
        }
        
        // Clear test results when script code changes
        if (name === 'scriptCode') {
            setScriptTestResult(null);
            setScriptTestError(null);
        }
        
        setFormData({ ...formData, [name]: value });
    };
    
    const handleTestScript = async (scriptCode: string) => {
        if (!scriptCode.trim()) {
            setScriptTestError('Script code is empty');
            return;
        }
        
        setIsTestingScript(true);
        setScriptTestResult(null);
        setScriptTestError(null);
        
        try {
            // Dynamically import the script executor to keep bundle size small
            const { executeValueScript } = await import('@/utils/scriptExecutor');
            const result = await executeValueScript(scriptCode);
            setScriptTestResult(result);
        } catch (error) {
            console.error('Script test error:', error);
            setScriptTestError(error instanceof Error ? error.message : 'Unknown error executing script');
        } finally {
            setIsTestingScript(false);
        }
    };

    // Handle script template selection
    const handleTemplateSelect = (template: string) => {
        setFormData({ ...formData, scriptCode: template });
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
                    <>
                        <FormControl fullWidth margin="dense">
                            <InputLabel id="script-template-label">Script Template</InputLabel>
                            <Select
                                labelId="script-template-label"
                                id="script-template"
                                value=""
                                label="Script Template"
                                onChange={(e) => {
                                    const templateKey = e.target.value;
                                    if (templateKey && scriptTemplates[templateKey]) {
                                        setFormData({
                                            ...formData,
                                            scriptCode: scriptTemplates[templateKey].template
                                        });
                                    }
                                }}
                            >
                                <MenuItem value="" disabled>
                                    <em>Select a template</em>
                                </MenuItem>
                                {Object.entries(scriptTemplates).map(([key, template]) => (
                                    <MenuItem key={key} value={key}>
                                        {template.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box sx={{ mt: 2, mb: 1 }}>
                            <Typography variant="subtitle2">JavaScript Code</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Enter code that exports a getValue() function which returns the asset value
                            </Typography>
                        </Box>

                        <TextField
                            margin="dense"
                            name="scriptCode"
                            multiline
                            rows={15}
                            fullWidth
                            variant="outlined"
                            value={formData.scriptCode}
                            onChange={handleInputChange}
                            error={errors.scriptCode}
                            helperText={errors.scriptCode ? 'JavaScript code is required' : ''}
                            placeholder={`// You must export an async function called "getValue"
// The function should return a numeric value

/**
 * @returns {Promise<number>} The current value of the asset
 */
export async function getValue() {
  try {
    // Example: Make API call to fetch stock price
    const response = await fetch('https://api.example.com/stocks/AAPL');
    const data = await response.json();
    
    // You can process the data as needed
    return data.price;
  } catch (error) {
    console.error('Error fetching asset value:', error);
    throw error; // Or return a default/fallback value
  }
}`}
                            InputProps={{
                                style: { 
                                    fontFamily: 'monospace',
                                    fontSize: '14px'
                                }
                            }}
                        />
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginTop: '8px'
                        }}>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Your code will be executed in the browser to dynamically fetch the asset value.
                                You can make HTTP requests, process data, and perform calculations.
                            </div>
                            <Button 
                                variant="outlined"
                                size="small"
                                onClick={() => handleTestScript(formData.scriptCode)}
                                disabled={!formData.scriptCode || errors.scriptCode}
                            >
                                Test Script
                            </Button>
                        </div>
                        {scriptTestResult !== null && (
                            <div style={{ 
                                marginTop: '8px',
                                padding: '8px',
                                backgroundColor: scriptTestError ? '#ffebee' : '#e8f5e9',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}>
                                {scriptTestError ? (
                                    <>
                                        <span style={{ fontWeight: 'bold', color: '#c62828' }}>Error: </span>
                                        <span>{scriptTestError}</span>
                                    </>
                                ) : (
                                    <>
                                        <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>Success: </span>
                                        <span>Value returned: {scriptTestResult}</span>
                                    </>
                                )}
                            </div>
                        )}
                        {/* Script Template Selection */}
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Script Template</InputLabel>
                            <Select
                                value=""
                                onChange={(e) => handleTemplateSelect(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="" disabled>Select a template</MenuItem>
                                {Object.entries(scriptTemplates).map(([key, template]) => (
                                    <MenuItem key={key} value={template.template}>
                                        {template.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </>
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
            scriptCode: formData.scriptCode
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
        scriptCode: false,
        manualValue: false,
    };
    
    if (formData.valueStrategyType === 'fixed') {
        newErrors.growthRate = !formData.growthRate;
    }
    if (formData.valueStrategyType === 'dynamic') {
        newErrors.scriptCode = !formData.scriptCode.trim();
    }
    if (formData.valueStrategyType === 'manual') {
        newErrors.manualValue = !formData.manualValue;
    }
    
    const isValid = !Object.values(newErrors).some((error) => error);
    return [isValid, newErrors];
};

export default AssetDialogForm;
