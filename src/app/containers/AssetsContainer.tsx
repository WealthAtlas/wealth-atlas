import { Asset } from '@/domain/entities/assets/Asset';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { AssetService } from '@/domain/services/AssetService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect, useState } from 'react';
import { SIPManagerDialog } from '../components/Dialogs/SIPManagerDialog';
import { AssetsPage } from '../components/Pages/AssetsPage';
import { AssetFormContainer } from './AssetFormContainer';
import { TransactionFormContainer } from './TransactionFormContainer';
import { TransactionListContainer } from './TransactionListContainer';

export function AssetsContainer() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [assetForTransaction, setAssetForTransaction] = useState<Asset | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<AssetTransaction | null>(null);
  const [isTransactionListOpen, setIsTransactionListOpen] = useState(false);
  const [assetForTransactionList, setAssetForTransactionList] = useState<Asset | null>(null);
  const [isSIPDialogOpen, setIsSIPDialogOpen] = useState(false);
  const [assetForSIP, setAssetForSIP] = useState<Asset | null>(null);

  const assetService = new AssetService();

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      const loadedAssets = await assetService.getAssets();
      setAssets(loadedAssets);
    } catch (error) {
      Logger.error('Failed to load assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleAddAsset = () => {
    setAssetToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setAssetToEdit(asset);
    setIsDialogOpen(true);
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!asset.id) return;

    if (
      !confirm(
        `Are you sure you want to delete "${asset.name}"? This will also delete all associated transactions, scheduled investments (SIPs), and cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await assetService.deleteAsset(asset.id);
      await loadAssets();
    } catch (error) {
      Logger.error('Failed to delete asset:', error);
    }
  };

  const handleViewTransactions = (asset: Asset) => {
    setAssetForTransactionList(asset);
    setIsTransactionListOpen(true);
  };

  const handleManageSIP = (asset: Asset) => {
    setAssetForSIP(asset);
    setIsSIPDialogOpen(true);
  };

  const handleCloseSIPManager = () => {
    setIsSIPDialogOpen(false);
    setAssetForSIP(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setAssetToEdit(null);
  };

  const handleTransactionDialogClose = () => {
    setIsTransactionDialogOpen(false);
    setAssetForTransaction(null);
    setTransactionToEdit(null);
  };

  const handleTransactionListClose = () => {
    setIsTransactionListOpen(false);
    setAssetForTransactionList(null);
  };

  const handleEditTransactionFromList = (transaction: AssetTransaction) => {
    setTransactionToEdit(transaction);
    setAssetForTransaction(assetForTransactionList);
    setIsTransactionListOpen(false);
    setIsTransactionDialogOpen(true);
  };

  const handleAddTransactionFromList = () => {
    setTransactionToEdit(null);
    setAssetForTransaction(assetForTransactionList);
    setIsTransactionListOpen(false);
    setIsTransactionDialogOpen(true);
  };

  const handleAssetSaved = () => {
    loadAssets();
  };

  const handleTransactionSaved = () => {
    loadAssets();
  };

  return (
    <>
      <AssetsPage
        assets={assets}
        isLoading={isLoading}
        onAddAsset={handleAddAsset}
        onEditAsset={handleEditAsset}
        onDeleteAsset={handleDeleteAsset}
        onViewTransactions={handleViewTransactions}
        onManageSIP={handleManageSIP}
        allTransactions={assets.flatMap(asset => asset.getTransactions(new Date(), true))}
      />
      <AssetFormContainer
        open={isDialogOpen}
        assetToEdit={assetToEdit}
        onClose={handleDialogClose}
        onSuccess={handleAssetSaved}
      />
      <TransactionFormContainer
        open={isTransactionDialogOpen}
        asset={assetForTransaction}
        transactionToEdit={transactionToEdit}
        onClose={handleTransactionDialogClose}
        onSuccess={handleTransactionSaved}
      />
      <TransactionListContainer
        open={isTransactionListOpen}
        asset={assetForTransactionList}
        onClose={handleTransactionListClose}
        onAddTransaction={handleAddTransactionFromList}
        onEditTransaction={handleEditTransactionFromList}
        onTransactionDeleted={handleTransactionSaved}
      />
      <SIPManagerDialog
        open={isSIPDialogOpen}
        asset={assetForSIP}
        onClose={handleCloseSIPManager}
      />
    </>
  );
}
