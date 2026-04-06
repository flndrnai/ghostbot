import './globals.css';
import { Sora } from 'next/font/google';
import { ThemeProvider } from '../lib/chat/components/theme-provider.jsx';

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata = {
  title: 'GhostBot',
  description: 'Autonomous AI Coding Agent Platform',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={sora.variable} suppressHydrationWarning>
      <body className="min-h-[100dvh] bg-background text-foreground antialiased grain">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
