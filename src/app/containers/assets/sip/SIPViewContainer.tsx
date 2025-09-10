import React, { useCallback, useEffect, useState } from 'react';
import { IAsset } from '../../../../domain/entities/assets/Asset';
import { SIP } from '../../../../domain/entities/assets/SIP';
import { AssetService } from '../../../../domain/services/AssetService';
import { Logger } from '../../../../domain/utils/Logger';
import { SIPView } from '../../../components/views/SIPView';

export interface SIPViewContainerProps {
  asset: IAsset;
  sipId: number;
  deleteSIP: (id: number) => void;
}

export function SIPViewContainer({ asset, sipId, deleteSIP }: SIPViewContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);
  const [sip, setSIP] = React.useState<SIP | undefined>(undefined);
  const [showTransactionEdit, setShowTransactionEdit] = useState<boolean>(false);

  const loadSIP = useCallback(async () => {
    try {
      const sip = (await assetService.getSIPsByAssetId(asset.id!)).filter(
        pay => pay.id === sipId
      )[0];
      setSIP(sip);
    } catch (error) {
      Logger.error('Failed to load SIP:', error);
    }
  }, [assetService, asset.id, sipId]);

  useEffect(() => {
    loadSIP();
  }, [loadSIP]);

  const refresh = useCallback(() => {
    loadSIP();
  }, [loadSIP]);

  return (
    <>
      {sip && (
        <SIPView
          sip={sip}
          showTransactionEdit={showTransactionEdit}
          deleteSIP={deleteSIP}
          refresh={refresh}
          setShowTransactionEdit={setShowTransactionEdit}
          asset={asset}
        />
      )}
    </>
  );
}
