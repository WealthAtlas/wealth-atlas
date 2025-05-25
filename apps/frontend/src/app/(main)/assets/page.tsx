'use client';

import { useState } from 'react';
import { Box, Typography, Fab, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGetAssetsQuery } from '@/graphql/models/generated';
import CreateAssetDialog from './CreateAssetDialog';
import AssetRow from './AssetRow';

const AssetsPage = () => {
    const { data, loading, error, refetch } = useGetAssetsQuery();
    const [dialogOpen, setDialogOpen] = useState(false);
    // For add investment dialog per asset (future extension)
    const [addInvestmentAssetId, setAddInvestmentAssetId] = useState<number | null>(null);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    const assets = data?.assets || [];

    const handleDialogOpen = () => setDialogOpen(true);
    const handleDialogClose = () => setDialogOpen(false);

    const handleAssetCreated = async () => {
        await refetch();
    };

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom fontWeight={700}>
                Assets
            </Typography>
            <Stack spacing={2}>
                {assets.map((asset: any) => (
                    <AssetRow
                        key={asset.id}
                        asset={asset}
                        onAddInvestment={() => setAddInvestmentAssetId(asset.id)}
                    />
                ))}
            </Stack>
            <Fab
                color="primary"
                aria-label="add"
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                }}
                onClick={handleDialogOpen}
            >
                <AddIcon />
            </Fab>

            <CreateAssetDialog
                open={dialogOpen}
                onClose={handleDialogClose}
                onSuccess={handleAssetCreated}
            />
        </Box>
    );
};

export default AssetsPage;