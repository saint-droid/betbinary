'use client'

import { TrendingUp } from 'lucide-react'
import { useSiteName } from '@/hooks/use-site-name'

interface SiteLogoProps {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { icon: 'w-6 h-6', iconInner: 'w-3.5 h-3.5', text: 'text-sm' },
  md: { icon: 'w-8 h-8', iconInner: 'w-4 h-4',   text: 'text-base' },
  lg: { icon: 'w-9 h-9', iconInner: 'w-5 h-5',   text: 'text-xl' },
}

export default function SiteLogo({ size = 'md' }: SiteLogoProps) {
  const { siteName, logoUrl } = useSiteName()
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        <img src={logoUrl} alt={siteName} className={`${s.icon} object-contain rounded-lg`} />
      ) : (
        <div className={`${s.icon} bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0`}>
          <TrendingUp className={`${s.iconInner} text-white`} strokeWidth={2.5} />
        </div>
      )}
      <span className={`font-extrabold tracking-tight text-foreground ${s.text}`}>
        {siteName}
      </span>
    </div>
  )
}
