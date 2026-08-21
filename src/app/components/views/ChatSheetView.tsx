import { Close } from '@mui/icons-material';
import { Box, IconButton, SwipeableDrawer, Tooltip, Typography } from '@mui/material';
import { ReactNode } from 'react';

export interface ChatSheetViewProps {
  open: boolean;
  providerHost: string;
  configured: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The assistant as a near-full-height bottom sheet.
 *
 * Near-full rather than partial on purpose: chat is sustained typing, and a
 * half-height sheet leaves the composer fighting the on-screen keyboard. At
 * 92dvh the composer sits where it would on a full page, while the tab
 * underneath stays mounted — so dismissing returns the user exactly where they
 * were, with no refetch.
 *
 * `SwipeableDrawer` for the swipe-down dismiss a sheet is expected to have.
 * Opening by edge-swipe is disabled: the only way in is the Ask button, and an
 * accidental swipe over a list should not launch it.
 */
export function ChatSheetView(props: ChatSheetViewProps) {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={props.open}
      onClose={props.onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      // Keeps the conversation alive while the sheet is shut, so reopening
      // resumes the thread instead of starting over.
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          height: '92dvh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            Assistant
          </Typography>
          {props.configured && (
            // Named before anything is sent, the same disclosure the import
            // screen makes.
            <Tooltip title="Your questions and the figures they need are sent to this provider">
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                via {props.providerHost}
              </Typography>
            </Tooltip>
          )}
        </Box>
        <IconButton onClick={props.onClose} aria-label="Close assistant">
          <Close />
        </IconButton>
      </Box>

      {/* Tinted so the white message bubbles read as cards against it. */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'grey.50',
          px: 2,
          pt: 1,
          pb: 1,
        }}
      >
        {props.children}
      </Box>
    </SwipeableDrawer>
  );
}
