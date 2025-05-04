import Sidebar from '@/components/SideBar';
import { Box } from '@mui/material';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Box sx={{ display: 'flex' }}>
          <Sidebar />
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            {children}
          </Box>
        </Box>
      </body>
    </html>
  );
}