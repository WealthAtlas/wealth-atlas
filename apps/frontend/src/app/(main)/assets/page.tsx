'use client';

import { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Fab,
    Stack,
    TextField,
    InputAdornment,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Chip,
    Card,
    Divider,
    Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import { AssetDTO, useGetAssetsQuery } from '@/graphql/models/generated';
import CreateAssetDialog from './CreateAssetDialog';
import AssetRow from '../../../components/AssetRow';
import AddInvestmentDialog from './AddInvestmentDialog';
import EditAssetDialog from './EditAssetDialog';
import InvestmentsListDialog from './InvestmentsListDialog';
import AddSIPDialog from './AddSIPDialog';
import SIPListDialog from './SIPListDialog';

const AssetsPage = () => {
    const { data, loading, error, refetch } = useGetAssetsQuery();
    const [dialogOpen, setDialogOpen] = useState(false);
    // For add investment dialog per asset
    const [addInvestmentAssetId, setAddInvestmentAssetId] = useState<string | null>(null);
    // For edit asset dialog
    const [editAssetId, setEditAssetId] = useState<string | null>(null);
    // For view investments dialog
    const [viewInvestmentsAsset, setViewInvestmentsAsset] = useState<AssetDTO | null>(null);
    // For add SIP dialog
    const [addSIPAssetId, setAddSIPAssetId] = useState<string | null>(null);
    // For view SIPs dialog
    const [viewSIPsAsset, setViewSIPsAsset] = useState<AssetDTO | null>(null);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'currentValue' | 'growth'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
    const [riskFilter, setRiskFilter] = useState<string[]>([]);

    const handleDialogOpen = () => setDialogOpen(true);
    const handleDialogClose = () => setDialogOpen(false);

    const handleAssetCreated = () => {
        refetch();
    };

    const assets = data?.assets as AssetDTO[] | undefined;

    // Extract unique categories and risk levels for filters
    const categories = useMemo(() => {
        if (!assets) return [];
        const uniqueCategories = new Set(assets.map(asset => asset.category));
        return Array.from(uniqueCategories);
    }, [assets]);

    const riskLevels = useMemo(() => {
        if (!assets) return [];
        const uniqueRiskLevels = new Set(assets.map(asset => asset.riskLevel));
        return Array.from(uniqueRiskLevels);
    }, [assets]);
    
    // Filter and sort assets
    const filteredAssets = useMemo(() => {
        if (!assets) return [];

        return assets
            .filter(asset => {
                // Apply search filter
                const matchesSearch = searchQuery === '' ||
                    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.category.toLowerCase().includes(searchQuery.toLowerCase());

                // Apply category filter
                const matchesCategory = categoryFilter.length === 0 ||
                    categoryFilter.includes(asset.category);

                // Apply risk filter
                const matchesRisk = riskFilter.length === 0 ||
                    riskFilter.includes(asset.riskLevel);

                return matchesSearch && matchesCategory && matchesRisk;
            })
            .sort((a, b) => {
                if (sortBy === 'name') {
                    return sortOrder === 'asc'
                        ? a.name.localeCompare(b.name)
                        : b.name.localeCompare(a.name);
                } else if (sortBy === 'currentValue') {
                    const aValue = a.currentValue || 0;
                    const bValue = b.currentValue || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                } else if (sortBy === 'growth') {
                    const aGrowth = (a.currentValue || 0) - a.investedAmount;
                    const bGrowth = (b.currentValue || 0) - b.investedAmount;
                    return sortOrder === 'asc' ? aGrowth - bGrowth : bGrowth - aGrowth;
                }
                return 0;
            });
    }, [assets, searchQuery, categoryFilter, riskFilter, sortBy, sortOrder]);

    // Toggle sort order or change sort field
    const handleSortChange = (field: 'name' | 'currentValue' | 'growth') => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Toggle category filter
    const toggleCategoryFilter = (category: string) => {
        setCategoryFilter(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // Toggle risk level filter
    const toggleRiskFilter = (risk: string) => {
        setRiskFilter(prev =>
            prev.includes(risk)
                ? prev.filter(r => r !== risk)
                : [...prev, risk]
        );
    };
    
    // Handle loading and error states
    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;
    
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
            {/* Header with title and summary metrics */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Assets
                </Typography>

                {assets && assets.length > 0 && (
                    <Card sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                        <Grid container spacing={3}>
                            <Grid>
                                <Box textAlign="center">
                                    <Typography variant="body2">Total Asset Value</Typography>
                                    <Typography variant="h6" fontWeight={700}>
                                        {assets[0]?.currency} {assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid>
                                <Box textAlign="center">
                                    <Typography variant="body2">Total Invested</Typography>
                                    <Typography variant="h6" fontWeight={700}>
                                        {assets[0]?.currency} {assets.reduce((sum, asset) => sum + asset.investedAmount, 0).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid>
                                <Box textAlign="center">
                                    <Typography variant="body2">Overall Growth</Typography>
                                    <Typography variant="h6" fontWeight={700} color={
                                        assets.reduce((sum, asset) => sum + ((asset.currentValue || 0) - asset.investedAmount), 0) >= 0
                                            ? 'success.main' : 'error.main'
                                    }>
                                        {assets.reduce((sum, asset) => sum + ((asset.currentValue || 0) - asset.investedAmount), 0) >= 0 ? '+' : ''}
                                        {assets[0]?.currency} {assets.reduce((sum, asset) => sum + ((asset.currentValue || 0) - asset.investedAmount), 0).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Card>
                )}
            </Box>

            {/* Search, filter and sort controls */}
            <Card sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2}>
                    {/* Search */}
                    <Grid>
                        <TextField
                            fullWidth
                            placeholder="Search assets by name or category"
                            variant="outlined"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    {/* Sort options */}
                    <Grid>
                        <FormControl fullWidth>
                            <InputLabel id="sort-select-label">Sort By</InputLabel>
                            <Select
                                labelId="sort-select-label"
                                value={sortBy}
                                label="Sort By"
                                startAdornment={<SortIcon sx={{ mr: 1 }} />}
                                onChange={(e) => handleSortChange(e.target.value as 'name' | 'currentValue' | 'growth')}
                            >
                                <MenuItem value="name">Name {sortBy === 'name' && (sortOrder === 'asc' ? '(A-Z)' : '(Z-A)')}</MenuItem>
                                <MenuItem value="currentValue">Current Value {sortBy === 'currentValue' && (sortOrder === 'asc' ? '(Low-High)' : '(High-Low)')}</MenuItem>
                                <MenuItem value="growth">Growth {sortBy === 'growth' && (sortOrder === 'asc' ? '(Low-High)' : '(High-Low)')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Filter toggle */}
                    <Grid>
                        <FormControl fullWidth>
                            <InputLabel id="filter-select-label">Filters</InputLabel>
                            <Select
                                labelId="filter-select-label"
                                value=""
                                label="Filters"
                                startAdornment={<FilterListIcon sx={{ mr: 1 }} />}
                                renderValue={() => `${categoryFilter.length + riskFilter.length} Selected`}
                                onClick={(e) => e.preventDefault()}  // Prevent default behavior
                            >
                                <Box sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Category</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {categories.map((category) => (
                                            <Chip
                                                key={category}
                                                label={category}
                                                clickable
                                                color={categoryFilter.includes(category) ? 'primary' : 'default'}
                                                onClick={() => toggleCategoryFilter(category)}
                                            />
                                        ))}
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Risk Level</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {riskLevels.map((risk) => (
                                            <Chip
                                                key={risk}
                                                label={risk}
                                                clickable
                                                color={riskFilter.includes(risk) ? 'primary' : 'default'}
                                                onClick={() => toggleRiskFilter(risk)}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* Active filters */}
                {(categoryFilter.length > 0 || riskFilter.length > 0) && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {categoryFilter.map(category => (
                            <Chip
                                key={`cat-${category}`}
                                label={`Category: ${category}`}
                                onDelete={() => toggleCategoryFilter(category)}
                                color="primary"
                                size="small"
                            />
                        ))}

                        {riskFilter.map(risk => (
                            <Chip
                                key={`risk-${risk}`}
                                label={`Risk: ${risk}`}
                                onDelete={() => toggleRiskFilter(risk)}
                                color="primary"
                                size="small"
                            />
                        ))}
                    </Box>
                )}
            </Card>

            {/* Asset list */}
            <Stack spacing={2}>
                {filteredAssets.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No assets match your search criteria
                    </Typography>
                ) : (
                    filteredAssets.map((asset) => (
                        <AssetRow
                            key={asset.id}
                            asset={asset as any}
                            onAddInvestment={() => setAddInvestmentAssetId(asset.id)}
                            onViewInvestments={() => setViewInvestmentsAsset(asset)}
                            onCreateSIP={() => setAddSIPAssetId(asset.id)}
                            onViewSIPs={() => setViewSIPsAsset(asset)}
                            onEdit={() => setEditAssetId(asset.id)}
                        />
                    ))
                )}
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
            <EditAssetDialog
                open={!!editAssetId}
                assetId={editAssetId}
                onClose={() => setEditAssetId(null)}
                onSuccess={async () => {
                    await refetch();
                    setEditAssetId(null);
                }}
            />
            <InvestmentsListDialog
                open={!!viewInvestmentsAsset}
                asset={viewInvestmentsAsset}
                onClose={() => setViewInvestmentsAsset(null)}
                onSuccess={async () => {
                    await refetch();
                }}
            />
            <AddSIPDialog
                open={!!addSIPAssetId}
                assetId={addSIPAssetId || ''}
                onClose={() => setAddSIPAssetId(null)}
                onSuccess={async () => {
                    await refetch();
                    setAddSIPAssetId(null);
                }}
            />
            <SIPListDialog
                open={!!viewSIPsAsset}
                asset={viewSIPsAsset}
                onClose={() => setViewSIPsAsset(null)}
                onSuccess={async () => {
                    await refetch();
                }}
            />
        </Box>
    );
};

export default AssetsPage;