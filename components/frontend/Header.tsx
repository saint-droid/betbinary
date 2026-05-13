'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from '@/components/ui/sheet'
import {
  User, DollarSign, Send, BarChart2, Users, MessageSquare, Gift, LogOut, Menu, X,
  Clock, Bell, ChevronDown, Home, Info, CheckCircle, AlertTriangle, Tag,
} from 'lucide-react'

interface UserType {
  id: string
  username: string
  balance_usd: number
  demo_balance: number
  bonus_balance_usd?: number
  currency_preference?: string
}

interface HeaderProps {
  user: UserType | null
  userLoading?: boolean
  isDemoMode: boolean
  demoBalanceUsd?: number
  onLoginClick: () => void
  onRegisterClick: () => void
  onHowToTradeClick: () => void
  onTopTradersClick?: () => void
  onTournamentsClick?: () => void
  onToggleDemo?: () => void
  settings?: any
  activeCurrency?: string
  toggleCurrency?: () => void
  onLogout?: () => void
}

const drawerNavItems = [
  { href: '/dashboard/profile',   label: 'Profile',   icon: User },
  { href: '/dashboard/deposit',   label: 'Deposit',   icon: DollarSign },
  { href: '/dashboard/withdraw',  label: 'Withdraw',  icon: Send },
  { href: '/dashboard/history',   label: 'History',   icon: BarChart2 },
  { href: '/dashboard/referrals', label: 'Referrals', icon: Users },
  { href: '/dashboard/support',   label: 'Support',   icon: MessageSquare },
  { href: '/dashboard/bonus',     label: 'Bonus',     icon: Gift },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  info:    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
  success: <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
  promo:   <Tag className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />,
}

