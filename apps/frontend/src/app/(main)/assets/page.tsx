'use client';

import { Box, Card, CardContent, Typography, Fab, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGetAssetsQuery } from '@/graphql/models/generated';

const AssetsPage = () => {
    const { data, loading, error } = useGetAssetsQuery();


    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    const assets = data?.assets || [];

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
                onClick={() => {
                    // Navigate to the Add Asset page
                    window.location.href = '/assets/add';
                }}
            >
                <AddIcon />
            </Fab>
        </Box>
    );
};

export default AssetsPage;