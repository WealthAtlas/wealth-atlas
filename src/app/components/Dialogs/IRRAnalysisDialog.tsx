import { IRRAnalysis } from '@/domain/services/IRRAnalysisService';
import { CheckCircle, Close, Info, TrendingUp, Warning } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export interface IRRAnalysisDialogProps {
  isOpen: boolean;
  loanName: string;
  analysis: IRRAnalysis;
  onClose: () => void;
}

export function IRRAnalysisDialog({ isOpen, loanName, analysis, onClose }: IRRAnalysisDialogProps) {
  const getRiskIcon = () => {
    switch (analysis.riskLevel) {
      case 'LOW':
        return <CheckCircle color="success" />;
      case 'MEDIUM':
        return <Warning color="warning" />;
      case 'HIGH':
        return <Warning color="error" />;
      default:
        return <Info />;
    }
  };

  const getRiskColor = (): 'success' | 'warning' | 'error' => {
    switch (analysis.riskLevel) {
      case 'LOW':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'error';
      default:
        return 'warning';
    }
  };

  const formatPercentage = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp />
            IRR Analysis - {loanName}
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Annual Rate
                </Typography>
                <Typography variant="h4" color="primary">
                  {formatPercentage(analysis.annualizedRate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analysis.isReliable ? 'Reliable calculation' : 'Preliminary estimate'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Level
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {getRiskIcon()}
                  <Chip label={analysis.riskLevel} color={getRiskColor()} size="medium" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Based on rate and payment patterns
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Interest
                </Typography>
                <Typography variant="h4" color="secondary">
                  {formatCurrency(analysis.totalInterestAmount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analysis.paymentPeriods} payment periods
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Detailed Analysis Table */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Detailed Analysis
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Annualized Interest Rate</TableCell>
                  <TableCell align="right">{formatPercentage(analysis.annualizedRate)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Monthly Interest Rate</TableCell>
                  <TableCell align="right">{formatPercentage(analysis.monthlyRate)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Effective Annual Rate (EAR)</TableCell>
                  <TableCell align="right">
                    {formatPercentage(analysis.effectiveAnnualRate)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Payment Periods Analyzed</TableCell>
                  <TableCell align="right">{analysis.paymentPeriods}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Interest Amount</TableCell>
                  <TableCell align="right">
                    {formatCurrency(analysis.totalInterestAmount)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Calculation Reliability</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={analysis.isReliable ? 'High' : 'Low'}
                      color={analysis.isReliable ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Grid>

          {/* Risk Factors */}
          {analysis.riskFactors.length > 0 && (
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Warning color="warning" />
                Risk Factors
              </Typography>
              <Card elevation={1} sx={{ bgcolor: 'warning.50' }}>
                <CardContent>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {analysis.riskFactors.map((factor, index) => (
                      <Typography
                        key={index}
                        component="li"
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {factor}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Methodology Explanation */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              About IRR Analysis
            </Typography>
            <Card elevation={1} sx={{ bgcolor: 'grey.50' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Internal Rate of Return (IRR)</strong> is calculated using the
                  Newton-Raphson method to find the rate that makes the Net Present Value (NPV) of
                  all cash flows equal to zero.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Cash flows include:</strong> Initial loan disbursement (negative) and all
                  payments made (positive). The calculation considers the exact timing of each
                  payment.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Reliability factors:</strong> More payment history, longer time periods,
                  and consistent payment patterns increase calculation accuracy.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
