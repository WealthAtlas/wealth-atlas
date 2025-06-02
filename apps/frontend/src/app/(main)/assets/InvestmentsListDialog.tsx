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
import { AssetDTO, useDeleteInvestmentMutation, useGetAssetInvestmentsQuery } from '@/graphql/models/generated';
import { useNotification } from '@/context/NotificationContext';
import EditInvestmentDialog from './EditInvestmentDialog';

// Define our own type that matches the data we get from the query
interface Investment {
  id: string;
  date: string | Date;
  qty: number | null;
  valuePerQty: number;
  amount?: number;
}

interface InvestmentsListDialogProps {
    open: boolean;
    onClose: () => void;
    asset: AssetDTO | null;
    onSuccess?: () => Promise<void>;
}

const InvestmentsListDialog: React.FC<InvestmentsListDialogProps> = ({ 
    open, 
    onClose, 
    asset,
    onSuccess
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

    const { data, loading, error, refetch } = useGetAssetInvestmentsQuery({
        variables: { assetId: asset?.id || '' },
        skip: !asset,
        fetchPolicy: 'network-only', // Don't use the cache, always make a network request
    });
    
    // Delete investment mutation
    const [deleteInvestment, { loading: deleteLoading }] = useDeleteInvestmentMutation();
    
    // Get notification context
    const { showNotification } = useNotification();
    
    // Refetch data when the dialog opens
    React.useEffect(() => {
        if (open && asset) {
            refetch({ assetId: asset.id })
                .catch(err => {
                    console.error('Error fetching investments:', err);
                    showNotification(`Failed to load investments: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
                });
        }
    }, [open, asset, refetch, showNotification]);

    const investments = data?.asset?.investments || [];
    
    // Handle pagination
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    
    // Selection handling
    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = investments.map(investment => investment.id);
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
    
    // Menu handling
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, investment: Investment) => {
        setAnchorEl(event.currentTarget);
        setSelectedInvestment(investment);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Edit handling
    const handleEditClick = () => {
        handleMenuClose();
        setEditDialogOpen(true);
    };
    
    // Delete handling for individual investment
    const handleDeleteClick = () => {
        handleMenuClose();
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedInvestment) return;
        
        try {
            await deleteInvestment({
                variables: { investmentId: selectedInvestment.id }
            });
            
            // Refetch the investments list to update the UI
            await refetch();
            
            // Notify parent component if needed
            if (onSuccess) {
                await onSuccess();
            }
            
            // Show success notification
            showNotification(`Investment deleted successfully`, 'success');
            
            // Close the delete confirmation dialog
            setDeleteConfirmOpen(false);
            
            // Clear the selection if deleted investment was in selected list
            if (selected.includes(selectedInvestment.id)) {
                setSelected(selected.filter(id => id !== selectedInvestment.id));
            }
        } catch (err) {
            console.error('Error deleting investment:', err);
            showNotification(`Failed to delete investment: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
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
        
        // Delete investments one by one
        for (const investmentId of selected) {
            try {
                await deleteInvestment({
                    variables: { investmentId }
                });
                successCount++;
            } catch (err) {
                console.error('Error deleting investment:', err);
                errorCount++;
            }
        }
        
        // Refetch the investments list to update the UI
        await refetch();
        
        // Notify parent component if needed
        if (onSuccess) {
            await onSuccess();
        }
        
        // Show notification with status
        if (successCount > 0 && errorCount === 0) {
            showNotification(`Successfully deleted ${successCount} investments`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
            showNotification(`Deleted ${successCount} investments, but failed to delete ${errorCount} investments`, 'warning');
        } else {
            showNotification(`Failed to delete any investments`, 'error');
        }
        
        // Close the delete confirmation dialog and clear selection
        setBulkDeleteConfirmOpen(false);
        setSelected([]);
    };

    // Calculate total investment amount
    const totalInvestment = investments.reduce((sum, inv) => sum + (inv.qty || 1) * (inv.valuePerQty || 0), 0);

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        {asset?.name ? `Investments in ${asset.name}` : 'Asset Investments'}
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
                    <Typography color="error">Error loading investments: {error.message}</Typography>                    ) : investments.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            No investments found for this asset.
                        </Typography>
                        <Button 
                            variant="outlined" 
                            color="primary" 
                            onClick={() => {
                                // Close this dialog and open AddInvestmentDialog via parent component
                                onClose();
                                // Small delay to avoid UI glitches
                                setTimeout(() => {
                                    if (asset) {
                                        // Notify parent to open the AddInvestmentDialog
                                        if (onSuccess) onSuccess();
                                    }
                                }, 100);
                            }}
                            sx={{ mt: 2 }}
                        >
                            Add New Investment
                        </Button>
                    </Box>
                ) : (
                    <>
                        <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">
                                Total Investment: <strong>{asset?.currency} {totalInvestment.toLocaleString()}</strong>
                            </Typography>
                            <Chip 
                                label={`${investments.length} investments`} 
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
                                <Tooltip title="Delete selected investments">
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
                                                indeterminate={selected.length > 0 && selected.length < investments.length}
                                                checked={investments.length > 0 && selected.length === investments.length}
                                                onChange={handleSelectAllClick}
                                                inputProps={{ 'aria-label': 'select all investments' }}
                                            />
                                        </TableCell>
                                        <TableCell><strong>Date</strong></TableCell>
                                        <TableCell align="right"><strong>Qty</strong></TableCell>
                                        <TableCell align="right"><strong>Value per Qty</strong></TableCell>
                                        <TableCell align="right"><strong>Total Amount</strong></TableCell>
                                        <TableCell align="center"><strong>Actions</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {investments
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((investment) => (
                                            <TableRow 
                                                key={investment.id}
                                                selected={isSelected(investment.id)}
                                                hover
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        color="primary"
                                                        checked={isSelected(investment.id)}
                                                        onClick={(event) => handleSelectClick(event, investment.id)}
                                                        inputProps={{ 'aria-labelledby': `investment-${investment.id}` }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(investment.date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {investment.qty || 1}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {asset?.currency} {(investment.valuePerQty || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {asset?.currency} {((investment.qty || 1) * (investment.valuePerQty || 0)).toLocaleString()}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box>
                                                        <Tooltip title="Investment Options">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(event) => handleMenuOpen(event, investment)}
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
                            count={investments.length}
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
                        Are you sure you want to delete this investment from {new Date(selectedInvestment?.date || '').toLocaleDateString()}? This action cannot be undone.
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

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={bulkDeleteConfirmOpen} onClose={() => setBulkDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Bulk Deletion</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {selected.length} selected investments? This action cannot be undone.
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
                        {deleteLoading ? 'Deleting...' : `Delete ${selected.length} Investments`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Investment Dialog */}
            <EditInvestmentDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSuccess={async () => {
                    await refetch();
                    if (onSuccess) {
                        await onSuccess();
                    }
                    setEditDialogOpen(false);
                }}
                investment={selectedInvestment}
                currency={asset?.currency || 'USD'}
            />
        </Dialog>
    );
};

export default InvestmentsListDialog;
