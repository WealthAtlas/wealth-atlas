import { ValueModel } from '@/domain/entities/assets/ValueModel';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
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
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          label="Name"
          value={asset.name}
          onChange={e => onAssetChange({ ...asset, name: e.target.value })}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Description"
          value={asset.description}
          onChange={e => onAssetChange({ ...asset, description: e.target.value })}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Category"
          value={asset.category}
          onChange={e => onAssetChange({ ...asset, category: e.target.value })}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Currency"
          value={asset.currency}
          onChange={e => onAssetChange({ ...asset, currency: e.target.value })}
          select
          fullWidth
          margin="normal"
        >
          <MenuItem value="INR">INR</MenuItem>
          <MenuItem value="USD">USD</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
        </TextField>
        <Select
          label="Pricing Model"
          value={asset.valueModel}
          onChange={e => onAssetChange({ ...asset, valueModel: e.target.value as ValueModel })}
          fullWidth
        >
          <MenuItem value={ValueModel.MARKET_BASED}>Market Based</MenuItem>
          <MenuItem value={ValueModel.FIXED_INCOME}>Fixed Income</MenuItem>
          <MenuItem value={ValueModel.MATURITY_BASED}>Maturity Based</MenuItem>
        </Select>
        {asset.valueModel === ValueModel.FIXED_INCOME && (
          <TextField
            label="Interest Rate (%)"
            value={asset.interestRate || ''}
            onChange={e => onAssetChange({ ...asset, interestRate: parseFloat(e.target.value) })}
            type="number"
            fullWidth
            margin="normal"
          />
        )}
        {asset.valueModel === ValueModel.MATURITY_BASED && (
          <>
            <TextField
              label="Maturity Date"
              value={asset.maturityDate || ''}
              onChange={e =>
                onAssetChange({
                  ...asset,
                  maturityDate: e.target.value ? new Date(e.target.value) : undefined,
                })
              }
              type="date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Maturity Amount"
              value={asset.maturityAmount || ''}
              onChange={e =>
                onAssetChange({ ...asset, maturityAmount: parseFloat(e.target.value) })
              }
              type="number"
              fullWidth
              margin="normal"
            />
          </>
        )}
        {asset.valueModel === ValueModel.MARKET_BASED && (
          <>
            <TextField
              label="Market Value"
              value={asset.marketValue || ''}
              onChange={e => onAssetChange({ ...asset, marketValue: parseFloat(e.target.value) })}
              type="number"
              fullWidth
              margin="normal"
            />
            <TextField
              label="API Path"
              value={asset.apiPath || ''}
              onChange={e => onAssetChange({ ...asset, apiPath: e.target.value })}
              fullWidth
              margin="normal"
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting} color="secondary">
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} color="primary">
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
