'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, Shield, BarChart2, Clock, ChevronRight, ArrowRight, User } from 'lucide-react'
import ThemeToggle from '@/components/frontend/ThemeToggle'
import SiteLogo from '@/components/frontend/SiteLogo'

const TICKER_PAIRS = [
  { symbol: 'BTC/USD', price: '$43,256.34', change: '+2.34%', up: true,  icon: '₿', color: 'bg-orange-500' },
  { symbol: 'ETH/USD', price: '$2,284.50',  change: '+1.87%', up: true,  icon: 'Ξ', color: 'bg-indigo-500' },
  { symbol: 'AAPL',    price: '$178.32',    change: '-0.45%', up: false, icon: 'A', color: 'bg-zinc-500' },
  { symbol: 'TSLA',    price: '$248.90',    change: '+3.21%', up: true,  icon: 'T', color: 'bg-red-500' },
  { symbol: 'XAU/USD', price: '$2,024.15',  change: '+0.89%', up: true,  icon: 'Au', color: 'bg-yellow-500' },
  { symbol: 'EUR/USD', price: '$1.0892',    change: '+0.12%', up: true,  icon: '€', color: 'bg-blue-500' },
]

const FEATURES = [
  { icon: <Zap className="w-5 h-5" />,      color: 'text-yellow-500', bg: 'bg-yellow-500/10', title: 'Lightning Execution', desc: 'Sub-second trade execution powered by our global infrastructure.' },
  { icon: <Shield className="w-5 h-5" />,   color: 'text-blue-500',   bg: 'bg-blue-500/10',   title: 'Bank-Grade Security',  desc: 'Your funds protected with enterprise encryption and cold storage.' },
  { icon: <BarChart2 className="w-5 h-5" />,color: 'text-purple-500', bg: 'bg-purple-500/10', title: '100+ Markets',          desc: 'Crypto, forex, stocks, indices, and commodities — all in one place.' },
  { icon: <Clock className="w-5 h-5" />,    color: 'text-emerald-500',bg: 'bg-emerald-500/10',title: 'Zero Fees',             desc: 'No hidden charges on deposits, withdrawals, or account maintenance.' },
]

