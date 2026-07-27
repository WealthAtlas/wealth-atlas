import { LlmPreset } from '@/data/llm/presets';
import { AutoAwesome, Check, Science } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

export interface AiProviderSettingsViewProps {
  presets: LlmPreset[];
  presetId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  configured: boolean;
  needsApiKey: boolean;
  isTesting: boolean;
  testResult?: { ok: boolean; message: string };
  onPresetChange: (presetId: string) => void;
  onBaseUrlChange: (baseUrl: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onModelChange: (model: string) => void;
  onTest: () => void;
  onClear: () => void;
}

export function AiProviderSettingsView(props: AiProviderSettingsViewProps) {
  const selectedPreset = props.presets.find(preset => preset.id === props.presetId);

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoAwesome color="primary" />
          <Typography variant="h6">AI Import</Typography>
          {props.configured ? (
            <Chip size="small" color="success" label="Configured" />
          ) : (
            <Chip size="small" label="Not configured" />
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Connect your own LLM to read broker and bank statements. Any OpenAI-compatible endpoint
          works. Your key is stored on this device only — it is never included in a backup or
          synced.
        </Typography>

        <FormControl fullWidth>
          <InputLabel>Provider</InputLabel>
          <Select
            value={props.presetId}
            label="Provider"
            onChange={event => props.onPresetChange(event.target.value)}
          >
            {props.presets.map(preset => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedPreset?.hint && (
          <Typography variant="caption" color="text.secondary">
            {selectedPreset.hint}
          </Typography>
        )}

        {selectedPreset && !selectedPreset.browserFriendly && (
          <Alert severity="info">
            {selectedPreset.label} may block requests made directly from a browser. If the test
            fails with a network error, use OpenRouter or a local Ollama, or point the base URL at
            your own proxy.
          </Alert>
        )}

        <TextField
          label="Base URL"
          value={props.baseUrl}
          onChange={event => props.onBaseUrlChange(event.target.value)}
          placeholder="https://openrouter.ai/api/v1"
          fullWidth
        />

        <TextField
          label="API key"
          type="password"
          value={props.apiKey}
          onChange={event => props.onApiKeyChange(event.target.value)}
          placeholder={props.needsApiKey ? 'sk-…' : 'Not required for a local endpoint'}
          autoComplete="off"
          fullWidth
        />

        <TextField
          label="Model"
          value={props.model}
          onChange={event => props.onModelChange(event.target.value)}
          placeholder="deepseek/deepseek-chat"
          fullWidth
        />

        {props.testResult && (
          <Alert severity={props.testResult.ok ? 'success' : 'error'}>
            {props.testResult.message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={props.testResult?.ok ? <Check /> : <Science />}
            onClick={props.onTest}
            disabled={props.isTesting || !props.configured}
          >
            {props.isTesting ? 'Testing…' : 'Test connection'}
          </Button>
          <Button variant="outlined" color="inherit" onClick={props.onClear}>
            Clear
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
