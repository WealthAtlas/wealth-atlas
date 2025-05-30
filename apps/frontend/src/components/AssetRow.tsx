import { AssetDTO } from '@/graphql/models/generated';
import { Card, Box, Typography, Stack, Divider, Button, Tooltip, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import React from 'react';

interface AssetRowProps {
    asset: AssetDTO;
    onAddInvestment: () => void;
    onViewInvestments: () => void;
    onCreateSIP: () => void;
    onViewSIPs: () => void;
    onEdit: () => void;
}

const AssetRow: React.FC<AssetRowProps> = ({ asset, onAddInvestment, onViewInvestments, onCreateSIP, onViewSIPs, onEdit }) => {
    return (
        <Card
            sx={{
                display: 'flex',
                alignItems: 'center',
                px: 3,
                py: 2,
                borderRadius: 3,
                boxShadow: 3,
                minHeight: 90,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 6 },
            }}
        >
            {/* Left: Asset Info */}
            <Box sx={{ flex: 2, minWidth: 200 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            {asset.name}
                        </Typography>
                        
                        {/* Growth indicator */}
                        {asset.currentValue && (
                            <Tooltip title={
                                asset.currentValue > asset.investedAmount 
                                    ? "Asset is growing" 
                                    : asset.currentValue < asset.investedAmount 
                                        ? "Asset is decreasing" 
                                        : "No change"
                            }>
                                <Box component="span">
                                    {asset.currentValue > asset.investedAmount && (
                                        <TrendingUpIcon color="success" fontSize="small" />
                                    )}
                                    {asset.currentValue < asset.investedAmount && (
                                        <TrendingDownIcon color="error" fontSize="small" />
                                    )}
                                    {asset.currentValue === asset.investedAmount && (
                                        <TrendingFlatIcon color="info" fontSize="small" />
                                    )}
                                </Box>
                            </Tooltip>
                        )}
                    </Box>
                    <Button 
                        size="small" 
                        color="primary"
                        onClick={onEdit}
                        sx={{ minWidth: 32, height: 32, padding: '4px 8px' }}
                    >
                        Edit
                    </Button>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip 
                        label={asset.category} 
                        size="small" 
                        variant="outlined" 
                        sx={{ fontSize: '0.75rem' }} 
                    />
                    <Chip 
                        label={asset.riskLevel} 
                        size="small" 
                        color={
                            asset.riskLevel?.toLowerCase().includes('high') ? 'error' :
                            asset.riskLevel?.toLowerCase().includes('medium') ? 'warning' : 'success'
                        }
                        sx={{ fontSize: '0.75rem' }} 
                    />
                </Stack>
            </Box>
            {/* Center: Value Strategy & Maturity */}
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <Box sx={{ flex: 1, textAlign: 'center', minWidth: 120 }}>
                {/* Display value strategy information if available */}
                {(asset as any).valueStrategy && (
                    <Typography variant="caption" color="info.main" sx={{ display: 'block', fontWeight: 500 }}>
                        {(asset as any).valueStrategy.type === 'fixed' && (
                            <>Growth Rate: {(asset as any).valueStrategy.growthRate}%</>
                        )}
                        {(asset as any).valueStrategy.type === 'dynamic' && (
                            <>Dynamic API Source</>
                        )}
                        {(asset as any).valueStrategy.type === 'manual' && (
                            <>Manual Value</>
                        )}
                    </Typography>
                )}
                
                {asset.maturityDate && (
                    <Typography variant="caption" color="text.secondary">
                        Maturity: {new Date(asset.maturityDate).toLocaleDateString()}
                    </Typography>
                )}
                <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
                    onClick={onViewInvestments}
                >
                    View Investments
                </Button>
            </Box>
            {/* Right: Amounts & Action */}
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <Box sx={{ flex: 2, textAlign: 'right', minWidth: 200 }}>
                <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
                    {/* Financial metrics */}
                    <Box>
                        <Stack spacing={1}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Invested
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {asset.currency} {asset.investedAmount.toLocaleString()}
                                </Typography>
                            </Box>
                            
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Current
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={600} color={
                                    !asset.currentValue ? 'text.secondary' :
                                    asset.currentValue > asset.investedAmount ? 'success.main' : 
                                    asset.currentValue < asset.investedAmount ? 'error.main' : 'info.main'
                                }>
                                    {asset.currency} {asset.currentValue ? asset.currentValue.toLocaleString() : '-'}
                                </Typography>
                            </Box>
                            
                            {/* Growth amount and percentage */}
                            {asset.currentValue && (
                                <Box sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Growth
                                    </Typography>
                                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                                        <Typography variant="subtitle2" fontWeight={600} color={
                                            asset.currentValue > asset.investedAmount ? 'success.main' : 
                                            asset.currentValue < asset.investedAmount ? 'error.main' : 'info.main'
                                        }>
                                            {asset.currentValue > asset.investedAmount ? '+' : ''}
                                            {asset.currency} {(asset.currentValue - asset.investedAmount).toLocaleString()}
                                        </Typography>
                                        
                                        <Chip
                                            label={`${((asset.currentValue - asset.investedAmount) / asset.investedAmount * 100).toFixed(2)}%`}
                                            size="small"
                                            color={
                                                asset.currentValue > asset.investedAmount ? 'success' : 
                                                asset.currentValue < asset.investedAmount ? 'error' : 'default'
                                            }
                                            sx={{ height: '20px', fontSize: '0.7rem' }}
                                        />
                                    </Stack>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                    
                    {/* Action buttons */}
                    <Stack direction="column" spacing={1}>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
                            onClick={onAddInvestment}
                        >
                            + Add Investment
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
                            onClick={onCreateSIP}
                        >
                            + Create SIP
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
                            onClick={onViewSIPs}
                        >
                            View SIPs
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Card>
    );
};

export default AssetRow;
