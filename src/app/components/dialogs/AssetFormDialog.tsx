import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import { Currency } from '@/domain/entities/shared/Currency';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';
import { IAsset } from '../../../domain/entities/assets/Asset';

export interface AssetFormDialogProps {
  open: boolean;
  title: string;
  asset: IAsset;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onAssetChange: (asset: IAsset) => void;
}

export const AssetFormDialog: React.FC<AssetFormDialogProps> = ({
  open,
  title,
  asset,
  isSubmitting,
  onClose,
  onSubmit,
  onAssetChange,
}) => {
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {/* Basic Information Section */}
          <Typography variant="h6" color="primary" gutterBottom>
            Basic Information
          </Typography>

          <TextField
            label="Asset Name"
            value={asset.name}
            onChange={e => onAssetChange({ ...asset, name: e.target.value })}
            fullWidth
            margin="normal"
            required
            placeholder="e.g., Axis Bluechip Fund, HDFC Bank Stock"
          />

          <TextField
            label="Description"
            value={asset.description}
            onChange={e => onAssetChange({ ...asset, description: e.target.value })}
            fullWidth
            margin="normal"
            multiline
            rows={2}
            placeholder="Optional details about this asset"
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Category</InputLabel>
            <Select
              value={asset.category}
              label="Category"
              onChange={e => onAssetChange({ ...asset, category: e.target.value })}
            >
              {Object.values(AssetCategory).map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Currency</InputLabel>
            <Select
              value={asset.currency}
              label="Currency"
              onChange={e => onAssetChange({ ...asset, currency: e.target.value })}
            >
              {Object.entries(Currency).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  {key} - {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {/* Valuation Model Section */}
          <Typography variant="h6" color="primary" gutterBottom>
            Valuation Model
          </Typography>

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Pricing Model</InputLabel>
            <Select
              value={asset.valueModel}
              label="Pricing Model"
              onChange={e => onAssetChange({ ...asset, valueModel: e.target.value as ValueModel })}
            >
              <MenuItem value={ValueModel.MARKET_BASED}>
                Market Based - Current market value (Stocks, MFs, REITs)
              </MenuItem>
              <MenuItem value={ValueModel.FIXED_INCOME}>
                Fixed Income - Calculated from interest rate (FDs, Bonds)
              </MenuItem>
              <MenuItem value={ValueModel.MATURITY_BASED}>
                Maturity Based - Fixed maturity amount (Insurance, Endowments)
              </MenuItem>
            </Select>
          </FormControl>

          {/* Conditional Fields Based on Value Model */}
          {asset.valueModel === ValueModel.FIXED_INCOME && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Fixed Income Details
              </Typography>
              <TextField
                label="Annual Interest Rate (%)"
                value={asset.interestRate || ''}
                onChange={e =>
                  onAssetChange({ ...asset, interestRate: parseFloat(e.target.value) || undefined })
                }
                type="number"
                fullWidth
                margin="normal"
                required
                placeholder="e.g., 7.5"
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Box>
          )}

          {asset.valueModel === ValueModel.MATURITY_BASED && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Maturity Details
              </Typography>
              <TextField
                label="Maturity Date"
                value={formatDateForInput(asset.maturityDate)}
                onChange={e =>
                  onAssetChange({
                    ...asset,
                    maturityDate: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
                type="date"
                fullWidth
                margin="normal"
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Maturity Amount"
                value={asset.maturityAmount || ''}
                onChange={e =>
                  onAssetChange({
                    ...asset,
                    maturityAmount: parseFloat(e.target.value) || undefined,
                  })
                }
                type="number"
                fullWidth
                margin="normal"
                required
                placeholder="Final amount at maturity"
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>
          )}

          {asset.valueModel === ValueModel.MARKET_BASED && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Market-Based Details
              </Typography>
              <TextField
                label="Current Market Value (Optional)"
                value={asset.marketValue || ''}
                onChange={e =>
                  onAssetChange({ ...asset, marketValue: parseFloat(e.target.value) || undefined })
                }
                type="number"
                fullWidth
                margin="normal"
                placeholder="Current market price per unit"
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Leave empty if using API integration"
              />
              <TextField
                label="API Path (Optional)"
                value={asset.apiPath || ''}
                onChange={e => onAssetChange({ ...asset, apiPath: e.target.value })}
                fullWidth
                margin="normal"
                placeholder="API endpoint for live market data"
                helperText="For automatic price updates"
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={isSubmitting} variant="outlined" color="secondary">
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} variant="contained" color="primary">
          {isSubmitting ? 'Submitting...' : 'Save Asset'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
