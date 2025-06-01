import React, { useState } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent,
    IconButton,
    Typography,
    Box, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper,
    Chip,
    TablePagination,
    CircularProgress,
    DialogActions,
    Button,
    Menu,
    MenuItem,
    Tooltip,
    Checkbox,
    Toolbar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AssetDTO, FrequencyType, useDeleteSIPMutation } from '@/graphql/models/generated';
import { useQuery } from '@apollo/client';
import { useNotification } from '@/context/NotificationContext';

import { GET_ASSET_SIPS } from '@/graphql/queries/GetAssetSIPs.query';
import EditSIPDialog from './EditSIPDialog';

// No need for a separate interface as we can use the generated types
import { SIPDTO } from '@/graphql/models/generated';

interface SIPListDialogProps {
    open: boolean;
    onClose: () => void;
    asset: AssetDTO | null;
    onSuccess?: () => Promise<void>;
}

const SIPListDialog: React.FC<SIPListDialogProps> = ({ 
    open, 
    onClose, 
    asset,
    onSuccess
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedSIP, setSelectedSIP] = useState<SIPDTO | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

    // Use the GraphQL query to fetch SIPs
    const { loading, error, data, refetch } = useQuery(GET_ASSET_SIPS, {
        variables: { assetId: asset?.id || '' },
        skip: !asset || !open,
        fetchPolicy: 'network-only', // Don't use the cache, always make a network request
    });

    // Delete SIP mutation
    const [deleteSIP, { loading: deleteLoading }] = useDeleteSIPMutation();
    
    // Get notification context
    const { showNotification } = useNotification();
    
    // Refetch data when the dialog opens
    React.useEffect(() => {
        if (open && asset) {
            refetch({ assetId: asset.id })
                .catch(err => {
                    console.error('Error fetching SIPs:', err);
                    showNotification(`Failed to load SIPs: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
                });
        }
    }, [open, asset, refetch, showNotification]);

    // Extract SIPs from the query result
    const sips: SIPDTO[] = data?.assetSIPs || [];
    
    // Handle pagination
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Menu handling
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sip: SIPDTO) => {
        setAnchorEl(event.currentTarget);
        setSelectedSIP(sip);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Edit handling
    const handleEditClick = () => {
        handleMenuClose();
        setEditDialogOpen(true);
    };

    // Selection handling
    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = sips.map(sip => sip.id);
            setSelected(newSelected);
        } else {
            setSelected([]);
        }
    };

    const handleSelectClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, id: string) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = [...selected, id];
        } else {
            newSelected = selected.filter(item => item !== id);
        }

        setSelected(newSelected);
    };

    const isSelected = (id: string) => selected.indexOf(id) !== -1;

    // Delete handling for individual SIP
    const handleDeleteClick = () => {
        handleMenuClose();
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedSIP) return;
        
        try {
            await deleteSIP({
                variables: { sipId: selectedSIP.id }
            });
            
            // Refetch the SIPs list to update the UI
            await refetch();
            
            // Notify parent component if needed
            if (onSuccess) {
                await onSuccess();
            }
            
            // Show success notification
            showNotification(`SIP "${selectedSIP.name}" deleted successfully`, 'success');
            
            // Close the delete confirmation dialog
            setDeleteConfirmOpen(false);
            
            // Clear the selection if deleted SIP was in selected list
            if (selected.includes(selectedSIP.id)) {
                setSelected(selected.filter(id => id !== selectedSIP.id));
            }
        } catch (err) {
            console.error('Error deleting SIP:', err);
            showNotification(`Failed to delete SIP: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };
    
    // Bulk delete handling
    const handleBulkDeleteClick = () => {
        if (selected.length > 0) {
            setBulkDeleteConfirmOpen(true);
        }
    };
    
    const handleBulkDeleteConfirm = async () => {
        if (selected.length === 0) return;
        
        let successCount = 0;
        let errorCount = 0;
        
        // Delete SIPs one by one
        for (const sipId of selected) {
            try {
                await deleteSIP({
                    variables: { sipId }
                });
                successCount++;
            } catch (err) {
                console.error('Error deleting SIP:', err);
                errorCount++;
            }
        }
        
        // Refetch the SIPs list to update the UI
        await refetch();
        
        // Notify parent component if needed
        if (onSuccess) {
            await onSuccess();
        }
        
        // Show notification with status
        if (successCount > 0 && errorCount === 0) {
            showNotification(`Successfully deleted ${successCount} SIPs`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
            showNotification(`Deleted ${successCount} SIPs, but failed to delete ${errorCount} SIPs`, 'warning');
        } else {
            showNotification(`Failed to delete any SIPs`, 'error');
        }
        
        // Close the delete confirmation dialog and clear selection
        setBulkDeleteConfirmOpen(false);
        setSelected([]);
    };

    // Format frequency for display
    const formatFrequency = (frequency: FrequencyType) => {
        // Convert from enum (which is all caps) to capitalized first letter
        const freqStr = frequency.toLowerCase();
        return freqStr.charAt(0).toUpperCase() + freqStr.slice(1);
    };

    // Calculate total SIP amount per year
    const calculateYearlyAmount = (sip: SIPDTO) => {
        switch (sip.frequency) {
            case FrequencyType.DAILY:
                return sip.amount * 365;
            case FrequencyType.WEEKLY:
                return sip.amount * 52;
            case FrequencyType.MONTHLY:
                return sip.amount * 12;
            case FrequencyType.QUARTERLY:
                return sip.amount * 4;
            case FrequencyType.YEARLY:
                return sip.amount;
            default:
                return sip.amount;
        }
    };

    const totalYearlyInvestment = sips.reduce((sum, sip) => sum + calculateYearlyAmount(sip), 0);

    // Get frequency color
    const getFrequencyColor = (frequency: FrequencyType) => {
        switch (frequency) {
            case FrequencyType.DAILY:
                return 'error';
            case FrequencyType.WEEKLY:
                return 'warning';
            case FrequencyType.MONTHLY:
                return 'info';
            case FrequencyType.QUARTERLY:
                return 'success';
            case FrequencyType.YEARLY:
                return 'secondary';
            default:
                return 'default';
        }
    };

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            {asset?.name ? `SIPs for ${asset.name}` : 'Asset SIPs'}
                        </Typography>
                        <Box>
                            <IconButton 
                                aria-label="refresh" 
                                onClick={() => refetch()}
                                disabled={loading}
                                sx={{ mr: 1 }}
                            >
                                <RefreshIcon />
                            </IconButton>
                            <IconButton aria-label="close" onClick={onClose}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" p={3}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Typography color="error">Error loading SIPs: {error.message}</Typography>
                    ) : sips.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                No SIPs found for this asset.
                            </Typography>
                            <Button 
                                variant="outlined" 
                                color="primary" 
                                onClick={() => {
                                    // Close this dialog and open AddSIPDialog via parent component
                                    onClose();
                                    // Small delay to avoid UI glitches
                                    setTimeout(() => {
                                        if (asset) {
                                            // Notify parent to open the AddSIPDialog
                                            if (onSuccess) onSuccess();
                                        }
                                    }, 100);
                                }}
                                sx={{ mt: 2 }}
                            >
                                Create New SIP
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1">
                                    Total Yearly Investment: <strong>{asset?.currency} {totalYearlyInvestment.toLocaleString()}</strong>
                                </Typography>
                                <Chip 
                                    label={`${sips.length} SIPs`} 
                                    color="primary" 
                                    variant="outlined" 
                                />
                            </Box>
                            
                            {selected.length > 0 && (
                                <Toolbar
                                    sx={{
                                        pl: { sm: 2 },
                                        pr: { xs: 1, sm: 1 },
                                        bgcolor: 'primary.light',
                                        color: 'primary.contrastText',
                                        borderRadius: 1,
                                        mb: 1
                                    }}
                                >
                                    <Typography
                                        sx={{ flex: '1 1 100%' }}
                                        variant="subtitle1"
                                        component="div"
                                    >
                                        {selected.length} selected
                                    </Typography>
                                    <Tooltip title="Delete selected SIPs">
                                        <Button
                                            variant="contained"
                                            color="error"
                                            onClick={handleBulkDeleteClick}
                                            startIcon={<DeleteIcon />}
                                            size="small"
                                        >
                                            Delete Selected
                                        </Button>
                                    </Tooltip>
                                </Toolbar>
                            )}
                            
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    color="primary"
                                                    indeterminate={selected.length > 0 && selected.length < sips.length}
                                                    checked={sips.length > 0 && selected.length === sips.length}
                                                    onChange={handleSelectAllClick}
                                                    inputProps={{ 'aria-label': 'select all SIPs' }}
                                                />
                                            </TableCell>
                                            <TableCell><strong>Name</strong></TableCell>
                                            <TableCell><strong>Frequency</strong></TableCell>
                                            <TableCell align="right"><strong>Amount</strong></TableCell>
                                            <TableCell><strong>Start Date</strong></TableCell>
                                            <TableCell><strong>End Date</strong></TableCell>
                                            <TableCell><strong>Last Executed</strong></TableCell>
                                            <TableCell align="center"><strong>Actions</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sips
                                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                            .map((sip) => (
                                                <TableRow 
                                                    key={sip.id}
                                                    selected={isSelected(sip.id)}
                                                    hover
                                                >
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            color="primary"
                                                            checked={isSelected(sip.id)}
                                                            onClick={(event) => handleSelectClick(event, sip.id)}
                                                            inputProps={{ 'aria-labelledby': `sip-${sip.id}` }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontWeight={500}>{sip.name}</Typography>
                                                        {sip.description && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {sip.description}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={formatFrequency(sip.frequency)} 
                                                            size="small" 
                                                            color={getFrequencyColor(sip.frequency) as any}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {asset?.currency} {sip.amount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(sip.startDate).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {sip.endDate ? new Date(sip.endDate).toLocaleDateString() : 'No end date'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {sip.lastExecutedDate ? new Date(sip.lastExecutedDate).toLocaleDateString() : 'Never'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Box>
                                                            <Tooltip title="SIP Options">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(event) => handleMenuOpen(event, sip)}
                                                                >
                                                                    <MoreVertIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={sips.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        </>
                    )}
                </DialogContent>
                
                <DialogActions>
                    <Button onClick={onClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleEditClick}>
                    <EditIcon fontSize="small" style={{ marginRight: 8 }} />
                    Edit
                </MenuItem>
                <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" style={{ marginRight: 8 }} />
                    Delete
                </MenuItem>
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the SIP "{selectedSIP?.name}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteConfirm} 
                        color="error" 
                        disabled={deleteLoading}
                    >
                        {deleteLoading ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit SIP Dialog */}
            <EditSIPDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSuccess={async () => {
                    await refetch();
                    // Notify parent component if needed
                    if (onSuccess) {
                        await onSuccess();
                    }
                    setEditDialogOpen(false);
                }}
                sip={selectedSIP}
            />
            
            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={bulkDeleteConfirmOpen} onClose={() => setBulkDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Bulk Deletion</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {selected.length} selected SIPs? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkDeleteConfirmOpen(false)} disabled={deleteLoading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleBulkDeleteConfirm} 
                        color="error" 
                        disabled={deleteLoading}
                    >
                        {deleteLoading ? 'Deleting...' : `Delete ${selected.length} SIPs`}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SIPListDialog;
