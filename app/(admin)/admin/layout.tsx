import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-auth'
import AdminShell from '@/components/admin/AdminShell'

export const metadata = { title: 'Admin — Edge Forex' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin-login')

  return (
    <AdminShell adminName={session.name}>
      {children}
    </AdminShell>
  )
}
