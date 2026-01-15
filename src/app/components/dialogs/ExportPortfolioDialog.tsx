import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import {
    ContentCopy,
    DataObject,
    Description,
    TableChart,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    FormGroup,
    Snackbar,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useState } from 'react';

export interface ExportPortfolioDialogProps {
  open: boolean;
  isExporting: boolean;
  onClose: () => void;
  onExportClipboard: (categories: string[]) => Promise<void>;
  onExportTxt: (categories: string[]) => Promise<void>;
  onExportJson: (categories: string[]) => Promise<void>;
  onExportCsv: (categories: string[]) => Promise<void>;
}

const allCategories = Object.values(AssetCategory);

export function ExportPortfolioDialog({
  open,
  isExporting,
  onClose,
  onExportClipboard,
  onExportTxt,
  onExportJson,
  onExportCsv,
}: ExportPortfolioDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleSelectAll = () => {
    setSelectedCategories(allCategories);
  };

  const handleDeselectAll = () => {
    setSelectedCategories([]);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleExportClipboard = async () => {
    await onExportClipboard(selectedCategories);
    showSnackbar('Portfolio summary copied to clipboard!');
  };

  const handleExportTxt = async () => {
    await onExportTxt(selectedCategories);
    showSnackbar('Markdown file downloaded!');
  };

  const handleExportJson = async () => {
    await onExportJson(selectedCategories);
    showSnackbar('JSON file downloaded!');
  };

  const handleExportCsv = async () => {
    await onExportCsv(selectedCategories);
    showSnackbar('CSV file downloaded!');
  };

  const hasSelection = selectedCategories.length > 0;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
        <DialogTitle>Export Portfolio for Analysis</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Export your portfolio data to use with LLMs like Perplexity, ChatGPT, or Claude for
            personalized investment insights.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Filter by Category
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button size="small" onClick={handleSelectAll} disabled={isExporting}>
              Select All
            </Button>
            <Button size="small" onClick={handleDeselectAll} disabled={isExporting}>
              Deselect All
            </Button>
          </Stack>

          <FormGroup sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 0,
              }}
            >
              {allCategories.map(category => (
                <FormControlLabel
                  key={category}
                  control={
                    <Checkbox
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      disabled={isExporting}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">{category}</Typography>}
                />
              ))}
            </Box>
          </FormGroup>

          {!hasSelection && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please select at least one category to export.
            </Alert>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Export Format
          </Typography>

          <Stack spacing={1}>
            <Button
              variant="contained"
              startIcon={<ContentCopy />}
              onClick={handleExportClipboard}
              disabled={!hasSelection || isExporting}
              fullWidth
            >
              Copy to Clipboard (Markdown)
            </Button>

            <Button
              variant="outlined"
              startIcon={<Description />}
              onClick={handleExportTxt}
              disabled={!hasSelection || isExporting}
              fullWidth
            >
              Download as Text (.txt)
            </Button>

            <Button
              variant="outlined"
              startIcon={<DataObject />}
              onClick={handleExportJson}
              disabled={!hasSelection || isExporting}
              fullWidth
            >
              Download as JSON (.json)
            </Button>

            <Button
              variant="outlined"
              startIcon={<TableChart />}
              onClick={handleExportCsv}
              disabled={!hasSelection || isExporting}
              fullWidth
            >
              Download as CSV (.csv)
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isExporting}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </>
  );
}
