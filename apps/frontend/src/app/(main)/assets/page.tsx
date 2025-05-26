'use client';

import { useState } from 'react';
import { Box, Typography, Fab, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { AssetDTO, useGetAssetsQuery } from '@/graphql/models/generated';
import CreateAssetDialog from './CreateAssetDialog';
import AssetRow from './AssetRow';
import AddInvestmentDialog from './AddInvestmentDialog';

const AssetsPage = () => {
    const { data, loading, error, refetch } = useGetAssetsQuery();
    const [dialogOpen, setDialogOpen] = useState(false);
    // For add investment dialog per asset (future extension)
    const [addInvestmentAssetId, setAddInvestmentAssetId] = useState<string | null>(null);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    const handleDialogOpen = () => setDialogOpen(true);
    const handleDialogClose = () => setDialogOpen(false);

    const handleAssetCreated = () => {
        refetch();
    };

    const assets = data?.assets as AssetDTO[] | undefined;

    if (!assets || assets.length === 0) {
        return (
            <Box sx={{ padding: 2 }}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    No Assets Found
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    You can create your first asset by clicking the button below.
                </Typography>
                <Fab
                    color="primary"
                    aria-label="add"
                    sx={{ position: 'fixed', bottom: 16, right: 16 }}
                    onClick={() => setDialogOpen(true)}
                >
                    <AddIcon />
                </Fab>
                <CreateAssetDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSuccess={handleAssetCreated}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom fontWeight={700}>
                Assets
            </Typography>
            <Stack spacing={2}>
                {assets.map((asset) => (
                    <AssetRow
                        key={asset.id}
                        asset={asset as any}
                        onAddInvestment={() => setAddInvestmentAssetId(asset.id)}
                        onViewInvestments={() => {/* TODO: implement view investments */}}
                        onCreateSIP={() => {/* TODO: implement create SIP */}}
                        onViewSIPs={() => {/* TODO: implement view SIPs */}}
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
            <AddInvestmentDialog
                open={!!addInvestmentAssetId}
                assetId={addInvestmentAssetId || ''}
                onClose={() => setAddInvestmentAssetId(null)}
                onSuccess={async () => {
                    await refetch();
                    setAddInvestmentAssetId(null);
                }}
            />
        </Box>
    );
};

export default AssetsPage;