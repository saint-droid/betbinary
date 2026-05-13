import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/sonner"


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'BetaBinary'

export const metadata: Metadata = {
  title: SITE_NAME,
  description: `${SITE_NAME} Trading Platform`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0d1525',
                border: '1px solid #1f2937',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#fff',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
