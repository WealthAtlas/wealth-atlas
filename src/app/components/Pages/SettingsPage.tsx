import {
  ArrowBack,
  Cloud,
  CloudDownload,
  CloudUpload,
  ContentCopy,
  Key,
  Link,
  LinkOff,
} from '@mui/icons-material';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Logger } from '../../../domain/utils/Logger';

export interface SettingsPageProps {
  // Sync status
  keyId?: string;
  lastRemoteVersion?: number;
  lastSyncAt?: string;
  hasStoredPassphrase: boolean;
  // Handlers
  onSetup: (passphrase: string) => void;
  onLink: (keyId: string, passphrase: string) => void;
  onPush: () => void;
  onPull: () => void;
  onChangePassphrase: (oldPass: string, newPass: string) => void;
  onUnlink: () => void;
  onBack: () => void;
}

export function SettingsPage(props: SettingsPageProps) {
  const [pass, setPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [kidInput, setKidInput] = useState('');
  const [mode, setMode] = useState<'setup' | 'link'>('setup');
  const [copySuccess, setCopySuccess] = useState(false);

  const isLinked = Boolean(props.keyId);

  const handleCopyKeyId = async () => {
    if (props.keyId) {
      try {
        await navigator.clipboard.writeText(props.keyId);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        // Fallback for browsers that don't support clipboard API
        Logger.error('Failed to copy: ', err);
      }
    }
  };

  return (
    <Box>
      <AppBar position="fixed" color="primary" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={props.onBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Settings
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, pt: 10 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Configure your preferences and sync.
        </Typography>

        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">
              <Cloud sx={{ mr: 1, verticalAlign: 'middle' }} /> Sync
            </Typography>

            {isLinked ? (
              <>
                <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Sync Information
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Key ID:
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontFamily="monospace">
                            {props.keyId}
                          </Typography>
                          <IconButton size="small" onClick={handleCopyKeyId}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Remote Version:
                        </Typography>
                        <Typography variant="body2">{props.lastRemoteVersion ?? '-'}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Last Sync:
                        </Typography>
                        <Typography variant="body2">{props.lastSyncAt ?? 'Never'}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {copySuccess && (
                  <Alert severity="success" onClose={() => setCopySuccess(false)}>
                    Key ID copied to clipboard!
                  </Alert>
                )}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={() => props.onPush()}
                    fullWidth
                  >
                    Push to Cloud
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CloudDownload />}
                    onClick={() => props.onPull()}
                    fullWidth
                  >
                    Pull from Cloud
                  </Button>
                </Stack>

                {!props.hasStoredPassphrase && (
                  <Alert severity="warning">
                    Passphrase not stored locally. Push/Pull operations will require manual
                    passphrase entry.
                  </Alert>
                )}

                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Security Actions
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    fullWidth
                    label="Current passphrase"
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
                    variant="outlined"
                    startIcon={<Key />}
                    onClick={() => props.onChangePassphrase(pass, newPass)}
                    disabled={!pass || !newPass}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    Change
                  </Button>
                </Stack>

                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<LinkOff />}
                  onClick={() => props.onUnlink()}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Disconnect Sync
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Set up cloud sync to keep your data synchronized across devices. Choose to create
                  a new sync setup or connect to an existing one.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                  <Button
                    variant={mode === 'setup' ? 'contained' : 'outlined'}
                    onClick={() => setMode('setup')}
                    fullWidth
                  >
                    Create New Setup
                  </Button>
                  <Button
                    variant={mode === 'link' ? 'contained' : 'outlined'}
                    onClick={() => setMode('link')}
                    fullWidth
                  >
                    Connect to Existing
                  </Button>
                </Stack>

                {mode === 'setup' && (
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Passphrase"
                      type="password"
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      helperText="Choose a strong passphrase to encrypt your data"
                    />
                    <Button
                      variant="contained"
                      startIcon={<Key />}
                      onClick={() => props.onSetup(pass)}
                      disabled={!pass}
                      fullWidth
                    >
                      Create Sync Setup
                    </Button>
                  </Stack>
                )}

                {mode === 'link' && (
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Key ID"
                      value={kidInput}
                      onChange={e => setKidInput(e.target.value)}
                      helperText="Enter the Key ID from your existing setup"
                    />
                    <TextField
                      fullWidth
                      label="Passphrase"
                      type="password"
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      helperText="Enter the passphrase for your existing setup"
                    />
                    <Button
                      variant="contained"
                      startIcon={<Link />}
                      onClick={() => props.onLink(kidInput, pass)}
                      disabled={!kidInput || !pass}
                      fullWidth
                    >
                      Connect to Existing
                    </Button>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
