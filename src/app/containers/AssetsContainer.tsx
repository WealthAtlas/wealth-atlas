import { AssetRepository } from '@/data/repositories/AssetRepository';
import { Asset } from '@/domain/entities/Asset';
import { AssetTransaction } from '@/domain/entities/AssetTransaction';
import { useEffect, useState } from 'react';
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

  const assetRepository = new AssetRepository();

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      const loadedAssets = await assetRepository.findAll();
      setAssets(loadedAssets);
    } catch (error) {
      // TODO: Add proper error handling with toast/snackbar
      // eslint-disable-next-line no-console
      console.error('Failed to load assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddAsset = () => {
    setAssetToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setAssetToEdit(asset);
    setIsDialogOpen(true);
  };

  const handleAddTransaction = (asset: Asset) => {
    setAssetForTransaction(asset);
    setTransactionToEdit(null); // Clear any existing transaction being edited
    setIsTransactionDialogOpen(true);
  };

  const handleViewTransactions = (asset: Asset) => {
    setAssetForTransactionList(asset);
    setIsTransactionListOpen(true);
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
    loadAssets(); // Reload assets after save
  };

  const handleTransactionSaved = () => {
    loadAssets(); // Reload assets after transaction save
  };

  return (
    <>
      <AssetsPage
        assets={assets}
        isLoading={isLoading}
        onAddAsset={handleAddAsset}
        onEditAsset={handleEditAsset}
        onAddTransaction={handleAddTransaction}
        onViewTransactions={handleViewTransactions}
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
    </>
  );
}
