import React, { useState } from 'react';
import { useCreateAssetMutation } from '@/graphql/models/generated';
import { Button } from '@mui/material';
import AssetDialogForm, { 
    initialFormData, 
    initialFormErrors, 
    validateAssetForm, 
    buildAssetInput, 
    AssetFormData, 
    AssetFormErrors 
} from '../../../components/AssetDialogForm';

interface CreateAssetDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (manualValueData?: { assetId: string, manualValue: number }) => void;
}

const CreateAssetDialog: React.FC<CreateAssetDialogProps> = ({ open, onClose, onSuccess }) => {
    const [formData, setFormData] = useState<AssetFormData>(initialFormData);
    const [errors, setErrors] = useState<AssetFormErrors>(initialFormErrors);
    const [createAsset, { loading }] = useCreateAssetMutation();

    const handleFormSubmit = async () => {
        const [isValid, newErrors] = validateAssetForm(formData);
        setErrors(newErrors);
        if (!isValid) return;

        // We need to build the input in a way that matches the GraphQL schema types
        // Cannot directly use the buildAssetInput function due to type compatibility issues
        const assetInput: any = {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            riskLevel: formData.riskLevel,
            currency: formData.currency,
            maturityDate: formData.maturityDate
                ? new Date(formData.maturityDate).toISOString()
                : null,
        };

        // Set the correct value strategy based on the type
        if (formData.valueStrategyType === 'fixed') {
            assetInput.fixedValueStrategy = {
                type: 'fixed',
                growthRate: parseFloat(formData.growthRate)
            };
        } else if (formData.valueStrategyType === 'dynamic') {
            assetInput.dynamicValueStrategy = {
                type: 'dynamic',
                scriptCode: formData.scriptCode
            };
        } else if (formData.valueStrategyType === 'manual') {
            assetInput.manualValueStrategy = {
                type: 'manual',
                value: parseFloat(formData.manualValue)
            };
        }

        try {
            // Create the asset
            const assetResult = await createAsset({
                variables: {
                    input: assetInput
                },
            });

            onSuccess();
            handleClose();
        } catch (err) {
            console.error('Error creating asset:', err);
        }
    };

    const handleClose = () => {
        setFormData(initialFormData);
        setErrors(initialFormErrors);
        onClose();
    };

    return (
        <AssetDialogForm
            open={open}
            onClose={handleClose}
            title="Add Asset"
            submitButtonText="Add"
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
            handleSubmit={handleFormSubmit}
            isLoading={loading}
        />
    );
};

export default CreateAssetDialog;