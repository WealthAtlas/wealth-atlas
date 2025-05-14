'use client';

import { useState } from 'react';
import { Box, Typography, Fab, Grid, Card, CardContent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGetAssetsQuery } from '@/graphql/models/generated';
import CreateAssetDialog from './CreateAssetDialog';

const AssetsPage = () => {
    const { data, loading, error, refetch } = useGetAssetsQuery();
    const [dialogOpen, setDialogOpen] = useState(false);

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
            <Typography variant="h4" gutterBottom>
                Assets
            </Typography>
            <Grid container spacing={2}>
                {assets.map((asset: any) => (
                    <Grid key={asset.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">{asset.name}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {asset.description}
                                </Typography>
                                <Typography variant="body2">
                                    Category: {asset.category}
                                </Typography>
                                <Typography variant="body2">
                                    Risk Level: {asset.riskLevel}
                                </Typography>
                                <Typography variant="body2">
                                    Growth Rate: {asset.growthRate}%
                                </Typography>
                                <Typography variant="body2">
                                    Maturity Date: {new Date(asset.maturityDate).toLocaleDateString()}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
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