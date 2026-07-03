import { motion } from 'framer-motion'

export default function LoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10,14,26,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 16 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1',
            position: 'absolute',
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '2px solid rgba(6,182,212,0.2)',
            borderTopColor: '#06b6d4',
            position: 'absolute',
            top: 10, left: 10,
          }}
        />
      </div>
      <p style={{ color: '#94a3b8', fontSize: 14, letterSpacing: '0.05em' }}>
        Fetching live data…
      </p>
    </motion.div>
  )
}
