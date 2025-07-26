/**
 * Root layout component
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProviderWrapper } from '@/components/providers/AuthProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'LastMile Delivery',
    template: '%s | LastMile Delivery',
  },
  description: 'Fast, reliable last-mile delivery service connecting businesses with local riders',
  keywords: ['delivery', 'last-mile', 'logistics', 'courier', 'shipping'],
  authors: [{ name: 'LastMile Delivery Team' }],
  creator: 'LastMile Delivery',
  publisher: 'LastMile Delivery',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'LastMile Delivery',
    title: 'LastMile Delivery - Fast & Reliable Delivery Service',
    description: 'Connect with local riders for fast, reliable last-mile delivery services. Perfect for businesses and individuals.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LastMile Delivery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LastMile Delivery - Fast & Reliable Delivery Service',
    description: 'Connect with local riders for fast, reliable last-mile delivery services.',
    images: ['/og-image.png'],
    creator: '@lastmiledelivery',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProviderWrapper>
          <div id="root">
            {children}
          </div>
          
          {/* Toast Container */}
          <div id="toast-container" className="fixed top-4 right-4 z-50 space-y-2" />
          
          {/* Modal Container */}
          <div id="modal-container" />
        </AuthProviderWrapper>
        
        {/* Analytics Scripts */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics */}
            {process.env.NEXT_PUBLIC_GA_ID && (
              <>
                <script
                  async
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
                />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                        page_title: document.title,
                        page_location: window.location.href,
                      });
                    `,
                  }}
                />
              </>
            )}
          </>
        )}
      </body>
    </html>
  );
}