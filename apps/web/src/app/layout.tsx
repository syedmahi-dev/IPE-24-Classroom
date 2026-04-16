import React from 'react'
import { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'IPE-24 Classroom',
    template: '%s | IPE-24 Classroom'
  },
  description: 'Centralized Academic Management Portal for IPE-24 Batch',
  icons: {
    icon: '/iut-logo.svg',
    shortcut: '/iut-logo.svg',
    apple: '/iut-logo.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IPE-24',
  },
  formatDetection: {
    telephone: false,
  },
}

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-mesh min-h-screen text-slate-800 dark:text-slate-200 selection:bg-brand-500 selection:text-white`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <React.Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
              {children}
              <Toaster richColors position="top-right" />
              <ServiceWorkerRegistrar />
            </React.Suspense>
          </SessionProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
