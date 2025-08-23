import { Cloud, CloudDownload, CloudUpload, Key, Link, LinkOff } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

export interface SettingsPageProps {
  // Sync status
  keyId?: string;
  lastRemoteVersion?: number;
  lastSyncAt?: string;
  autoSyncEnabled: boolean;
  hasStoredPassphrase: boolean;
  // Handlers
  onSetup: (passphrase: string, enableAutoSync: boolean) => void;
  onLink: (keyId: string, passphrase: string, enableAutoSync: boolean) => void;
  onPush: (passphrase?: string) => void;
  onPull: (passphrase?: string) => void;
  onChangePassphrase: (oldPass: string, newPass: string) => void;
  onUnlink: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
}

export function SettingsPage(props: SettingsPageProps) {
  const [pass, setPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [kidInput, setKidInput] = useState('');
  const [enableAutoSync, setEnableAutoSync] = useState(false);

  const isLinked = Boolean(props.keyId);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure your preferences and sync.
      </Typography>

      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">
            <Cloud sx={{ mr: 1, verticalAlign: 'middle' }} /> Sync
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Key ID: {props.keyId ?? 'not set'} | Remote version: {props.lastRemoteVersion ?? '-'} |
            Last sync: {props.lastSyncAt ?? '-'}
            {isLinked && (
              <>
                <br />
                Auto-sync: {props.autoSyncEnabled ? 'enabled' : 'disabled'} | Passphrase stored:{' '}
                {props.hasStoredPassphrase ? 'yes' : 'no'}
              </>
            )}
          </Typography>

          {!isLinked && (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  label="Passphrase"
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                />
                <Button
                  variant="contained"
                  startIcon={<Key />}
                  onClick={() => props.onSetup(pass, enableAutoSync)}
                  disabled={!pass}
                >
                  Setup
                </Button>
              </Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableAutoSync}
                    onChange={e => setEnableAutoSync(e.target.checked)}
                  />
                }
                label="Enable auto-sync (stores passphrase locally)"
              />
            </Stack>
          )}

          {!isLinked && (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  label="Key ID"
                  value={kidInput}
                  onChange={e => setKidInput(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Passphrase"
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                />
                <Button
                  variant="outlined"
                  startIcon={<Link />}
                  onClick={() => props.onLink(kidInput, pass, enableAutoSync)}
                  disabled={!kidInput || !pass}
                >
                  Link
                </Button>
              </Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableAutoSync}
                    onChange={e => setEnableAutoSync(e.target.checked)}
                  />
                }
                label="Enable auto-sync (stores passphrase locally)"
              />
            </Stack>
          )}

          {isLinked && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={props.autoSyncEnabled}
                    onChange={e => props.onToggleAutoSync(e.target.checked)}
                  />
                }
                label="Auto-sync on app startup (requires stored passphrase)"
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  label="Passphrase"
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder={
                    props.hasStoredPassphrase ? 'Using stored passphrase' : 'Enter passphrase'
                  }
                />
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => props.onPush(pass || undefined)}
                  disabled={!pass && !props.hasStoredPassphrase}
                >
                  Push
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloudDownload />}
                  onClick={() => props.onPull(pass || undefined)}
                  disabled={!pass && !props.hasStoredPassphrase}
                >
                  Pull
                </Button>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  label="Old passphrase"
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="New passphrase"
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                />
                <Button
                  variant="text"
                  startIcon={<Key />}
                  onClick={() => props.onChangePassphrase(pass, newPass)}
                  disabled={!pass || !newPass}
                >
                  Change passphrase
                </Button>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<LinkOff />}
                  onClick={() => props.onUnlink()}
                >
                  Unlink
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
