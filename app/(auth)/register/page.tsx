'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Phone, Lock, User } from 'lucide-react'
import ThemeToggle from '@/components/frontend/ThemeToggle'
import SiteLogo from '@/components/frontend/SiteLogo'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [formData, setFormData] = useState({ fullName: '', phone: '', password: '', confirmPassword: '', ref_code: '' })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const refFromUrl = params.get('ref') || ''
    const refFromCookie = document.cookie.split('; ').find(r => r.startsWith('ref_code='))?.split('=')[1] || ''
    const ref = refFromUrl || refFromCookie
    if (ref) setFormData(f => ({ ...f, ref_code: ref }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { toast.error('Please agree to the Terms of Service and Privacy Policy'); return }
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return }
    if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.fullName, phone: formData.phone, password: formData.password, ref_code: formData.ref_code.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to register')
      toast.success('Account created successfully!')
      router.push('/')
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
              Start your trading<br />
              <span className="text-emerald-500">journey today</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
              Join over 1 million traders and access powerful tools, real-time data, and 100+ global markets.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              'Free demo account with $10,000 virtual funds',
              'Trade 100+ assets — crypto, forex, stocks',
              'Up to 950% profit on successful trades',
              'Instant deposits & fast withdrawals',
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-muted-foreground text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 6l3 3 6-6" />
                  </svg>
                </div>
                {item}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            {[{ value: '$1', label: 'Min. deposit' }, { value: '<1s', label: 'Execution' }, { value: '0%', label: 'Fees' }].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-emerald-500">{value}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{label}</p>
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
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-foreground">Create your account</h1>
              <p className="text-muted-foreground">Get started in seconds — no verification needed</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" required placeholder="John Doe" value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="tel" required placeholder="e.g. 0712345678" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} required placeholder="Min. 6 characters" value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-12 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={showConfirm ? 'text' : 'password'} required placeholder="Re-enter your password" value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-12 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={() => setAgreed(v => !v)}
                  className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer ${agreed ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-border'}`}
                >
                  {agreed && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 6l3 3 6-6" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed">
                  I agree to the{' '}
                  <span className="text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors">Privacy Policy</span>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20 mt-2"
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    Create Account
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-muted-foreground pt-1">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}
