import { AssetCategory } from '@/domain/entities/AssetCategory';
import { Currency } from '@/domain/entities/Currency';
import {
  Box,
  Button,
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
} from '@mui/material';

export interface AssetFormData {
  name: string;
  description: string;
  category: AssetCategory;
  currency: string;
  currentMarketValue?: number;
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
    value: string | number | AssetCategory | undefined
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
                  helperText="You can update this later or leave empty if not known"
                />
              </Grid>
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
