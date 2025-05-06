'use client';

import { useState } from 'react';
import { Box, Card, CardContent, Typography, Fab, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGetAssetsQuery, useCreateAssetMutation } from '@/graphql/models/generated';

const AssetsPage = () => {
    const { data, loading, error, refetch } = useGetAssetsQuery();
    const [createAsset] = useCreateAssetMutation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        riskLevel: '',
        growthRate: '',
        maturityDate: '',
    });

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    const assets = data?.assets || [];

    const handleDialogOpen = () => setDialogOpen(true);
    const handleDialogClose = () => setDialogOpen(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFormSubmit = async () => {
        try {
            await createAsset({ variables: { input: {
                ...formData,
                maturityDate: new Date(formData.maturityDate).toISOString(),
                riskLevel: '',
                currency: 'USD',
                growthRate: parseFloat(formData.growthRate),
            } } });
            await refetch(); // Refresh the asset list
            handleDialogClose();
        } catch (err) {
            console.error('Error creating asset:', err);
        }
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

            {/* Dialog for adding an asset */}
            <Dialog open={dialogOpen} onClose={handleDialogClose}>
                <DialogTitle>Add Asset</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label="Name"
                        name="name"
                        fullWidth
                        value={formData.name}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        name="description"
                        fullWidth
                        value={formData.description}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        label="Category"
                        name="category"
                        fullWidth
                        value={formData.category}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        label="Risk Level"
                        name="riskLevel"
                        fullWidth
                        value={formData.riskLevel}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        label="Growth Rate"
                        name="growthRate"
                        fullWidth
                        value={formData.growthRate}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        label="Maturity Date"
                        name="maturityDate"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={formData.maturityDate}
                        onChange={handleInputChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>Cancel</Button>
                    <Button onClick={handleFormSubmit} color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AssetsPage;