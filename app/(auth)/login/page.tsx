'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Phone, Lock } from 'lucide-react'
import ThemeToggle from '@/components/frontend/ThemeToggle'
import SiteLogo from '@/components/frontend/SiteLogo'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ phone: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, password: formData.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sign in')
      toast.success('Welcome back!')
      router.push('/trade')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">

      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-muted/30 border-r border-border relative overflow-hidden">
        <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[350px] h-[350px] bg-emerald-700/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <SiteLogo size="lg" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4 text-foreground">
              Trade smarter,<br />
              <span className="text-emerald-500">not harder</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
              Real-time market data, advanced charts, and powerful tools — all in one platform.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/50 p-6 backdrop-blur-sm">
            <svg viewBox="0 0 300 120" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,100 C20,95 30,88 50,80 C70,72 80,78 100,65 C120,52 130,55 150,42 C170,29 180,35 200,22 C220,9 240,15 260,8 C275,3 285,5 300,2" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M0,100 C20,95 30,88 50,80 C70,72 80,78 100,65 C120,52 130,55 150,42 C170,29 180,35 200,22 C220,9 240,15 260,8 C275,3 285,5 300,2 L300,120 L0,120 Z" fill="url(#chartGrad)" />
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[{ value: '100+', label: 'Assets' }, { value: '1M+', label: 'Traders' }, { value: '$50M+', label: 'Payouts' }].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-emerald-500">{value}</p>
                <p className="text-muted-foreground text-sm mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground/50 text-xs relative z-10">© 2026 BetaBinary. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-between min-h-screen">

        {/* Mobile logo */}
        <div className="flex items-center justify-between px-6 pt-6 lg:hidden">
          <SiteLogo size="md" />
          <ThemeToggle />
        </div>

        {/* Desktop top-right */}
        <div className="hidden lg:flex justify-end px-8 pt-6">
          <ThemeToggle />
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome back</h1>
              <p className="text-muted-foreground">Sign in to your account to continue trading</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0712345678"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-12 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setRememberMe(v => !v)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${rememberMe ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-border'}`}
                  >
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 6l3 3 6-6" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <button type="button" className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors font-medium">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    Sign In
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-muted-foreground pt-1">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors">
                  Create account
                </Link>
              </p>
            </form>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
