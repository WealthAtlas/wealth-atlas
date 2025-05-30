import React, { useState, useEffect } from 'react';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { executeValueScript } from '@/utils/scriptExecutor';

interface DynamicAssetValueProps {
  scriptCode: string;
  onValueCalculated?: (value: number) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  bypassCache?: boolean;
  cacheTTL?: number; // in milliseconds
}

const DynamicAssetValue: React.FC<DynamicAssetValueProps> = ({
  scriptCode,
  onValueCalculated,
  autoRefresh = false,
  refreshInterval = 300000, // default 5 minutes
  bypassCache = false, // default to use cache if available
  cacheTTL = 300000 // default 5 minutes
}) => {
  const [value, setValue] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to execute the script and update the value
  const fetchValue = async () => {
    if (!scriptCode || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await executeValueScript(scriptCode, {
        bypassCache, 
        cacheTTL
      });
      setValue(result);
      setLastUpdated(new Date());
      
      // Call the callback if provided
      if (onValueCalculated) {
        onValueCalculated(result);
      }
    } catch (err) {
      console.error('Error executing dynamic asset value script:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    // Initial fetch
    fetchValue();

    // Set up interval for refreshing
    const intervalId = setInterval(() => {
      fetchValue();
    }, refreshInterval);

    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [scriptCode, autoRefresh, refreshInterval]);

  // Format the time string
  const formattedTime = lastUpdated 
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(lastUpdated)
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Fetching latest value...</Typography>
        </Box>
      ) : error ? (
        <Box sx={{ color: 'error.main' }}>
          <Typography variant="body2">Error: {error}</Typography>
          <Button 
            size="small" 
            onClick={fetchValue}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Box>
      ) : value !== null ? (
        <Box>
          <Typography variant="h5" component="div">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2
            }).format(value)}
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Last updated: {formattedTime}
            </Typography>
          )}
          {!autoRefresh && (
            <Button 
              size="small" 
              onClick={fetchValue}
              sx={{ ml: 2 }}
            >
              Refresh
            </Button>
          )}
        </Box>
      ) : (
        <Button 
          variant="outlined" 
          size="small" 
          onClick={fetchValue}
          disabled={!scriptCode}
        >
          Fetch Value
        </Button>
      )}
    </Box>
  );
};

export default DynamicAssetValue;
