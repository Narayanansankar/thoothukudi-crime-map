import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Sun, Moon, LogOut, Shield, Clock } from 'lucide-react'

export default function Header({ tabs, activeSheet, onTabChange, onRefresh, onToggleTheme, isDark, lastUpdated }) {
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    onRefresh()
    setTimeout(() => setSpinning(false), 700)
  }

  const bg = isDark
    ? 'rgba(10,14,26,0.9)'
    : 'rgba(255,255,255,0.9)'
  const border = isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'
  const text = isDark ? '#e2e8f0' : '#1e293b'
  const sub = isDark ? '#64748b' : '#94a3b8'

  return (
    <header style={{
      background: bg,
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${border}`,
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      height: 60,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
        <img 
          src="/static/images/police_logo-DawGcCid.png" 
          alt="Police Logo" 
          style={{ width: 34, height: 'auto', background: '#fff', borderRadius: '50%', padding: 2, boxShadow: '0 0 12px rgba(99,102,241,0.4)' }} 
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: text, lineHeight: 1.2 }}>Thoothukudi Police</div>
          <div style={{ fontSize: 10, color: sub, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Crime Analytics</div>
        </div>
      </div>

      {/* Tabs */}
      <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
        {tabs.map(tab => {
          const isActive = activeSheet === tab.id
          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: isActive ? `1px solid ${tab.color}44` : '1px solid transparent',
                background: isActive ? `${tab.color}22` : 'transparent',
                color: isActive ? tab.color : sub,
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </motion.button>
          )
        })}
      </nav>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {lastUpdated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: sub, fontSize: 11 }}>
            <Clock size={12} />
            <span>{lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}

        <IconBtn onClick={handleRefresh} title="Refresh" isDark={isDark}>
          <RefreshCw size={15} style={{ transition: 'transform 0.6s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
        </IconBtn>

        <IconBtn onClick={onToggleTheme} title="Toggle theme" isDark={isDark}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </IconBtn>

        <motion.a
          href="/logout"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171', fontSize: 12, fontWeight: 500,
            textDecoration: 'none', cursor: 'pointer',
          }}
        >
          <LogOut size={13} />
          Logout
        </motion.a>
      </div>
    </header>
  )
}

function IconBtn({ onClick, title, isDark, children }) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      title={title}
      style={{
        width: 34, height: 34, borderRadius: 8,
        border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.2)'}`,
        background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
        color: isDark ? '#94a3b8' : '#64748b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {children}
    </motion.button>
  )
}
