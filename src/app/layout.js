import './globals.css';
import { Sora } from 'next/font/google';
import { ThemeProvider } from '../lib/chat/components/theme-provider.jsx';
import SetupBanner from '../components/SetupBanner.jsx';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister.jsx';
import DemoBanner from '../components/DemoBanner.jsx';

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata = {
  title: 'GhostBot',
  description: 'Autonomous AI Coding Agent Platform',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'GhostBot',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#050509',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={sora.variable} suppressHydrationWarning>
      <body className="min-h-[100dvh] bg-background text-foreground antialiased grain">
        <ThemeProvider>
          <DemoBanner />
          <SetupBanner />
          <ServiceWorkerRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
