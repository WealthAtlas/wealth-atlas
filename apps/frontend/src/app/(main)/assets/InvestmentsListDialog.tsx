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
    Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AssetDTO, useGetAssetInvestmentsQuery } from '@/graphql/models/generated';

interface InvestmentsListDialogProps {
    open: boolean;
    onClose: () => void;
    asset: AssetDTO | null;
}

const InvestmentsListDialog: React.FC<InvestmentsListDialogProps> = ({ 
    open, 
    onClose, 
    asset
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const { data, loading, error } = useGetAssetInvestmentsQuery({
        variables: { assetId: asset?.id || '' },
        skip: !asset,
    });

    const investments = data?.asset?.investments || [];
    
    // Handle pagination
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
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
                    <IconButton aria-label="close" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Typography color="error">Error loading investments: {error.message}</Typography>
                ) : investments.length === 0 ? (
                    <Typography variant="body1" align="center" py={4}>
                        No investments found for this asset.
                    </Typography>
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
                        
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Date</strong></TableCell>
                                        <TableCell align="right"><strong>Qty</strong></TableCell>
                                        <TableCell align="right"><strong>Value per Qty</strong></TableCell>
                                        <TableCell align="right"><strong>Total Amount</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {investments
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((investment) => (
                                            <TableRow key={investment.id}>
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
        </Dialog>
    );
};

export default InvestmentsListDialog;