const STEPS = [
  { num: '01', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>, title: 'Create Account', desc: 'Sign up in 30 seconds. No lengthy forms, no ID required to start.' },
  { num: '02', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" /></svg>, title: 'Fund & Trade', desc: 'Deposit from $1 with 20+ payment methods. Pick an asset and direction.' },
  { num: '03', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: 'Collect Profits', desc: 'Withdraw anytime. Payouts processed within minutes, not days.' },
]

const TESTIMONIALS = [
  { stars: 5, text: '"The execution speed is incredible. I switched from my old platform and never looked back."', name: 'Alex M.', country: 'us' },
  { stars: 5, text: '"From crypto to forex, everything I need in one place. The charts are superb."', name: 'Sarah K.', country: 'ca' },
  { stars: 5, text: '"Demo account helped me learn risk-free. Now I trade with real confidence."', name: 'Mike R.', country: 'ca' },
  { stars: 5, text: '"BTC and ETH options with great payouts. This platform is amazing!"', name: 'Emma L.', country: 'au' },
  { stars: 5, text: '"12 years trading and this is the best binary platform I have ever used."', name: 'James M.', country: 'gb' },
  { stars: 5, text: '"Perfect for spare-time trading. Clean interface, fast payouts."', name: 'Lisa T.', country: 'tw' },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function HomePage() {
  const [user, setUser] = useState<{ username: string } | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => setUser(d?.user ?? null)).catch(() => setUser(null))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <SiteLogo size="md" />

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Features</button>
            <button className="hover:text-foreground transition-colors">How It Works</button>
            <button className="hover:text-foreground transition-colors">Markets</button>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle className="hidden sm:flex" />
            {user === undefined ? (
              <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
            ) : user ? (
              <>
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>{user.username}</span>
                </div>
                <Link href="/trade" className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-500/20">
                  Trade Now
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                  Log In
                </Link>
                <Link href="/register" className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-500/20">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute top-[-15%] left-[10%] w-[600px] h-[600px] bg-emerald-500/6 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] bg-emerald-700/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-8">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-500 text-xs font-medium">Live trading · 1M+ active traders</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 leading-[1.05] text-foreground">
            Trade Smarter.<br />
            <span className="text-emerald-500">Profit Faster.</span>
          </h1>

          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Access 100+ global markets with lightning-fast execution, institutional-grade tools, and payouts up to 950%. Start with just $10.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link href="/register" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xl shadow-emerald-500/25 text-base">
              Start Trading Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/trade" className="w-full sm:w-auto bg-muted hover:bg-accent text-foreground font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-border text-base">
              Try Free Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {[
              { value: '$1', label: 'Min. deposit' },
              { value: '$0.10', label: 'Min. trade' },
              { value: '950%', label: 'Max. payout' },
              { value: '<1s', label: 'Execution' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-emerald-500">{value}</p>
                <p className="text-muted-foreground text-xs mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live ticker ── */}
      <div className="border-y border-border bg-muted/30 py-3 overflow-hidden">
        <div className="flex gap-3 animate-ticker" style={{ width: 'max-content', animationDuration: '28s' }}>
          {[...TICKER_PAIRS, ...TICKER_PAIRS].map((pair, i) => (
            <div key={i} className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-2 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full ${pair.color} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>
                {pair.icon}
              </div>
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-foreground text-xs font-semibold">{pair.symbol}</span>
                <span className="text-muted-foreground text-[11px]">{pair.price}</span>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${pair.up ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                {pair.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-emerald-500 text-xs font-semibold uppercase tracking-widest mb-3">Why BetaBinary</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Built for serious traders</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon, color, bg, title, desc }) => (
              <div key={title} className="bg-background border border-border rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center ${color} mb-4`}>{icon}</div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-emerald-500 text-xs font-semibold uppercase tracking-widest mb-3">Getting started</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Three steps to your first trade</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ num, icon, title, desc }) => (
              <div key={num} className="bg-muted/30 border border-border rounded-2xl p-8 relative">
                <span className="absolute top-6 right-6 text-5xl font-black text-muted/40 leading-none select-none">{num}</span>
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 mb-5">{icon}</div>
                <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Markets section ── */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-emerald-500 text-xs font-semibold uppercase tracking-widest mb-3">Markets</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5">
                Trade global markets from<br className="hidden sm:block" /> one account
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-8">
                Access forex, cryptocurrencies, stocks, indices, and commodities — all with competitive spreads and instant execution.
              </p>
              <ul className="space-y-3">
                {[
                  'Real-Time Prices — Live market data with zero delay',
                  '20+ Payment Methods — Deposit via card, bank, e-wallets',
                  'Up to 950% Returns — Industry-leading payout rates',
                  '24/7 Live Support — Expert help whenever you need it',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-muted-foreground text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 6l3 3 6-6" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trade card mock */}
            <div className="bg-background border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">₿</div>
                  <span className="font-semibold text-foreground">BTC/USD</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">$43,256.78</p>
                  <p className="text-emerald-500 text-xs">+1.08%</p>
                </div>
              </div>
              <div className="mb-5 rounded-xl overflow-hidden">
                <svg viewBox="0 0 300 100" className="w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,80 C20,75 35,70 55,60 C75,50 85,55 110,45 C135,35 145,38 165,28 C185,18 195,22 215,12 C235,2 255,8 275,5 C285,3.5 292,4 300,3" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,80 C20,75 35,70 55,60 C75,50 85,55 110,45 C135,35 145,38 165,28 C185,18 195,22 215,12 C235,2 255,8 275,5 C285,3.5 292,4 300,3 L300,100 L0,100 Z" fill="url(#mktGrad)" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                  UP
                </button>
                <button className="bg-red-500 hover:bg-red-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  DOWN
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-16 border-y border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>, value: '1M+', label: 'Active Traders' },
              { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" /></svg>, value: '$50M+', label: 'Daily Volume' },
              { icon: <BarChart2 className="w-6 h-6" />, value: '100+', label: 'Trading Assets' },
              { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, value: '24/7', label: 'Live Support' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-3">
                <div className="text-emerald-500/60">{icon}</div>
                <p className="text-3xl font-bold text-emerald-500">{value}</p>
                <p className="text-muted-foreground text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-emerald-500 text-xs font-semibold uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Trusted by traders worldwide</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ stars, text, name, country }) => (
              <div key={name} className="bg-background border border-border rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
                <StarRating count={stars} />
                <p className="text-muted-foreground text-sm leading-relaxed mt-3 mb-5">{text}</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500 text-xs font-bold">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">{name}</p>
                    <p className="text-muted-foreground text-xs uppercase">{country}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground text-sm mt-8">4.9/5 from 50,000+ reviews</p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold mb-5 text-foreground">
            Ready to start trading?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Join over 1 million traders. Create your free account in seconds and start with a risk-free demo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xl shadow-emerald-500/25 text-base">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/trade" className="w-full sm:w-auto text-muted-foreground hover:text-foreground text-base transition-colors flex items-center justify-center gap-1.5">
              Try Demo
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <SiteLogo size="sm" />
          <p className="text-muted-foreground text-xs">© 2026 BetaBinary. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Privacy</button>
            <button className="hover:text-foreground transition-colors">Terms</button>
            <button className="hover:text-foreground transition-colors">Responsible Trading</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
