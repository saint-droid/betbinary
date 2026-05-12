export function getSiteId(): string {
  const id = process.env.NEXT_PUBLIC_SITE_ID
  if (!id) throw new Error('NEXT_PUBLIC_SITE_ID env var is not set')
  return id
}
