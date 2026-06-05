import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { Toaster } from 'sonner';
import LGPDConsentBanner from '@/components/LGPDConsentBanner';
import Footer from '@/components/Footer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://literaconnect.vercel.app';
const APP_NAME = 'LiteraConnect';
const APP_DESCRIPTION = 'Rede social literária para compartilhar resenhas, descobrir livros e conectar leitores.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: ['resenhas', 'livros', 'leitura', 'rede social literária', 'literatura'],
  authors: [{ name: 'LiteraConnect' }],
  creator: 'LiteraConnect',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: APP_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#b81c2e' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1c24' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="text-brand-1 font-sans antialiased min-h-screen" suppressHydrationWarning>
        {/* Skip to content — acessibilidade WCAG 2.1 */}
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>

        <ThemeProvider>
          <AuthProvider>
            <div className="flex flex-col md:flex-row min-h-screen">
              <Navigation />
              <main
                id="main-content"
                className="flex-1 md:ml-64 pb-20 md:pb-0"
                tabIndex={-1}
                aria-label="Conteúdo principal"
              >
                {children}
                <Footer />
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>

        <Toaster richColors position="top-center" />

        {/* Registra Service Worker apenas no client */}
        <ServiceWorkerRegistrar />
        
        <LGPDConsentBanner />
      </body>
    </html>
  );
}