export default function Header({
  user, userLoading = false, isDemoMode, demoBalanceUsd, onLoginClick, onRegisterClick, onHowToTradeClick,
  onTopTradersClick, onTournamentsClick, onToggleDemo,
  settings, activeCurrency = 'USD', toggleCurrency, onLogout,
}: HeaderProps) {
  const [sheetOpen, setSheetOpen]           = useState(false)
  const [accountOpen, setAccountOpen]       = useState(false)
  const [notifOpen, setNotifOpen]           = useState(false)
  const [notifications, setNotifications]   = useState<any[]>([])
  const accountRef = useRef<HTMLDivElement>(null)
  const notifRef   = useRef<HTMLDivElement>(null)

  const symbol = activeCurrency === 'USD' ? '$' : 'KSh'
  const conversionRate = settings?.conversion_rate || 129
  const realBalanceUsd = user ? user.balance_usd - Number(user.bonus_balance_usd || 0) : 0
  // demoBalanceUsd prop comes from TradingTerminal state (initialized from settings.demo_starting_balance)
  const effectiveDemoUsd = demoBalanceUsd ?? (settings?.demo_starting_balance ?? 1000)
  const balance = isDemoMode
    ? effectiveDemoUsd * (activeCurrency === 'USD' ? 1 : conversionRate)
    : realBalanceUsd * (activeCurrency === 'USD' ? 1 : conversionRate)

  const siteName: string = settings?.site_name || 'BetaBinary'
  const [first, ...rest] = siteName.split(' ')

  // Load notifications
  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => setNotifications(d.notifications || [])).catch(() => {})
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-14 w-full flex items-center justify-between px-3 md:px-5 bg-[#111827] border-b border-[#1f2937] shrink-0 gap-2">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 shrink-0">
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt={siteName} className="h-7 w-auto" />
        ) : (
          <div className="text-base md:text-lg uppercase font-black tracking-tighter">
            <span className="text-[#22c55e]">{first}</span>
            {rest.length > 0 && <span className="text-white"> {rest.join(' ')}</span>}
          </div>
        )}
        {isDemoMode && (
          <Badge variant="outline" className="hidden sm:block text-[#22c55e] border-[#22c55e] bg-[#22c55e]/10 uppercase text-[10px]">
            Demo
          </Badge>
        )}
      </div>

      {/* ── Nav next to logo ── */}
      <nav className="hidden md:flex items-center gap-1 ml-2">
        <Link href="/"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Home className="w-3.5 h-3.5" /> Trader's Hub
        </Link>
        {/* <Link href="/dashboard/deposit"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors">
          <DollarSign className="w-3.5 h-3.5" /> Deposit
        </Link> */}
        <Link href="/dashboard/withdraw"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
          <Send className="w-3.5 h-3.5" /> Withdraw
        </Link>
        <Link href="/dashboard/history"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Clock className="w-3.5 h-3.5" /> History
        </Link>
        <Link href="/dashboard/support"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </Link>
      </nav>

      {/* Spacer to push right side to the end */}
      <div className="flex-1" />

      {/* ── Right side ── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Currency switcher — desktop */}
        {settings?.show_currency_switcher && toggleCurrency && (
          <button onClick={toggleCurrency}
            className="hidden md:flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg border border-[#374151] hover:border-[#22c55e]">
            <span className="font-bold text-white">{activeCurrency === 'KES' ? '🇰🇪' : '🇺🇸'}</span>
            <span>{activeCurrency}</span>
          </button>
        )}

        {userLoading ? (
          /* ── Skeleton state while user fetch is in flight ── */
          <div className="flex items-center gap-2">
            <div className="hidden md:block h-8 w-32 rounded-lg bg-[#1f2937] animate-pulse" />
            <div className="h-8 w-8 rounded-lg bg-[#1f2937] animate-pulse" />
            <div className="h-8 w-16 rounded-lg bg-[#1f2937] animate-pulse" />
            <div className="h-8 w-8 rounded-lg bg-[#1f2937] animate-pulse" />
          </div>
        ) : user ? (
          <>
            {/* ── Account Switcher ── */}
            <div className="relative" ref={accountRef}>
              <button onClick={() => setAccountOpen(o => !o)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#374151] hover:border-[#22c55e] transition-colors">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-[#22c55e]'}`} />
                  <span className="text-xs font-bold text-white">{isDemoMode ? 'Demo' : 'Real'}</span>
                </div>
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-xs font-bold text-[#22c55e]">
                    {symbol} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
              </button>

              {accountOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 rounded-xl overflow-hidden shadow-2xl z-50"
                  style={{ background: '#111827', border: '1px solid #1f2937' }}>
                  <div className="px-3 py-2.5 border-b border-[#1f2937]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Trading Account</p>
                  </div>
                  {/* Real account */}
                  <button onClick={() => { if (isDemoMode) onToggleDemo?.(); setAccountOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-3 hover:bg-[#1f2937] transition-colors ${!isDemoMode ? 'bg-[#1a2332]' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-xs font-black text-[#22c55e]">R</div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-white">Real</p>
                        <p className="text-[10px] text-gray-500">
                          {symbol} {(realBalanceUsd * (activeCurrency === 'USD' ? 1 : conversionRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    {!isDemoMode && <div className="w-2 h-2 rounded-full bg-[#22c55e]" />}
                  </button>
                  {/* Demo account */}
                  <button onClick={() => { if (!isDemoMode) onToggleDemo?.(); setAccountOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-3 hover:bg-[#1f2937] transition-colors ${isDemoMode ? 'bg-[#1a2332]' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-400/20 flex items-center justify-center text-xs font-black text-amber-400">D</div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-white">Demo</p>
                        <p className="text-[10px] text-gray-500">
                          {symbol} {(effectiveDemoUsd * (activeCurrency === 'USD' ? 1 : conversionRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    {isDemoMode && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* ── Notifications bell ── */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(o => !o)}
                className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-[#374151] text-gray-400 hover:text-white hover:border-[#22c55e] transition-colors">
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center text-[9px] font-black text-black">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
                  style={{ background: '#111827', border: '1px solid #1f2937' }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937]">
                    <span className="text-sm font-bold text-white">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 py-8">No notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="flex gap-3 px-4 py-3.5 border-b border-[#1f2937] last:border-0 hover:bg-[#1f2937]/50 transition-colors">
                          {ICON_MAP[n.icon] || ICON_MAP.info}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{n.title}</p>
                            {n.body && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-[#1f2937]">
                      <button className="text-xs text-gray-500 hover:text-white transition-colors">View All Transactions</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deposit button */}
            <Link href="/dashboard/deposit">
              <Button size="sm" className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-8 px-3 text-xs rounded-lg">
                Deposit
              </Button>
            </Link>

            {/* Hamburger */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <button onClick={() => setSheetOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#374151] text-gray-400 hover:text-white hover:border-[#22c55e] transition-colors">
                <Menu className="w-4 h-4" />
              </button>

              <SheetContent side="right" showCloseButton={false} className="bg-[#111827] border-[#1f2937] text-white !w-[280px] p-0 flex flex-col">
                <SheetHeader className="px-5 py-4 border-b border-[#1f2937] flex-row items-center justify-between">
                  <div>
                    <div className="font-bold text-base text-white">{user.username}</div>
                    <div className="text-sm text-[#22c55e] font-semibold leading-none">
                      {symbol} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {!isDemoMode && Number(user.bonus_balance_usd) > 0 && (
                      <div className="text-xs text-amber-400 font-semibold mt-0.5">
                        {symbol} {(Number(user.bonus_balance_usd) * (activeCurrency === 'USD' ? 1 : conversionRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bonus
                      </div>
                    )}
                  </div>
                  <SheetClose className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-[#1f2937] transition-colors"
                    onClick={() => setSheetOpen(false)}>
                    <X className="w-4 h-4" />
                  </SheetClose>
                </SheetHeader>

                {/* Account switcher in drawer */}
                <div className="px-4 py-3 border-b border-[#1f2937] grid grid-cols-2 gap-2">
                  <button onClick={() => { if (isDemoMode) onToggleDemo?.() }}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${!isDemoMode ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/40' : 'bg-[#1f2937] text-gray-400 border border-transparent'}`}>
                    <div className="w-5 h-5 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-[10px] font-black text-[#22c55e]">R</div>
                    Real
                  </button>
                  <button onClick={() => { if (!isDemoMode) onToggleDemo?.() }}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${isDemoMode ? 'bg-amber-400/15 text-amber-400 border border-amber-400/40' : 'bg-[#1f2937] text-gray-400 border border-transparent'}`}>
                    <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-[10px] font-black text-amber-400">D</div>
                    Demo
                  </button>
                </div>

                <nav className="flex-1 py-3 flex flex-col">
                  {drawerNavItems.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} onClick={() => setSheetOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 text-gray-300 hover:bg-[#1f2937] hover:text-[#22c55e] transition-colors group">
                      <Icon className="w-4 h-4 text-gray-500 group-hover:text-[#22c55e] transition-colors" />
                      <span className="font-medium">{label}</span>
                    </Link>
                  ))}
                </nav>

                <div className="px-5 py-4 border-t border-[#1f2937] space-y-2">
                  {settings?.show_currency_switcher && toggleCurrency && (
                    <button onClick={() => { toggleCurrency?.() }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-[#374151] text-gray-300 hover:bg-[#1f2937] transition-colors text-sm">
                      <span>Currency</span>
                      <span className="font-bold text-white">{activeCurrency}</span>
                    </button>
                  )}
                  {onLogout && (
                    <button onClick={() => { setSheetOpen(false); onLogout?.() }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors text-sm font-medium">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm"
              className="border border-[#374151] text-gray-300 hover:bg-[#1f2937] hover:text-white h-8 px-3 text-xs font-semibold rounded-lg"
              onClick={onLoginClick}>
              Login
            </Button>
            <Button size="sm" className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-8 px-3 text-xs rounded-lg"
              onClick={onRegisterClick}>
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
