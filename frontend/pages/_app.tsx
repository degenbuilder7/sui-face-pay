import '../styles/globals.css'

import { ZkLoginSessionProvider } from "@shinami/nextjs-zklogin/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppProps } from "next/app";
import { Providers } from '../components/Providers';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '../components/ThemeToggle';

const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Providers>
          <ZkLoginSessionProvider>
            <Component {...pageProps} />
          </ZkLoginSessionProvider>
        </Providers>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
