import { Asset } from '@/domain/entities/assets/Asset';
import { SIP } from '@/domain/entities/assets/SIP';
import { Logger } from '@/domain/utils/Logger';
import React from 'react';
import { AssetService } from '../../../../domain/services/AssetService';
import { SIPView } from '../../../components/views/SIPView';

export interface SIPViewContainerProps {
  asset: Asset;
  sip: SIP;
  addSIP: () => void;
  refresh: () => void;
}

export function SIPViewContainer({ asset, sip, refresh }: SIPViewContainerProps) {
  const assetService = React.useMemo(() => new AssetService(), []);

  const handleDeleteSIP = async () => {
    try {
      await assetService.deleteSIP(sip.id!);
      refresh();
    } catch (error) {
      Logger.error('Failed to delete SIP:', error);
    }
  };

  return (
    <SIPView key={sip.id} asset={asset} sip={sip} deleteSIP={handleDeleteSIP} refresh={refresh} />
  );
}
