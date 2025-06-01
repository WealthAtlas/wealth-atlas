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
import { AssetDTO, FrequencyType } from '@/graphql/models/generated';
import { useQuery } from '@apollo/client';

import { GET_ASSET_SIPS } from '@/graphql/queries/GetAssetSIPs.query';

// No need for a separate interface as we can use the generated types
import { SIPDTO } from '@/graphql/models/generated';

interface SIPListDialogProps {
    open: boolean;
    onClose: () => void;
    asset: AssetDTO | null;
}

const SIPListDialog: React.FC<SIPListDialogProps> = ({ 
    open, 
    onClose, 
    asset
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // Use the GraphQL query to fetch SIPs
    const { loading, error, data, refetch } = useQuery(GET_ASSET_SIPS, {
        variables: { assetId: asset?.id || '' },
        skip: !asset || !open,
        fetchPolicy: 'network-only', // Don't use the cache, always make a network request
    });
    
    // Refetch data when the dialog opens
    React.useEffect(() => {
        if (open && asset) {
            refetch({ assetId: asset.id });
        }
    }, [open, asset, refetch]);

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
                    <Typography color="error">Error loading SIPs: {error.message}</Typography>
                ) : sips.length === 0 ? (
                    <Typography variant="body1" align="center" py={4}>
                        No SIPs found for this asset.
                    </Typography>
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
                        
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Name</strong></TableCell>
                                        <TableCell><strong>Frequency</strong></TableCell>
                                        <TableCell align="right"><strong>Amount</strong></TableCell>
                                        <TableCell><strong>Start Date</strong></TableCell>
                                        <TableCell><strong>End Date</strong></TableCell>
                                        <TableCell><strong>Last Executed</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sips
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((sip) => (
                                            <TableRow key={sip.id}>
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
    );
};

export default SIPListDialog;
