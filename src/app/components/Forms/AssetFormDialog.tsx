import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { AssetPricingConfig } from '@/domain/entities/assets/AssetPricingConfig';
import { AssetPricingModel } from '@/domain/entities/assets/AssetPricingModel';
import { CompoundingFrequency } from '@/domain/entities/assets/CompoundingFrequency';
import { Currency } from '@/domain/entities/shared/Currency';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

export interface AssetFormData {
  name: string;
  description: string;
  category: AssetCategory;
  currency: string;
  currentMarketValue?: number;
  pricingConfig?: AssetPricingConfig;
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
    value: string | number | AssetCategory | AssetPricingConfig | undefined
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
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
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

              <Grid item xs={12}>
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
                  helperText={
                    formData.pricingConfig?.pricingModel === AssetPricingModel.MARKET_BASED
                      ? 'Required for market-based assets'
                      : 'Optional - can be calculated for fixed income and maturity-based assets'
                  }
                />
              </Grid>

              {/* Pricing Configuration Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Valuation Configuration
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Pricing Model</InputLabel>
                  <Select
                    value={formData.pricingConfig?.pricingModel || AssetPricingModel.MARKET_BASED}
                    label="Pricing Model"
                    onChange={e => {
                      const pricingModel = e.target.value as AssetPricingModel;
                      onFieldChange('pricingConfig', {
                        ...formData.pricingConfig,
                        pricingModel,
                      });
                    }}
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

              {/* Fixed Income Fields */}
              <Collapse
                in={formData.pricingConfig?.pricingModel === AssetPricingModel.FIXED_INCOME}
              >
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Interest Rate (%)"
                      type="number"
                      value={formData.pricingConfig?.interestRate || ''}
                      onChange={e =>
                        onFieldChange('pricingConfig', {
                          ...formData.pricingConfig,
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
                          formData.pricingConfig?.compoundingFrequency ||
                          CompoundingFrequency.ANNUALLY
                        }
                        label="Compounding Frequency"
                        onChange={e =>
                          onFieldChange('pricingConfig', {
                            ...formData.pricingConfig,
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
                        formData.pricingConfig?.maturityDate
                          ? formData.pricingConfig.maturityDate.toISOString().split('T')[0]
                          : ''
                      }
                      onChange={e =>
                        onFieldChange('pricingConfig', {
                          ...formData.pricingConfig,
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
              </Collapse>

              {/* Maturity Based Fields */}
              <Collapse
                in={formData.pricingConfig?.pricingModel === AssetPricingModel.MATURITY_BASED}
              >
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Maturity Amount"
                      type="number"
                      value={formData.pricingConfig?.maturityAmount || ''}
                      onChange={e =>
                        onFieldChange('pricingConfig', {
                          ...formData.pricingConfig,
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
                        formData.pricingConfig?.maturityDate
                          ? formData.pricingConfig.maturityDate.toISOString().split('T')[0]
                          : ''
                      }
                      onChange={e =>
                        onFieldChange('pricingConfig', {
                          ...formData.pricingConfig,
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
              </Collapse>
            </Grid>
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
