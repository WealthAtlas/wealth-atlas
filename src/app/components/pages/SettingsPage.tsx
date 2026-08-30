import {
  ArrowBack,
  Cloud,
  ContentCopy,
  Download,
  Key,
  Link,
  LinkOff,
  Storage,
  Upload,
} from '@mui/icons-material';
import {
  Alert,
  AlertTitle,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { AiProviderSettingsContainer } from '@/app/containers/settings/AiProviderSettingsContainer';
import { CurrencySettingsContainer } from '@/app/containers/settings/CurrencySettingsContainer';
import { MemorySettingsContainer } from '@/app/containers/settings/MemorySettingsContainer';
import { NewsProviderSettingsContainer } from '@/app/containers/settings/NewsProviderSettingsContainer';
import { TargetAllocationSettingsContainer } from '@/app/containers/settings/TargetAllocationSettingsContainer';
import { useState } from 'react';
import type { SyncConflict, SyncOverwrite } from '@/data/sync/conflict';
import { Logger } from '../../../domain/utils/Logger';

export interface SettingsPageProps {
  // Sync status
  keyId?: string;
  lastSyncAt?: string;
  autoSyncEnabled?: boolean;
  /** A refused sync waiting on the user. The only thing that clears it. */
  conflict?: SyncConflict;
  /** A push that replaced another device's work. A report, not a question. */
  overwrite?: SyncOverwrite;
  // Handlers
  onSetup: (passphrase: string) => void;
  onLink: (keyId: string, passphrase: string) => void;
  onUnlink: () => void;
  onToggleAutoSync?: (enabled: boolean) => void;
  onResolveConflict: (resolution: 'keep-local' | 'take-remote') => void;
  onDismissOverwrite: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onBack: () => void;
}

/**
 * A machine timestamp, shown in local time because for these the time of day is
 * the content — see `UIUtils.formatDate` for why calendar days are the opposite.
 */
function formatInstant(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleString();
}

export function SettingsPage(props: SettingsPageProps) {
  const [pass, setPass] = useState('');
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

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      props.onImportData(file);
      // Reset the input value to allow selecting the same file again
      event.target.value = '';
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
                {/*
                  First in the section, because it is the only thing here the
                  user has to act on: a refused sync stops this device pushing
                  and pulling until it is answered, and nothing else clears it.
                */}
                {props.conflict && (
                  <Alert severity="warning">
                    <AlertTitle>This device and the cloud have both changed</AlertTitle>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      Sync is paused. Wealth Atlas does not merge two copies — keep one, and the
                      other is overwritten. Export a backup first if you are unsure.
                    </Typography>
                    {/*
                      When the other copy was saved, not what version it is: the
                      number never answered the question someone actually has
                      when choosing which copy to keep.
                    */}
                    {formatInstant(props.conflict.remoteUpdatedAt) && (
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        The cloud copy was last saved{' '}
                        <strong>{formatInstant(props.conflict.remoteUpdatedAt)}</strong>.
                      </Typography>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        variant="contained"
                        size="small"
                        color="warning"
                        onClick={() => props.onResolveConflict('keep-local')}
                      >
                        Keep this device
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        onClick={() => props.onResolveConflict('take-remote')}
                      >
                        Use the cloud copy
                      </Button>
                    </Stack>
                  </Alert>
                )}

                {/*
                  A report rather than a question: the cloud already holds this
                  device's copy and there is nothing here to choose. What it buys
                  is the chance to rescue the other device before it pulls.
                */}
                {props.overwrite && (
                  <Alert severity="error" onClose={props.onDismissOverwrite}>
                    <AlertTitle>Another device saved at the same moment</AlertTitle>
                    <Typography variant="body2">
                      Two devices published at once and the cloud took both writes, so one of the
                      two copies is gone. Which one is not knowable from here. Open Wealth Atlas on
                      your other device and export a backup <strong>before</strong> it syncs — if
                      its copy is the one that was replaced, that export is all there is.
                    </Typography>
                  </Alert>
                )}

                <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                  <CardContent>
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
                          Last sync:
                        </Typography>
                        <Typography variant="body2">
                          {formatInstant(props.lastSyncAt) ?? 'Never'}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {copySuccess && (
                  <Alert severity="success" onClose={() => setCopySuccess(false)}>
                    Key ID copied to clipboard!
                  </Alert>
                )}

                {/*
                  The only sync control there is. Opening the app pulls and every
                  edit publishes, so there is nothing left for a Push or a Pull
                  button to do that this switch does not already govern.
                */}
                <Stack spacing={0.5}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={props.autoSyncEnabled ?? false}
                        onChange={e => props.onToggleAutoSync?.(e.target.checked)}
                      />
                    }
                    label="Keep this device in sync automatically"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Pulls when the app opens and publishes a few seconds after each edit. If another
                    device has saved in the meantime, sync stops and asks which copy to keep rather
                    than replacing either one.
                  </Typography>
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
                    <Alert severity="warning">
                      Connecting replaces everything on this device with the data from that sync
                      key. Export a backup below first if this device holds anything you want to
                      keep.
                    </Alert>
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

        {/* AI Import provider configuration */}
        <CurrencySettingsContainer />

        <TargetAllocationSettingsContainer />

        <AiProviderSettingsContainer />

        <NewsProviderSettingsContainer />

        <MemorySettingsContainer />

        {/* Local Backup Section */}
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">
              <Storage sx={{ mr: 1, verticalAlign: 'middle' }} /> Local Backup
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Export your data as a JSON file for local backup, or import data from a backup file.
              Importing will replace all existing data.
            </Typography>

            <Stack spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={props.onExportData}
                fullWidth
              >
                Export Data
              </Button>

              <Box>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  style={{ display: 'none' }}
                  id="import-file-input"
                />
                <label htmlFor="import-file-input">
                  <Button
                    variant="outlined"
                    startIcon={<Upload />}
                    component="span"
                    fullWidth
                    color="warning"
                  >
                    Import Data
                  </Button>
                </label>
              </Box>

              <Alert severity="warning" sx={{ mt: 1 }}>
                <strong>Warning:</strong> Importing data will completely replace your existing data.
                Make sure to export your current data first as a backup.
              </Alert>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
