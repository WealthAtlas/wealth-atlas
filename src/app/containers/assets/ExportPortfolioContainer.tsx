import { PortfolioExportService } from '@/domain/services/PortfolioExportService';
import { useState } from 'react';
import { ExportPortfolioDialog } from '../../components/dialogs/ExportPortfolioDialog';

export interface ExportPortfolioContainerProps {
  open: boolean;
  onClose: () => void;
}

export function ExportPortfolioContainer({ open, onClose }: ExportPortfolioContainerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const exportService = new PortfolioExportService();

  const handleExportClipboard = async (categories: string[]) => {
    setIsExporting(true);
    try {
      const data = await exportService.generateExportData({ categories });
      const markdown = exportService.toMarkdown(data);
      await navigator.clipboard.writeText(markdown);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTxt = async (categories: string[]) => {
    setIsExporting(true);
    try {
      const data = await exportService.generateExportData({ categories });
      const markdown = exportService.toMarkdown(data);
      downloadFile(markdown, 'portfolio-summary.txt', 'text/plain');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = async (categories: string[]) => {
    setIsExporting(true);
    try {
      const data = await exportService.generateExportData({ categories });
      const json = exportService.toJSON(data);
      downloadFile(json, 'portfolio-data.json', 'application/json');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async (categories: string[]) => {
    setIsExporting(true);
    try {
      const data = await exportService.generateExportData({ categories });
      const csv = exportService.toCSV(data);
      downloadFile(csv, 'portfolio-data.csv', 'text/csv');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ExportPortfolioDialog
      open={open}
      isExporting={isExporting}
      onClose={onClose}
      onExportClipboard={handleExportClipboard}
      onExportTxt={handleExportTxt}
      onExportJson={handleExportJson}
      onExportCsv={handleExportCsv}
    />
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
