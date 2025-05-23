import '../styles/globals.css'

import { ZkLoginSessionProvider } from "@shinami/nextjs-zklogin/client";
import type { AppProps } from "next/app";
import { Providers } from '../components/Providers';
import { ThemeProvider } from 'next-themes';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Providers>
          <ZkLoginSessionProvider>
            <Component {...pageProps} />
          </ZkLoginSessionProvider>
        </Providers>
      </ThemeProvider>
  );
}
