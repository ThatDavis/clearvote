import type { Metadata } from 'next'
import { Cormorant_Garamond, Geist_Mono } from 'next/font/google'
import { ToastProvider } from '@/components/toast-provider'
import '@/lib/env'
import Navbar from './navbar'
import SessionProvider from './session-provider'
import './globals.css'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'clearvote — ranked-choice voting for communities',
  description: 'A simple ranked-choice voting system for community-run spaces.',
  icons: {
    icon: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <ToastProvider>
            <Navbar />
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
