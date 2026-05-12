import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const siteId = process.env.NEXT_PUBLIC_SITE_ID
    const { data } = siteId
      ? await supabase.from('site_settings').select('site_name, site_title, favicon_url').eq('site_id', siteId).single()
      : await supabase.from('platform_settings').select('site_name, favicon_url').eq('id', 1).single()
    const title = (data as any)?.site_title || (data as any)?.site_name || 'BetaBinary'
    return {
      title,
      description: `${(data as any)?.site_name || 'BetaBinary'} Trading Platform`,
      icons: (data as any)?.favicon_url ? [{ url: (data as any).favicon_url }] : undefined,
    }
  } catch {
    return { title: 'BetaBinary', description: 'BetaBinary Trading Platform' }
  }
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
