import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ASSET_BY_ID_QUERY } from '@/graphql/queries/GetAssetById.query';
import { useUpdateAssetMutation } from '@/graphql/models/generated';
import AssetDialogForm, { 
    initialFormData, 
    initialFormErrors, 
    validateAssetForm, 
    AssetFormData, 
    AssetFormErrors 
} from './AssetDialogForm';

interface EditAssetDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assetId: string | null;
}

const EditAssetDialog: React.FC<EditAssetDialogProps> = ({ open, onClose, onSuccess, assetId }) => {
    const [formData, setFormData] = useState<AssetFormData>(initialFormData);
    const [errors, setErrors] = useState<AssetFormErrors>(initialFormErrors);
    
    const [updateAsset, { loading: updateLoading }] = useUpdateAssetMutation();
    
    // Fetch the asset data when the dialog opens and assetId changes
    const { data: assetData } = useQuery(GET_ASSET_BY_ID_QUERY, {
        variables: { id: assetId },
        skip: !assetId || !open,
    });
    
    // Populate form when asset data is fetched
    useEffect(() => {
        if (assetData?.asset) {
            const asset = assetData.asset;
            let valueStrategyType = '';
            let growthRate = '';
            let apiSource = '';
            let manualValue = '';
            
            // Determine value strategy type and populate related fields
            if (asset.valueStrategy.__typename === 'FixedValueStrategy') {
                valueStrategyType = 'fixed';
                growthRate = asset.valueStrategy.growthRate.toString();
            } else if (asset.valueStrategy.__typename === 'DynamicValueStrategy') {
                valueStrategyType = 'dynamic';
                apiSource = asset.valueStrategy.apiSource;
            } else if (asset.valueStrategy.__typename === 'ManualValueStrategy') {
                valueStrategyType = 'manual';
                manualValue = asset.valueStrategy.value.toString();
            }
            
            setFormData({
                name: asset.name,
                description: asset.description || '',
                category: asset.category,
                riskLevel: asset.riskLevel,
                currency: asset.currency,
                maturityDate: asset.maturityDate ? asset.maturityDate.substring(0, 10) : '',
                valueStrategyType,
                growthRate,
                apiSource,
                manualValue,
            });
        } else {
            setFormData(initialFormData);
        }
    }, [assetData]);

    const handleFormSubmit = async () => {
        const [isValid, newErrors] = validateAssetForm(formData);
        setErrors(newErrors);
        if (!isValid || !assetId) return;

        // We need to build the input in a way that matches the GraphQL schema types
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
                apiSource: formData.apiSource
            };
        } else if (formData.valueStrategyType === 'manual') {
            assetInput.manualValueStrategy = {
                type: 'manual',
                value: parseFloat(formData.manualValue)
            };
        }

        try {
            // Update the asset
            await updateAsset({
                variables: {
                    id: assetId,
                    input: assetInput
                },
            });

            onSuccess();
            handleClose();
        } catch (err) {
            console.error('Error updating asset:', err);
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
            title="Edit Asset"
            submitButtonText="Update"
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
            handleSubmit={handleFormSubmit}
            isLoading={updateLoading}
        />
    );
};

export default EditAssetDialog;
