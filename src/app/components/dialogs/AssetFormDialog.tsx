import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import { Currency } from '@/domain/entities/shared/Currency';
import { executeValueScript } from '@/domain/utils/ScriptExecutor';
import { scriptTemplates } from '@/domain/utils/ScriptTemplate';
import { ExpandLess, ExpandMore, PlayArrow } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
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

interface ScriptTestResult {
  success: boolean;
  value?: number;
  error?: string;
}

export function AssetFormDialog({
  open,
  title,
  asset,
  isSubmitting,
  onClose,
  onSubmit,
  onAssetChange,
}: AssetFormDialogProps) {
  // Responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for script functionality
  const [scriptSectionOpen, setScriptSectionOpen] = useState(false);
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<ScriptTestResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Script testing functionality
  const handleTestScript = async () => {
    if (!asset.script || asset.script.trim() === '') {
      setScriptTestResult({
        success: false,
        error: 'No script to test. Please enter a script first.',
      });
      return;
    }

    setIsTestingScript(true);
    setScriptTestResult(null);

    try {
      const value = await executeValueScript(asset.script);
      setScriptTestResult({
        success: true,
        value,
      });
    } catch (error) {
      setScriptTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsTestingScript(false);
    }
  };

  // Template selection functionality - simple replace
  const handleTemplateSelection = (templateKey: string) => {
    if (!templateKey) return;

    const template = scriptTemplates[templateKey as keyof typeof scriptTemplates];
    if (template) {
      onAssetChange({ ...asset, script: template.template });
      setScriptTestResult(null);
    }
    setSelectedTemplate('');
  };

  // Simple script validation
  const validateScript = (script: string): string | null => {
    if (!script || script.trim() === '') return null;

    // Basic validation - check if it contains getValue export
    if (!script.includes('getValue')) {
      return 'Script should export a getValue function';
    }

    return null;
  };

  // Clear script test results when script changes
  const handleScriptChange = (newScript: string) => {
    onAssetChange({ ...asset, script: newScript === '' ? undefined : newScript });
    setScriptTestResult(null);
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
                helperText="Leave empty if using script for live market data"
              />

              {/* Advanced Scripting Section */}
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => setScriptSectionOpen(!scriptSectionOpen)}
                  startIcon={scriptSectionOpen ? <ExpandLess /> : <ExpandMore />}
                  fullWidth
                  sx={{
                    justifyContent: 'space-between',
                    textTransform: 'none',
                    color: 'text.secondary',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      Advanced Scripting{' '}
                      {asset.script && asset.script.trim() !== '' ? '(configured)' : ''}
                    </Typography>
                  </Box>
                </Button>

                <Collapse in={scriptSectionOpen}>
                  <Box sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Write custom JavaScript to fetch live market data from APIs. The script must
                      export a getValue() function that returns a number.
                    </Typography>

                    {/* Template Selection */}
                    <FormControl fullWidth margin="normal" size="small">
                      <InputLabel>Choose Template (Optional)</InputLabel>
                      <Select
                        value={selectedTemplate}
                        label="Choose Template (Optional)"
                        onChange={e => handleTemplateSelection(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>No template - write custom script</em>
                        </MenuItem>
                        {Object.entries(scriptTemplates).map(([key, template]) => (
                          <MenuItem key={key} value={key}>
                            {template.name} - {template.description}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Script Editor */}
                    <TextField
                      label="JavaScript Code"
                      value={asset.script || ''}
                      onChange={e => handleScriptChange(e.target.value)}
                      fullWidth
                      margin="normal"
                      multiline
                      rows={isMobile ? 6 : 10}
                      placeholder="// Example:
// exports.getValue = async function() {
//   const response = await fetch('https://api.example.com/price');
//   const data = await response.json();
//   return data.price;
// };"
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          lineHeight: 1.4,
                        },
                      }}
                      helperText={
                        validateScript(asset.script || '') ||
                        'Script must export getValue() function that returns a number'
                      }
                      error={!!validateScript(asset.script || '')}
                    />

                    {/* Simple Script Test Results */}
                    {scriptTestResult && (
                      <Alert
                        severity={scriptTestResult.success ? 'success' : 'error'}
                        sx={{ mt: 2 }}
                        onClose={() => setScriptTestResult(null)}
                      >
                        {scriptTestResult.success ? (
                          <Typography variant="body2">
                            Success! Value:{' '}
                            <strong>{scriptTestResult.value?.toLocaleString()}</strong>
                          </Typography>
                        ) : (
                          <Typography variant="body2">Error: {scriptTestResult.error}</Typography>
                        )}
                      </Alert>
                    )}

                    {/* Simple Script Actions */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleTestScript}
                        disabled={isTestingScript || !asset.script || asset.script.trim() === ''}
                        startIcon={isTestingScript ? <CircularProgress size={16} /> : <PlayArrow />}
                      >
                        {isTestingScript ? 'Testing...' : 'Test'}
                      </Button>
                    </Box>
                  </Box>
                </Collapse>
              </Box>
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
}
