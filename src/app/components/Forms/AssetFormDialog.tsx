import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { AssetPricingModel } from '@/domain/entities/assets/AssetPricingModel';
import { AssetValuationConfig } from '@/domain/entities/assets/AssetValuationConfig';
import { CompoundingFrequency } from '@/domain/entities/assets/CompoundingFrequency';
import { Currency } from '@/domain/entities/shared/Currency';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';

export interface AssetFormData {
  name: string;
  description: string;
  category: AssetCategory;
  currency: string;
  currentMarketValue?: number;
  valueUpdatedAt?: Date;
  valuationConfig?: AssetValuationConfig;
}

export interface AssetFormDialogProps {
  open: boolean;
  title: string;
  formData: AssetFormData;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFieldChange: (
    field: keyof AssetFormData,
    value: string | number | AssetCategory | AssetValuationConfig | Date | undefined
  ) => void;
}

export function AssetFormDialog({
  open,
  title,
  formData,
  isSubmitting,
  onClose,
  onSubmit,
  onFieldChange,
}: AssetFormDialogProps) {
  // Initialize valuation config with default values when form opens
  useEffect(() => {
    if (open && !formData.valuationConfig) {
      onFieldChange('valuationConfig', {
        pricingModel: AssetPricingModel.MARKET_BASED,
      });
    }
  }, [open, formData.valuationConfig, onFieldChange]);

  const currentModel = formData.valuationConfig?.pricingModel || AssetPricingModel.MARKET_BASED;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const handleValuationModelChange = (model: AssetPricingModel) => {
    onFieldChange('valuationConfig', {
      ...formData.valuationConfig,
      pricingModel: model,
      // Clear model-specific fields when switching models
      ...(model !== AssetPricingModel.FIXED_INCOME && {
        interestRate: undefined,
        compoundingFrequency: undefined,
      }),
      ...(model !== AssetPricingModel.MATURITY_BASED && {
        maturityAmount: undefined,
      }),
      ...(model !== AssetPricingModel.MARKET_BASED && {
        apiPath: undefined,
      }),
      // Keep maturityDate for both FIXED_INCOME and MATURITY_BASED
      ...(model === AssetPricingModel.MARKET_BASED && {
        maturityDate: undefined,
      }),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Basic Asset Information */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Asset Name"
                      value={formData.name}
                      onChange={e => onFieldChange('name', e.target.value)}
                      fullWidth
                      required
                      placeholder="e.g., Apple Inc. (AAPL)"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Description"
                      value={formData.description}
                      onChange={e => onFieldChange('description', e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Brief description of this asset"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.category}
                        label="Category"
                        onChange={e => onFieldChange('category', e.target.value as AssetCategory)}
                      >
                        {Object.values(AssetCategory).map(category => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={formData.currency}
                        label="Currency"
                        onChange={e => onFieldChange('currency', e.target.value)}
                      >
                        {Object.entries(Currency).map(([code, name]) => (
                          <MenuItem key={code} value={code}>
                            {code} - {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Valuation Configuration */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Valuation Configuration
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Valuation Model</InputLabel>
                      <Select
                        value={currentModel}
                        label="Valuation Model"
                        onChange={e =>
                          handleValuationModelChange(e.target.value as AssetPricingModel)
                        }
                      >
                        <MenuItem value={AssetPricingModel.MARKET_BASED}>
                          Market Based (Manual/API Value)
                        </MenuItem>
                        <MenuItem value={AssetPricingModel.FIXED_INCOME}>
                          Fixed Income (Interest Based)
                        </MenuItem>
                        <MenuItem value={AssetPricingModel.MATURITY_BASED}>
                          Maturity Based (Fixed Return)
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Model-Specific Fields */}
                <Box sx={{ mt: 3 }}>
                  {/* Market Based Fields */}
                  {currentModel === AssetPricingModel.MARKET_BASED && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                        Market-Based Valuation
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Current Market Value"
                            type="number"
                            value={formData.currentMarketValue || ''}
                            onChange={e =>
                              onFieldChange(
                                'currentMarketValue',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            fullWidth
                            inputProps={{
                              min: 0,
                              step: 0.01,
                            }}
                            placeholder="Enter current value (optional)"
                            helperText="Optional - can be fetched via API if configured"
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            name="valueUpdatedAt"
                            label="Value Updated Date"
                            type="date"
                            value={
                              formData.valueUpdatedAt
                                ? formData.valueUpdatedAt.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={e =>
                              onFieldChange(
                                'valueUpdatedAt',
                                e.target.value ? new Date(e.target.value) : undefined
                              )
                            }
                            fullWidth
                            InputLabelProps={{
                              shrink: true,
                            }}
                            helperText="When was the market value last updated?"
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="API Path (Optional)"
                            value={formData.valuationConfig?.apiPath || ''}
                            onChange={e =>
                              onFieldChange('valuationConfig', {
                                ...formData.valuationConfig,
                                pricingModel: AssetPricingModel.MARKET_BASED,
                                apiPath: e.target.value || undefined,
                              })
                            }
                            fullWidth
                            placeholder="e.g., /api/stocks/AAPL"
                            helperText="API endpoint path to fetch current market value per unit"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Fixed Income Fields */}
                  {currentModel === AssetPricingModel.FIXED_INCOME && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                        Fixed Income Configuration
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Interest Rate (%)"
                            type="number"
                            value={formData.valuationConfig?.interestRate || ''}
                            onChange={e =>
                              onFieldChange('valuationConfig', {
                                ...formData.valuationConfig,
                                pricingModel: AssetPricingModel.FIXED_INCOME,
                                interestRate: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            fullWidth
                            inputProps={{
                              min: 0,
                              max: 50,
                              step: 0.1,
                            }}
                            placeholder="e.g., 7.5"
                            helperText="Annual interest rate"
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Compounding Frequency</InputLabel>
                            <Select
                              value={
                                formData.valuationConfig?.compoundingFrequency ||
                                CompoundingFrequency.ANNUALLY
                              }
                              label="Compounding Frequency"
                              onChange={e =>
                                onFieldChange('valuationConfig', {
                                  ...formData.valuationConfig,
                                  pricingModel: AssetPricingModel.FIXED_INCOME,
                                  compoundingFrequency: e.target.value as CompoundingFrequency,
                                })
                              }
                            >
                              <MenuItem value={CompoundingFrequency.ANNUALLY}>Annually</MenuItem>
                              <MenuItem value={CompoundingFrequency.SEMI_ANNUALLY}>
                                Semi-Annually
                              </MenuItem>
                              <MenuItem value={CompoundingFrequency.QUARTERLY}>Quarterly</MenuItem>
                              <MenuItem value={CompoundingFrequency.MONTHLY}>Monthly</MenuItem>
                              <MenuItem value={CompoundingFrequency.DAILY}>Daily</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            name="maturityDate"
                            label="Maturity Date"
                            type="date"
                            value={
                              formData.valuationConfig?.maturityDate
                                ? formData.valuationConfig.maturityDate.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={e =>
                              onFieldChange('valuationConfig', {
                                ...formData.valuationConfig,
                                pricingModel: AssetPricingModel.FIXED_INCOME,
                                maturityDate: e.target.value ? new Date(e.target.value) : undefined,
                              })
                            }
                            fullWidth
                            InputLabelProps={{
                              shrink: true,
                            }}
                            helperText="Optional - when interest stops accruing"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Maturity Based Fields */}
                  {currentModel === AssetPricingModel.MATURITY_BASED && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                        Maturity-Based Configuration
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Maturity Amount"
                            type="number"
                            value={formData.valuationConfig?.maturityAmount || ''}
                            onChange={e =>
                              onFieldChange('valuationConfig', {
                                ...formData.valuationConfig,
                                pricingModel: AssetPricingModel.MATURITY_BASED,
                                maturityAmount: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            fullWidth
                            inputProps={{
                              min: 0,
                              step: 0.01,
                            }}
                            placeholder="Amount received at maturity"
                            helperText="Fixed amount payable at maturity"
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            name="maturityDateMaturityBased"
                            label="Maturity Date"
                            type="date"
                            value={
                              formData.valuationConfig?.maturityDate
                                ? formData.valuationConfig.maturityDate.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={e =>
                              onFieldChange('valuationConfig', {
                                ...formData.valuationConfig,
                                pricingModel: AssetPricingModel.MATURITY_BASED,
                                maturityDate: e.target.value ? new Date(e.target.value) : undefined,
                              })
                            }
                            fullWidth
                            InputLabelProps={{
                              shrink: true,
                            }}
                            helperText="When the maturity amount is paid"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? 'Saving...' : 'Save Asset'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
