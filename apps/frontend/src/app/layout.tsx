"use client";

import { AuthProvider } from "@/context/AuthContext";
import ApolloWrapper from "@/lib/apolloWrapper";
import { createTheme, ThemeProvider } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2", 
    },
    secondary: {
      main: "#9c27b0", 
    },
  },
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <ApolloWrapper><AuthProvider>{children}</AuthProvider></ApolloWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
