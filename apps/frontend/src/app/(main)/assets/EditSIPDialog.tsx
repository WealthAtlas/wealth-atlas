import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { FrequencyType, SIPDTO, useUpdateSIPMutation } from '@/graphql/models/generated';
import { useNotification } from '@/context/NotificationContext';

interface EditSIPDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    sip: SIPDTO | null;
}

const EditSIPDialog: React.FC<EditSIPDialogProps> = ({ open, onClose, onSuccess, sip }) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        frequency: FrequencyType.MONTHLY,
        startDate: '',
        endDate: '',
        description: '',
    });

    const [errors, setErrors] = useState({
        name: false,
        amount: false,
        startDate: false,
    });
    
    const [updateSIP, { loading }] = useUpdateSIPMutation();
    
    // Get notification context
    const { showNotification } = useNotification();

    // Initialize form data when SIP changes
    useEffect(() => {
        if (sip) {
            setFormData({
                name: sip.name,
                amount: sip.amount.toString(),
                frequency: sip.frequency,
                startDate: sip.startDate ? new Date(sip.startDate).toISOString().substring(0, 10) : '',
                endDate: sip.endDate ? new Date(sip.endDate).toISOString().substring(0, 10) : '',
                description: sip.description || '',
            });
        }
    }, [sip]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        const name = e.target.name as string;
        const value = e.target.value;
        setFormData({ ...formData, [name]: value });
    };

    const validateForm = () => {
        const newErrors = {
            name: !formData.name,
            amount: !formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0,
            startDate: !formData.startDate,
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(Boolean);
    };

    const handleFormSubmit = async () => {
        if (!validateForm() || !sip) return;
        
        try {
            await updateSIP({
                variables: {
                    sipId: sip.id,
                    input: {
                        name: formData.name,
                        amount: parseFloat(formData.amount),
                        frequency: formData.frequency,
                        startDate: new Date(formData.startDate),
                        endDate: formData.endDate ? new Date(formData.endDate) : null,
                        description: formData.description || null,
                    },
                },
            });
            onSuccess();
            showNotification(`SIP "${formData.name}" updated successfully`, 'success');
            handleClose();
        } catch (err) {
            console.error('Error updating SIP:', err);
            showNotification(`Failed to update SIP: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };

    const handleClose = () => {
        setErrors({ name: false, amount: false, startDate: false });
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit SIP</DialogTitle>
            <DialogContent>
                <TextField
                    margin="dense"
                    label="SIP Name"
                    name="name"
                    fullWidth
                    value={formData.name}
                    onChange={handleInputChange}
                    error={errors.name}
                    helperText={errors.name ? 'SIP name is required' : ''}
                />
                
                <TextField
                    margin="dense"
                    label="Amount"
                    name="amount"
                    type="number"
                    fullWidth
                    value={formData.amount}
                    onChange={handleInputChange}
                    error={errors.amount}
                    helperText={errors.amount ? 'Valid amount is required' : ''}
                />
                
                <FormControl fullWidth margin="dense">
                    <InputLabel id="frequency-label">Frequency</InputLabel>
                    <Select
                        labelId="frequency-label"
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleSelectChange as any}
                        label="Frequency"
                    >
                        <MenuItem value={FrequencyType.DAILY}>Daily</MenuItem>
                        <MenuItem value={FrequencyType.WEEKLY}>Weekly</MenuItem>
                        <MenuItem value={FrequencyType.MONTHLY}>Monthly</MenuItem>
                        <MenuItem value={FrequencyType.QUARTERLY}>Quarterly</MenuItem>
                        <MenuItem value={FrequencyType.YEARLY}>Yearly</MenuItem>
                    </Select>
                </FormControl>
                
                <TextField
                    margin="dense"
                    label="Start Date"
                    name="startDate"
                    type="date"
                    fullWidth
                    value={formData.startDate}
                    onChange={handleInputChange}
                    error={errors.startDate}
                    helperText={errors.startDate ? 'Start date is required' : ''}
                    InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                    margin="dense"
                    label="End Date (Optional)"
                    name="endDate"
                    type="date"
                    fullWidth
                    value={formData.endDate}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                    margin="dense"
                    label="Description (Optional)"
                    name="description"
                    fullWidth
                    multiline
                    rows={2}
                    value={formData.description}
                    onChange={handleInputChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleFormSubmit} color="primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update SIP'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditSIPDialog;
