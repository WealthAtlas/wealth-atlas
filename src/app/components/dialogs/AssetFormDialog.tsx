import { validateAsset } from '@/domain/validation/EntityValidators';
import { isValid } from '@/domain/validation/ValidationIssue';
import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import { Currency, getCurrencySymbol } from '@/domain/entities/shared/Currency';
import { executeValueScript } from '@/domain/utils/ScriptExecutor';
import { scriptTemplates } from '@/domain/utils/ScriptTemplate';
import {
  AccountBalance,
  Code,
  ExpandLess,
  ExpandMore,
  PlayArrow,
  TrendingUp,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { UIUtils } from '../../utils/UIUtils';

export interface AssetFormDialogProps {
  open: boolean;
  title: string;
  asset: IAsset;
  /** Codes the user has configured; the picker offers these. */
  currencies: Currency[];
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
  currencies,
  asset,
  isSubmitting,
  onClose,
  onSubmit,
  onAssetChange,
}: AssetFormDialogProps) {
  const isFormValid = isValid(validateAsset(asset));

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Script functionality state
  const [scriptSectionOpen, setScriptSectionOpen] = useState(false);
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<ScriptTestResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');

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

  // Template selection functionality
  const handleTemplateSelection = (templateKey: string) => {
    if (!templateKey) return;

    const template = scriptTemplates[templateKey as keyof typeof scriptTemplates];
    if (template) {
      onAssetChange({ ...asset, script: template.template });
      setScriptTestResult(null);
    }
    setSelectedTemplate('');
  };

  // Script validation
  const validateScript = (script: string): string | null => {
    if (!script || script.trim() === '') return null;
    if (!script.includes('getValue')) {
      return 'Script should export a getValue function';
    }
    return null;
  };

  const handleScriptChange = (newScript: string) => {
    onAssetChange({ ...asset, script: newScript === '' ? undefined : newScript });
    setScriptTestResult(null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>
        <Typography variant="h5" component="div">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Configure your asset with valuation model and pricing details
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pb: 0 }}>
        <Box sx={{ mt: 2 }}>
          {/* Basic Information Section */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccountBalance color="primary" />
                <Typography variant="h6" color="primary">
                  Basic Information
                </Typography>
              </Box>

              <TextField
                label="Asset Name"
                value={asset.name}
                onChange={e => onAssetChange({ ...asset, name: e.target.value })}
                fullWidth
                margin="normal"
                required
                placeholder="e.g., Axis Bluechip Fund, HDFC Bank Stock"
                error={asset.name.trim() === ''}
                helperText={asset.name.trim() === '' ? 'Asset name is required' : ''}
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

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <FormControl fullWidth required>
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

                <FormControl fullWidth required>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={asset.currency}
                    label="Currency"
                    onChange={e =>
                      onAssetChange({ ...asset, currency: e.target.value as Currency })
                    }
                  >
                    {currencies.map(code => (
                      <MenuItem key={code} value={code}>
                        {code} - {getCurrencySymbol(code)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* Valuation Model Section */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp color="primary" />
                <Typography variant="h6" color="primary">
                  Valuation Model
                </Typography>
              </Box>

              <FormControl fullWidth margin="normal" required>
                <InputLabel>Pricing Model</InputLabel>
                <Select
                  value={asset.valueModel}
                  label="Pricing Model"
                  onChange={e =>
                    onAssetChange({ ...asset, valueModel: e.target.value as ValueModel })
                  }
                >
                  <MenuItem value={ValueModel.MARKET_BASED}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Market Based
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Current market value (Stocks, Mutual Funds, REITs)
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value={ValueModel.FIXED_INCOME}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Fixed Income
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Calculated from interest rate (Fixed Deposits, Bonds)
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value={ValueModel.MATURITY_BASED}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Maturity Based
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fixed maturity amount (Insurance, Endowments)
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Conditional Fields Based on Value Model */}
              {asset.valueModel === ValueModel.FIXED_INCOME && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    color="primary.main"
                    sx={{ fontWeight: 600 }}
                  >
                    Fixed Income Configuration
                  </Typography>
                  <TextField
                    label="Annual Interest Rate (%)"
                    value={asset.interestRate || ''}
                    onChange={e =>
                      onAssetChange({
                        ...asset,
                        interestRate: parseFloat(e.target.value) || undefined,
                      })
                    }
                    type="number"
                    fullWidth
                    margin="normal"
                    required
                    placeholder="e.g., 7.5"
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    error={!asset.interestRate || asset.interestRate <= 0}
                    helperText="Enter the annual interest rate for this fixed income instrument"
                  />
                </Box>
              )}

              {asset.valueModel === ValueModel.MATURITY_BASED && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    color="warning.main"
                    sx={{ fontWeight: 600 }}
                  >
                    Maturity Configuration
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                    <TextField
                      label="Maturity Date"
                      value={UIUtils.formatDateForInput(asset.maturityDate)}
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
                      error={!asset.maturityDate}
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
                      error={!asset.maturityAmount || asset.maturityAmount <= 0}
                      helperText="Expected amount to be received at maturity"
                    />
                  </Box>
                </Box>
              )}

              {asset.valueModel === ValueModel.MARKET_BASED && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    color="success.main"
                    sx={{ fontWeight: 600 }}
                  >
                    Market-Based Configuration
                  </Typography>
                  <TextField
                    label="Current Market Value (Optional)"
                    value={asset.manualValue || ''}
                    onChange={e =>
                      onAssetChange({
                        ...asset,
                        manualValue: parseFloat(e.target.value) || undefined,
                        manualValueUpdatedAt: new Date(),
                      })
                    }
                    type="number"
                    fullWidth
                    margin="normal"
                    placeholder="Current market price per unit"
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Leave empty to configure live market data below, or enter a fixed market value"
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Advanced Scripting Section - Only for Market Based */}
          {asset.valueModel === ValueModel.MARKET_BASED && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Code color="primary" />
                  <Typography variant="h6" color="primary">
                    Live Market Data (Advanced)
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  Configure JavaScript code to automatically fetch live market prices from APIs.
                  This is optional - you can leave this empty and manually update market values.
                </Typography>

                <Button
                  variant="outlined"
                  onClick={() => setScriptSectionOpen(!scriptSectionOpen)}
                  startIcon={scriptSectionOpen ? <ExpandLess /> : <ExpandMore />}
                  fullWidth
                  sx={{
                    mb: 2,
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    py: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">JavaScript Configuration</Typography>
                    {asset.script && asset.script.trim() !== '' && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          bgcolor: 'success.main',
                          color: 'success.contrastText',
                          borderRadius: 0.5,
                          fontSize: '0.75rem',
                        }}
                      >
                        Configured
                      </Box>
                    )}
                  </Box>
                </Button>

                <Collapse in={scriptSectionOpen}>
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'grey.50',
                    }}
                  >
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
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {template.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {template.description}
                              </Typography>
                            </Box>
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
                      rows={isMobile ? 8 : 10}
                      placeholder="// Example:
// exports.getValue = async function() {
//   const response = await fetch('https://api.example.com/price');
//   const data = await response.json();
//   return data.price;
// };"
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          lineHeight: 1.5,
                        },
                      }}
                      helperText={
                        validateScript(asset.script || '') ||
                        'Script must export a getValue() function that returns a number'
                      }
                      error={!!validateScript(asset.script || '')}
                    />

                    {/* Script Testing */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleTestScript}
                        disabled={isTestingScript || !asset.script || asset.script.trim() === ''}
                        startIcon={isTestingScript ? <CircularProgress size={16} /> : <PlayArrow />}
                      >
                        {isTestingScript ? 'Testing...' : 'Test Script'}
                      </Button>
                    </Box>

                    {/* Test Results */}
                    {scriptTestResult && (
                      <Alert
                        severity={scriptTestResult.success ? 'success' : 'error'}
                        sx={{ mt: 2 }}
                        onClose={() => setScriptTestResult(null)}
                      >
                        {scriptTestResult.success ? (
                          <Typography variant="body2">
                            Success! Retrieved value:{' '}
                            <strong>{scriptTestResult.value?.toLocaleString()}</strong>
                          </Typography>
                        ) : (
                          <Typography variant="body2">Error: {scriptTestResult.error}</Typography>
                        )}
                      </Alert>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          variant="outlined"
          color="secondary"
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !isFormValid}
          variant="contained"
          color="primary"
          sx={{ minWidth: 120 }}
        >
          {isSubmitting ? 'Saving...' : 'Save Asset'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
