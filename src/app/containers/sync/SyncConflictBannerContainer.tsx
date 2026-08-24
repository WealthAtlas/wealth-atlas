import { SyncConflictBannerView } from '@/app/components/views/SyncConflictBannerView';
import { getSyncConflict, onSyncConflictChanged, SyncConflict } from '@/data/sync/conflict';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/** Carries a refused sync to wherever the user happens to be. */
export function SyncConflictBannerContainer() {
  const navigate = useNavigate();
  const [conflict, setConflict] = useState<SyncConflict | undefined>(() => getSyncConflict());

  useEffect(() => onSyncConflictChanged(setConflict), []);

  if (!conflict) return null;

  return (
    <SyncConflictBannerView direction={conflict.direction} onReview={() => navigate('/settings')} />
  );
}
