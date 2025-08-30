import { Delete, Edit } from '@mui/icons-material';
import { Box, Card, CardContent, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { Asset } from '../../../domain/entities/assets/Asset';
import { SIP } from '../../../domain/entities/assets/SIP';
import { SIPFormContainer } from '../../containers/assets/sips/SIPFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface SIPViewProps {
  asset: Asset;
  sip: SIP;
  deleteSIP: (id: number) => void;
  refresh: () => void;
}

export function SIPView({ asset, sip, deleteSIP, refresh }: SIPViewProps) {
  const [showSIPEdit, setShowSIPEdit] = useState<boolean>(false);

  return (
    <>
      {showSIPEdit && (
        <SIPFormContainer
          open={showSIPEdit}
          asset={asset}
          sipToEdit={sip}
          onClose={() => setShowSIPEdit(false)}
          onSuccess={() => {
            setShowSIPEdit(false);
            refresh();
          }}
        />
      )}
      <Card sx={{ marginBottom: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SIP Configuration
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Start Date: {new Date(sip.startDate).toLocaleDateString()}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            End Date: {sip.endDate ? new Date(sip.endDate).toLocaleDateString() : 'Ongoing'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Frequency: {sip.frequency}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Quantity: {sip.quantity !== undefined ? sip.quantity.toLocaleString() : 'N/A'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Price: {UIUtils.formatCurrency(sip.price, asset.currency)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Total Amount: {UIUtils.formatCurrency((sip.quantity || 1) * sip.price, asset.currency)}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, marginTop: 2 }}>
            <Tooltip title="Edit SIP">
              <IconButton size="small" onClick={() => setShowSIPEdit(true)} aria-label="edit sip">
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete SIP">
              <IconButton
                size="small"
                onClick={() => deleteSIP(sip.id!)}
                aria-label="delete sip"
                color="error"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    </>
  );
}
