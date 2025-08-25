import { IAsset } from '@/domain/entities/assets/Asset';
import { AssetPricingModel } from '@/domain/entities/assets/AssetPricingModel';
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

// Define AssetCategory enum locally
export enum AssetCategory {
  STOCKS = 'Stocks',
  BONDS = 'Bonds',
  REAL_ESTATE = 'Real Estate',
  CRYPTO = 'Crypto',
  OTHER = 'Other',
}

export interface AssetFormDialogProps {
  open: boolean;
  title: string;
  formData: IAsset;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFieldChange: (field: keyof IAsset, value: string | number | Date | undefined) => void;
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
  const currentModel = formData.pricingModel || AssetPricingModel.MARKET_BASED;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const handleValuationModelChange = (model: AssetPricingModel) => {
    onFieldChange('pricingModel', model);
    // Clear model-specific fields when switching models
    if (model !== AssetPricingModel.FIXED_INCOME) {
      onFieldChange('interestRate', undefined);
      onFieldChange('maturityDate', undefined);
    }
    if (model !== AssetPricingModel.MATURITY_BASED) {
      onFieldChange('maturityAmount', undefined);
    }
    if (model !== AssetPricingModel.MARKET_BASED) {
      onFieldChange('apiPath', undefined);
    }
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
                            label="Market Value"
                            type="number"
                            value={formData.marketValue || ''}
                            onChange={e =>
                              onFieldChange(
                                'marketValue',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            fullWidth
                            inputProps={{
                              min: 0,
                              step: 0.01,
                            }}
                            placeholder="Enter market value"
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            name="marketValueUpdatedAt"
                            label="Market Value Updated At"
                            type="date"
                            value={
                              formData.marketValueUpdatedAt
                                ? formData.marketValueUpdatedAt.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={e =>
                              onFieldChange(
                                'marketValueUpdatedAt',
                                e.target.value ? new Date(e.target.value) : undefined
                              )
                            }
                            fullWidth
                            InputLabelProps={{
                              shrink: true,
                            }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="API Path"
                            value={formData.apiPath || ''}
                            onChange={e => onFieldChange('apiPath', e.target.value || undefined)}
                            fullWidth
                            placeholder="e.g., /api/stocks/AAPL"
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
                            value={formData.interestRate || ''}
                            onChange={e =>
                              onFieldChange(
                                'interestRate',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            fullWidth
                            inputProps={{
                              min: 0,
                              max: 50,
                              step: 0.1,
                            }}
                            placeholder="e.g., 7.5"
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            name="maturityDate"
                            label="Maturity Date"
                            type="date"
                            value={
                              formData.maturityDate
                                ? formData.maturityDate.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={e =>
                              onFieldChange(
                                'maturityDate',
                                e.target.value ? new Date(e.target.value) : undefined
                              )
                            }
                            fullWidth
                            InputLabelProps={{
                              shrink: true,
                            }}
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
                            value={formData.maturityAmount || ''}
                            onChange={e =>
                              onFieldChange(
                                'maturityAmount',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            fullWidth
                            inputProps={{
                              min: 0,
                              step: 0.01,
                            }}
                            placeholder="Amount received at maturity"
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            name="maturityDate"
                            label="Maturity Date"
                            type="date"
                            value={
                              formData.maturityDate
                                ? formData.maturityDate.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={e =>
                              onFieldChange(
                                'maturityDate',
                                e.target.value ? new Date(e.target.value) : undefined
                              )
                            }
                            fullWidth
                            InputLabelProps={{
                              shrink: true,
                            }}
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
