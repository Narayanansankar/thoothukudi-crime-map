import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Filter, RotateCcw, ChevronDown, ChevronUp,
  BarChart2, MapPin, Tag, Calendar, Layers,
  PinIcon, Trash2, Plus, AlertTriangle, Image as ImageIcon, Palette,
} from 'lucide-react'
import { CRIME_COLORS, POINT_COLORS, SUBDIVISION_COLORS } from '../constants'

function AddMarkerForm({ onAddPoint, savedPoints, onRemovePoint, customTypes, border, inputBg, text, sub, cardBg }) {
  const [pt, setPt] = useState({ label: '', lat: '', lon: '', color: '#6366f1', eventType: '' })
  const [error, setError] = useState('')
  const colorRef = useRef(null)

  const allEventTypes = [
    ...Object.keys(CRIME_COLORS).filter(k => k !== 'default'),
    ...customTypes.map(t => t.name),
  ]

  const selectType = (name) => {
    const custom = customTypes.find(t => t.name === name)
    const color = custom ? custom.color : (CRIME_COLORS[name]?.fill || '#6366f1')
    setPt(p => ({ ...p, eventType: name, color }))
  }

  const submit = () => {
    setError('')
    const lat = parseFloat(pt.lat)
    const lon = parseFloat(pt.lon)
    if (isNaN(lat) || isNaN(lon)) { setError('Enter valid coordinates.'); return }
    if (lat < 7 || lat > 12 || lon < 76 || lon > 80) { setError('Coordinates out of Tamil Nadu range.'); return }
    onAddPoint({ label: pt.label || 'Point', lat, lon, color: pt.color, eventType: pt.eventType })
    setPt({ label: '', lat: '', lon: '', color: '#6366f1', eventType: '' })
  }

  const inputStyle = { width: '100%', padding: '5px 8px', borderRadius: 6, fontSize: 12, border: `1px solid ${border}`, background: inputBg, color: text, fontFamily: 'inherit', outline: 'none' }
  const lbl = (s) => <label style={{ display: 'block', fontSize: 10, color: sub, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s}</label>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div>
        {lbl('Label / Description')}
        <input type="text" placeholder="Description..." value={pt.label}
          onChange={e => setPt(p => ({ ...p, label: e.target.value }))} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['lat','Latitude','e.g. 8.7950'],['lon','Longitude','e.g. 78.1348']].map(([k,l,ph]) => (
          <div key={k} style={{ flex: 1 }}>
            {lbl(l)}
            <input type="text" inputMode="decimal" pattern="[0-9.]*" placeholder={ph} value={pt[k]}
              onChange={e => setPt(p => ({ ...p, [k]: e.target.value }))} style={inputStyle} />
          </div>
        ))}
      </div>
      <div>
        {lbl('Event Type')}
        <select value={pt.eventType} onChange={e => selectType(e.target.value)}
          style={{ ...inputStyle, color: pt.eventType ? text : sub, cursor: 'pointer' }}>
          <option value="">— Select event type —</option>
          {allEventTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        {lbl('Colour')}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {POINT_COLORS.map(c => (
            <button key={c} onClick={() => setPt(p => ({ ...p, color: c }))} style={{
              width: 22, height: 22, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
              outline: pt.color === c ? '2px solid white' : 'none', outlineOffset: 2,
            }} />
          ))}
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: pt.color, border: `2px solid ${border}`, flexShrink: 0, display: 'inline-block' }} />
          <button onClick={() => colorRef.current?.click()}
            style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, border: `1px solid ${border}`, background: inputBg, color: text, cursor: 'pointer', fontFamily: 'inherit' }}>
            Other…
          </button>
          <input ref={colorRef} type="color" value={pt.color}
            onChange={e => setPt(p => ({ ...p, color: e.target.value }))}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: sub }}>Hex</span>
          <input type="text" maxLength={7} value={pt.color}
            onChange={e => setPt(p => ({ ...p, color: e.target.value }))}
            style={{ width: 90, padding: '3px 7px', borderRadius: 5, fontSize: 12, border: `1px solid ${border}`, background: inputBg, color: text, fontFamily: 'JetBrains Mono, monospace', outline: 'none' }} />
          <span style={{ width: 18, height: 18, borderRadius: 4, background: pt.color, border: `1px solid ${border}`, flexShrink: 0 }} />
        </div>
      </div>
      {error && <p style={{ fontSize: 11, color: '#f87171' }}>{error}</p>}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={submit}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Plus size={13} /> Add to Map
      </motion.button>

      {savedPoints.length > 0 && (
        <div style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: sub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Saved Markers</div>
          {savedPoints.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 6, background: cardBg, border: `1px solid ${border}` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
              <button onClick={() => onRemovePoint(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 2, display: 'flex' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

async function fetchSheetData(sheet) {
  if (sheet === '__empty__') return { data: [], filters: {} }
  const res = await fetch(`/api/data/${sheet}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function loadCustomTypes() {
  try { return JSON.parse(localStorage.getItem('crimedash_event_types') || '[]') }
  catch { return [] }
}

export default function FilterPanel({
  activeSheet, filters, setFilters, mapView, setMapView,
  isDark, refreshKey, policeOpacity, setPoliceOpacity,
  savedPoints, onAddPoint, onRemovePoint,
  showActiveVillages, setShowActiveVillages,
  showDormantVillages, setShowDormantVillages,
  activeVillages, dormantVillages,
  subdivisionList,
  colorBySubdivision, setColorBySubdivision,
}) {
  const [collapsed, setCollapsed] = useState({ addpoint: true, newtype: true })
  const [analyticsData, setAnalyticsData] = useState([])

  const [customTypes, setCustomTypes] = useState(loadCustomTypes)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('#10b981')

  const { data: sheetData } = useQuery({
    queryKey: [activeSheet, refreshKey],
    queryFn: () => fetchSheetData(activeSheet),
    enabled: !!activeSheet,
  })

  const f = sheetData?.filters || {}
  const allData = sheetData?.data || []

  useEffect(() => {
    if (!allData.length) { setAnalyticsData([]); return }
    let d = [...allData]
    if (filters.subdivisions.length > 0)
      d = d.filter(i => filters.subdivisions.includes(i.Subdivision))
    if (filters.crimeType && filters.crimeType !== 'All') {
      const key = activeSheet === 'Robbrey-theft' ? 'CrimeType' : 'EventType'
      d = d.filter(i => i[key] === filters.crimeType)
    }
    if (filters.fromDate) d = d.filter(i => i.Date >= filters.fromDate)
    if (filters.toDate)   d = d.filter(i => i.Date <= filters.toDate)
    if ((activeSheet === 'Hurt' || activeSheet === 'POCSO') && filters.subCategories.length > 0)
      d = d.filter(i => filters.subCategories.includes(i.SubCategory))
    setAnalyticsData(d)
  }, [allData, filters, activeSheet])

  const toggle = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }))
  const resetAll = () => {
    setFilters({ subdivisions: [], crimeType: 'All', fromDate: '', toDate: '', subCategories: [] })
    setMapView('point')
  }

  const saveCustomType = () => {
    if (!newTypeName.trim()) return
    const next = [...customTypes, { name: newTypeName.trim(), color: newTypeColor }]
    setCustomTypes(next)
    localStorage.setItem('crimedash_event_types', JSON.stringify(next))
    setNewTypeName('')
  }
  const removeCustomType = (name) => {
    const next = customTypes.filter(t => t.name !== name)
    setCustomTypes(next)
    localStorage.setItem('crimedash_event_types', JSON.stringify(next))
  }


  const bg = isDark ? 'rgba(10,14,26,0.88)' : 'rgba(255,255,255,0.93)'
  const border = isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.2)'
  const text = isDark ? '#e2e8f0' : '#1e293b'
  const sub = isDark ? '#64748b' : '#94a3b8'
  const cardBg = isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.05)'
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'

  const Section = ({ id, icon: Icon, title, accent, children }) => (
    <div style={{ borderBottom: `1px solid ${border}` }}>
      <button onClick={() => toggle(id)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
        color: text, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
        textTransform: 'uppercase', fontFamily: 'inherit',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon size={13} color={accent || '#6366f1'} />
          {title}
        </span>
        {collapsed[id] ? <ChevronDown size={12} color={sub} /> : <ChevronUp size={12} color={sub} />}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed[id] && (
          <motion.div key="b"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 12px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  /* all event types for this tab: built-in + custom */
  const builtinTypes = f.event_types || f.crime_types || []
  const allTypes = [...builtinTypes, ...customTypes.map(t => t.name)]

  const getTypeColor = (type) => {
    const builtin = CRIME_COLORS[type]
    if (builtin) return builtin.fill
    const custom = customTypes.find(t => t.name === type)
    return custom ? custom.color : CRIME_COLORS.default.fill
  }

  return (
    <aside style={{
      width: 240, flexShrink: 0, height: '100%',
      background: bg, backdropFilter: 'blur(20px)',
      borderRight: `1px solid ${border}`,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px', borderBottom: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: text, fontWeight: 700, fontSize: 13 }}>
          <Filter size={14} color="#6366f1" /> Filters
        </span>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={resetAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <RotateCcw size={10} /> Reset
        </motion.button>
      </div>

      {/* Map View */}
      <Section id="view" icon={Layers} title="Map View">
        <div style={{ display: 'flex', gap: 4 }}>
          {['point', 'cluster', 'heat'].map(v => (
            <button key={v} onClick={() => setMapView(v)} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 11,
              border: `1px solid ${mapView === v ? '#6366f1' : border}`,
              background: mapView === v ? 'rgba(99,102,241,0.2)' : cardBg,
              color: mapView === v ? '#a5b4fc' : sub,
              cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
            }}>{v}</button>
          ))}
        </div>
      </Section>

      {/* Police Map */}
      <Section id="police" icon={ImageIcon} title="Police Map Overlay">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: sub }}>Transparency</span>
          <span style={{ fontSize: 11, color: '#a5b4fc', fontFamily: 'JetBrains Mono,monospace' }}>
            {Math.round(policeOpacity * 100)}%
          </span>
        </div>
        <input type="range" min="0" max="100" value={Math.round(policeOpacity * 100)}
          onChange={e => setPoliceOpacity(Number(e.target.value) / 100)}
          style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
        />
      </Section>

      {/* Crime / Event Type */}
      {(builtinTypes.length > 0 || customTypes.length > 0) && (
        <Section id="crime" icon={Tag} title="Event Type">
          {/* Legend explanation */}
          <p style={{ fontSize: 10, color: sub, marginBottom: 8, lineHeight: 1.5 }}>
            Each button colour matches the map marker. Click to filter.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* "All" button */}
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setFilters(p => ({ ...p, crimeType: 'All' }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 7, textAlign: 'left',
                border: `1px solid ${filters.crimeType === 'All' ? '#6366f1' : border}`,
                background: filters.crimeType === 'All' ? 'rgba(99,102,241,0.2)' : cardBg,
                color: filters.crimeType === 'All' ? '#a5b4fc' : sub,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <span style={{
                width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
              }} />
              All Types
            </motion.button>

            {/* "None" button */}
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setFilters(p => ({ ...p, crimeType: 'None' }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 7, textAlign: 'left',
                border: `1px solid ${filters.crimeType === 'None' ? '#ef4444' : border}`,
                background: filters.crimeType === 'None' ? 'rgba(239,68,68,0.1)' : cardBg,
                color: filters.crimeType === 'None' ? '#ef4444' : sub,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <span style={{
                width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${filters.crimeType === 'None' ? '#ef4444' : sub}`,
                background: 'transparent',
              }} />
              None
            </motion.button>

            {/* Built-in types */}
            {builtinTypes.map(type => {
              const color = getTypeColor(type)
              const active = filters.crimeType === type
              return (
                <motion.button key={type} whileTap={{ scale: 0.97 }}
                  onClick={() => setFilters(p => ({ ...p, crimeType: type }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 7, textAlign: 'left',
                    border: `1px solid ${active ? `${color}66` : border}`,
                    background: active ? `${color}1a` : cardBg,
                    color: active ? color : sub,
                    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: color,
                    boxShadow: active ? `0 0 6px ${color}88` : 'none',
                  }} />
                  {type}
                </motion.button>
              )
            })}

            {/* Custom types */}
            {customTypes.map(t => {
              const active = filters.crimeType === t.name
              return (
                <div key={t.name} style={{ display: 'flex', gap: 4 }}>
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setFilters(p => ({ ...p, crimeType: t.name }))}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 7, textAlign: 'left',
                      border: `1px solid ${active ? `${t.color}66` : border}`,
                      background: active ? `${t.color}1a` : cardBg,
                      color: active ? t.color : sub,
                      fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <span style={{
                      width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                      background: t.color, outline: '1.5px dashed rgba(255,255,255,0.4)', outlineOffset: 2,
                    }} />
                    {t.name}
                    <span style={{ fontSize: 9, color: sub, marginLeft: 'auto' }}>custom</span>
                  </motion.button>
                  <button onClick={() => removeCustomType(t.name)} style={{
                    background: 'none', border: `1px solid ${border}`, borderRadius: 6,
                    cursor: 'pointer', color: '#f87171', padding: '0 6px', display: 'flex', alignItems: 'center',
                  }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Create new event type */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${border}` }}>
            <button onClick={() => toggle('newtype')} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', color: '#6366f1', fontSize: 11, fontFamily: 'inherit', padding: 0, marginBottom: collapsed.newtype ? 0 : 8,
            }}>
              <Palette size={12} />
              {collapsed.newtype ? 'Create new event type' : 'Hide'}
            </button>
            <AnimatePresence initial={false}>
              {!collapsed.newtype && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <input
                      placeholder="Type name e.g. Kidnapping"
                      value={newTypeName}
                      onChange={e => setNewTypeName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveCustomType()}
                      style={{
                        width: '100%', padding: '5px 8px', borderRadius: 6, fontSize: 12,
                        border: `1px solid ${border}`, background: inputBg, color: text,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {POINT_COLORS.map(c => (
                        <button key={c} onClick={() => setNewTypeColor(c)} style={{
                          width: 20, height: 20, borderRadius: '50%', background: c,
                          border: 'none', cursor: 'pointer',
                          outline: newTypeColor === c ? '2px solid white' : 'none', outlineOffset: 2,
                        }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: newTypeColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: sub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {newTypeName || 'Preview'}
                      </span>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={saveCustomType}
                      disabled={!newTypeName.trim()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '6px 0', borderRadius: 7,
                        background: newTypeName.trim() ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(99,102,241,0.2)',
                        border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: newTypeName.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
                        opacity: newTypeName.trim() ? 1 : 0.5,
                      }}>
                      <Plus size={12} /> Save Type
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Section>
      )}

      {/* Date Range */}
      {f.date_range && (
        <Section id="date" icon={Calendar} title="Date Range">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[['fromDate', 'From'], ['toDate', 'To']].map(([id, label]) => (
              <div key={id}>
                <label style={{ display: 'block', fontSize: 10, color: sub, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                <input type="date"
                  value={id === 'fromDate' ? filters.fromDate : filters.toDate}
                  onChange={e => setFilters(p => ({ ...p, [id]: e.target.value }))}
                  style={{
                    width: '100%', padding: '5px 8px', borderRadius: 6, fontSize: 12,
                    border: `1px solid ${border}`, background: inputBg, color: text,
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Subdivisions */}
      {subdivisionList.length > 0 && (
        <Section id="sdo" icon={MapPin} title="Subdivision">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 5 }}>
            <button onClick={() => setFilters(p => ({ ...p, subdivisions: subdivisionList }))} style={{ flex: 1, padding: '4px', fontSize: 10, borderRadius: 4, border: `1px solid ${border}`, background: cardBg, color: text, cursor: 'pointer' }}>Select All</button>
            <button onClick={() => setFilters(p => ({ ...p, subdivisions: [] }))} style={{ flex: 1, padding: '4px', fontSize: 10, borderRadius: 4, border: `1px solid ${border}`, background: cardBg, color: text, cursor: 'pointer' }}>None</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: text, marginBottom: 8 }}>
            <input type="checkbox" checked={colorBySubdivision} onChange={e => setColorBySubdivision(e.target.checked)} style={{ accentColor: '#6366f1' }} />
            Color by Subdivision
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {subdivisionList.map(sdo => {
              const active = filters.subdivisions.includes(sdo)
              const color = SUBDIVISION_COLORS[sdo] || SUBDIVISION_COLORS.default
              return (
                <motion.button key={sdo} whileTap={{ scale: 0.97 }}
                  onClick={() => setFilters(p => ({
                    ...p,
                    subdivisions: active ? p.subdivisions.filter(s => s !== sdo) : [...p.subdivisions, sdo]
                  }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 7,
                    border: `1px solid ${active ? (colorBySubdivision ? color+'66' : 'rgba(99,102,241,0.4)') : border}`,
                    background: active ? (colorBySubdivision ? color+'1a' : 'rgba(99,102,241,0.15)') : cardBg,
                    color: active ? (colorBySubdivision ? color : '#a5b4fc') : sub,
                    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                  {colorBySubdivision && (
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: active ? `0 0 6px ${color}88` : 'none' }} />
                  )}
                  <span style={{ flex: 1 }}>{sdo}</span>
                  {active && !colorBySubdivision && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />}
                </motion.button>
              )
            })}
          </div>
        </Section>
      )}

      {/* Sub-category */}
      {(activeSheet === 'Hurt' || activeSheet === 'POCSO') && (
        <Section id="subcat" icon={Tag} title="Sub-Category">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(activeSheet === 'Hurt' ? ['Simple', 'Grievous'] : ['Real', 'Elopement']).map(cat => {
              const all = activeSheet === 'Hurt' ? ['Simple', 'Grievous'] : ['Real', 'Elopement']
              const current = filters.subCategories.length ? filters.subCategories : all
              const checked = current.includes(cat)
              return (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: text }}>
                  <input type="checkbox" checked={checked}
                    onChange={() => {
                      const next = checked ? current.filter(c => c !== cat) : [...current, cat]
                      setFilters(p => ({ ...p, subCategories: next.length === all.length ? [] : next }))
                    }}
                    style={{ accentColor: '#6366f1' }}
                  />
                  {cat}
                </label>
              )
            })}
          </div>
        </Section>
      )}

      {/* Atrocity-Prone Active */}
      <Section id="atrocity-active" icon={AlertTriangle} title="Atrocity-Prone (Active)" accent="#ef4444">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: text, marginBottom: 8 }}>
          <input type="checkbox" checked={showActiveVillages}
            onChange={e => setShowActiveVillages(e.target.checked)}
            style={{ accentColor: '#ef4444' }}
          />
          Show on map
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {activeVillages.map(v => (
            <div key={v.name} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', borderRadius: 6,
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0, boxShadow: '0 0 5px #ef4444aa' }} />
              <span style={{ fontSize: 12, color: text }}>{v.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Atrocity-Prone Dormant */}
      <Section id="atrocity-dormant" icon={AlertTriangle} title="Atrocity-Prone (Dormant)" accent="#f59e0b">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: text, marginBottom: 8 }}>
          <input type="checkbox" checked={showDormantVillages}
            onChange={e => setShowDormantVillages(e.target.checked)}
            style={{ accentColor: '#f59e0b' }}
          />
          Show on map
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {dormantVillages.map(v => (
            <div key={v.name} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', borderRadius: 6,
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: text }}>{v.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Add Marker */}
      <Section id="addpoint" icon={PinIcon} title="Add Marker">
        <AddMarkerForm
          onAddPoint={onAddPoint}
          savedPoints={savedPoints}
          onRemovePoint={onRemovePoint}
          customTypes={customTypes}
          border={border}
          inputBg={inputBg}
          text={text}
          sub={sub}
          cardBg={cardBg}
        />
      </Section>

      {/* Analytics */}
      <Section id="analytics" icon={BarChart2} title="Live Analytics">
        <Analytics data={analyticsData} activeSheet={activeSheet} sub={sub} text={text} />
      </Section>
    </aside>
  )
}

function Analytics({ data, activeSheet, sub, text }) {
  if (!data.length) return <p style={{ color: sub, fontSize: 12 }}>No data in view.</p>
  const crimeKey = activeSheet === 'Robbrey-theft' ? 'CrimeType'
    : (activeSheet === 'Hurt' || activeSheet === 'POCSO') ? 'SubCategory' : 'EventType'
  const countBy = (key) => {
    const acc = {}
    data.forEach(i => { const k = i[key] || 'Unknown'; acc[k] = (acc[k] || 0) + 1 })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }
  const typeEntries = countBy(crimeKey).slice(0, 3)
  const locEntries = countBy('Subdivision').slice(0, 3)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '8px 12px', borderRadius: 8, textAlign: 'center',
        background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(6,182,212,0.1))',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#a5b4fc' }}>{data.length.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Cases</div>
      </div>
      {typeEntries.length > 1 && (
        <div>
          <div style={{ fontSize: 10, color: sub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Top Types</div>
          {typeEntries.map(([name, count]) => <MiniBar key={name} label={name} count={count} max={typeEntries[0][1]} color="#6366f1" sub={sub} text={text} />)}
        </div>
      )}
      {locEntries.length > 1 && (
        <div>
          <div style={{ fontSize: 10, color: sub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Top Locations</div>
          {locEntries.map(([name, count]) => <MiniBar key={name} label={name} count={count} max={locEntries[0][1]} color="#06b6d4" sub={sub} text={text} />)}
        </div>
      )}
    </div>
  )
}

function MiniBar({ label, count, max, color, sub, text }) {
  const pct = Math.round((count / max) * 100)
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '76%' }}>{label}</span>
        <span style={{ color: sub, fontFamily: 'JetBrains Mono,monospace' }}>{count}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(128,128,128,0.15)', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 2, background: color }} />
      </div>
    </div>
  )
}
