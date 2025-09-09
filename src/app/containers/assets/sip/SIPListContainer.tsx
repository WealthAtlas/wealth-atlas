import React, { useCallback, useEffect } from 'react';
import { IAsset } from '../../../../domain/entities/assets/Asset';
import { SIP } from '../../../../domain/entities/assets/SIP';
import { AssetService } from '../../../../domain/services/AssetService';
import { Logger } from '../../../../domain/utils/Logger';
import { SIPListDialog } from '../../../components/dialogs/SIPListDialog';

export interface SIPListContainerProps {
  open: boolean;
  asset: IAsset;
  onClose: () => void;
}

export function SIPListContainer({ open, asset, onClose }: SIPListContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);
  const [sips, setSIPs] = React.useState<SIP[]>([]);
  const [showAddTransaction, setShowAddTransaction] = React.useState<boolean>(false);

  const loadSIPs = useCallback(async () => {
    try {
      const sips = await assetService.getSIPByAssetId(asset.id!);
      setSIPs(sips);
    } catch (error) {
      Logger.error('Failed to load SIPs:', error);
    }
  }, [assetService, asset.id]);

  useEffect(() => {
    loadSIPs();
  }, [loadSIPs]);

  const refresh = useCallback(() => {
    loadSIPs();
  }, [loadSIPs]);

  const deleteSIP = useCallback(
    async (id: number) => {
      try {
        await assetService.deleteSIP(id);
        await loadSIPs();
      } catch (error) {
        Logger.error('Failed to delete SIP:', error);
      }
    },
    [assetService, loadSIPs]
  );

  return (
    <SIPListDialog
      open={open}
      asset={asset}
      sips={sips}
      showAddTransaction={showAddTransaction}
      setShowAddTransaction={setShowAddTransaction}
      deleteSIP={deleteSIP}
      onClose={onClose}
      refresh={refresh}
    />
  );
}
