'use client'

import { useEffect, useState } from 'react'

export function useSiteName() {
  const [siteName, setSiteName] = useState('BetaBinary')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/site-name')
      .then(r => r.json())
      .then(d => {
        if (d.site_name) setSiteName(d.site_name)
        if (d.logo_url) setLogoUrl(d.logo_url)
      })
      .catch(() => {})
  }, [])

  return { siteName, logoUrl }
}
