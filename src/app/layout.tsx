import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ToastProvider } from '@/components/toast-provider'
import Navbar from './navbar'
import SessionProvider from './session-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
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
