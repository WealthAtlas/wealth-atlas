import { AssetDto } from '@/graphql/models/generated';
import { Card, Box, Typography, Stack, Divider, Button } from '@mui/material';
import React from 'react';

interface AssetRowProps {
    asset: AssetDto;
    onAddInvestment: () => void;
}

const AssetRow: React.FC<AssetRowProps> = ({ asset, onAddInvestment }) => {
    // Helper: calculate invested amount
    const getInvestedAmount = (asset: AssetDto) => {
        if (!asset.investments) return 0;
        return asset.investments.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
    };
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
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {asset.name}
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        {asset.category}
                    </Typography>
                    <Typography variant="body2" color="warning.main" fontWeight={500}>
                        {asset.riskLevel}
                    </Typography>
                </Stack>
            </Box>
            {/* Center: Investments & Maturity */}
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <Box sx={{ flex: 1, textAlign: 'center', minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">
                    Investments
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                    {asset.investments ? asset.investments.length : 0}
                </Typography>
                {asset.maturityDate && (
                    <Typography variant="caption" color="text.secondary">
                        Maturity: {new Date(asset.maturityDate).toLocaleDateString()}
                    </Typography>
                )}
            </Box>
            {/* Right: Amounts & Action */}
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <Box sx={{ flex: 2, textAlign: 'right', minWidth: 200 }}>
                <Stack direction="row" spacing={4} justifyContent="flex-end" alignItems="center">
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Invested
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {asset.currency} {getInvestedAmount(asset).toLocaleString()}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Current
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={600} color="success.main">
                            {asset.currency} {asset.currentValue ? asset.currentValue.toLocaleString() : '-'}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        size="small"
                        sx={{ ml: 2, borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
                        onClick={onAddInvestment}
                    >
                        + Add Investment
                    </Button>
                </Stack>
            </Box>
        </Card>
    );
};

export default AssetRow;
