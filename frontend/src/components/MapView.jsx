import { useEffect, useRef, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CRIME_COLORS, SUBDIVISION_COLORS } from '../constants'
import html2canvas from 'html2canvas'

// All Leaflet plugins are loaded via CDN as window.L
const L = window.L


const SUBDIVISION_CENTERS = {
  Kovilpatti: [9.175, 77.875, 12],
  Maniyachi: [8.95, 77.98, 11],
  Sathankulam: [8.45, 77.93, 12],
  Srivaikundam: [8.63, 77.91, 12],
  Tiruchendur: [8.50, 78.12, 12],
  'Thoothukudi Rural': [8.75, 78.05, 11],
  'Thoothukudi Town': [8.79, 78.15, 13],
  Vilathikulam: [9.13, 78.16, 11],
}

async function fetchSheetData(sheet) {
  if (!sheet) return { data: [], filters: {} }
  const res = await fetch(`/api/data/${sheet}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function applyFilters(allData, filters, activeSheet) {
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
  return d
}

function getStyle(item, activeSheet, colorBySubdivision) {
  if (activeSheet === 'CCTV') return null
  if (colorBySubdivision) {
    const color = SUBDIVISION_COLORS[item.Subdivision] || SUBDIVISION_COLORS.default
    return { fillColor: color, color: color }
  }
  switch (activeSheet) {
    case 'Hurt':
      return item.SubCategory === 'Grievous'
        ? { fillColor: '#b30000', color: '#660000' }
        : { fillColor: '#e67300', color: '#804000' }
    case 'POCSO':
      return item.SubCategory === 'Elopement'
        ? { fillColor: '#3182CE', color: '#2C5282' }
        : { fillColor: '#D53F8C', color: '#8D244D' }
    default: {
      const key = activeSheet === 'Robbrey-theft' ? item.CrimeType : item.EventType
      const c = CRIME_COLORS[key] || CRIME_COLORS.default
      return { fillColor: c.fill, color: c.stroke }
    }
  }
}

function buildPopup(item, activeSheet) {
  const dark = 'rgba(10,14,26,0.95)'
  const wrap = `padding:8px 10px;background:${dark};border-radius:10px;`
  const row = (lbl, val) =>
    `<div style="display:flex;gap:8px;margin-bottom:3px">` +
    `<span style="color:#64748b;font-size:11px;min-width:72px">${lbl}</span>` +
    `<span style="color:#e2e8f0;font-size:12px">${val || 'N/A'}</span></div>`
  switch (activeSheet) {
    case '100_calls_new':
      return `<div style="${wrap}">${row('Event', item.EventType)}${row('Station', item.PoliceStation)}${row('Subdivision', item.Subdivision)}${row('Date', item.Date)}</div>`
    case 'Robbrey-theft':
      return `<div style="${wrap}">${row('Type', item.CrimeType)}${row('Station', item.Station)}${row('Subdivision', item.Subdivision)}${row('Date', item.Date)}</div>`
    case 'Hurt':
      return `<div style="${wrap}"><b style="color:#f97316">${item.SubCategory} Hurt</b><br>${row('Subdivision', item.Subdivision)}${row('Station', item.Station)}</div>`
    case 'POCSO':
      return `<div style="${wrap}"><b style="color:#ec4899">POCSO (${item.SubCategory})</b><br>${row('Subdivision', item.Subdivision)}</div>`
    case 'CCTV':
      return `<div style="${wrap}"><b style="color:#06b6d4">${item.Place_Name}</b><br>${row('Subdivision', item.Subdivision)}</div>`
    default: return '<div>No details.</div>'
  }
}

function makeVillageIcon(color, isActive) {
  const size = isActive ? 14 : 12
  const pulse = isActive
    ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};opacity:0.5;animation:vpulse 2s infinite"></div>`
    : ''
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      ${pulse}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 8px ${color}cc"></div>
    </div>`,
  })
}

// Inject pulse keyframes once
if (!document.getElementById('village-pulse-style')) {
  const s = document.createElement('style')
  s.id = 'village-pulse-style'
  s.textContent = '@keyframes vpulse { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.8);opacity:0} }'
  document.head.appendChild(s)
}

export default function MapView({
  activeSheet, filters, mapView, isDark, refreshKey,
  setLoading, onDataLoaded, policeOpacity, savedPoints,
  showActiveVillages, showDormantVillages, colorBySubdivision,
  activeVillages, dormantVillages,
}) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const layersRef = useRef({ point: null, heat: null, cluster: null, highlight: null, policeOverlay: null, savedLayer: null, villageLayer: null })
  const osmRef = useRef(null)

  const { data: sheetData, isFetching } = useQuery({
    queryKey: [activeSheet, refreshKey],
    queryFn: () => fetchSheetData(activeSheet),
  })

  useEffect(() => { setLoading(isFetching) }, [isFetching])
  useEffect(() => { if (sheetData) onDataLoaded() }, [sheetData])

  // Reactive dark-mode tile filter
  useEffect(() => {
    let el = document.getElementById('leaflet-dark-tiles')
    if (isDark) {
      if (!el) {
        el = document.createElement('style')
        el.id = 'leaflet-dark-tiles'
        el.textContent = '.leaflet-tile-osm { filter: invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7); }'
        document.head.appendChild(el)
      }
    } else {
      el?.remove()
    }
  }, [isDark])

  // Init map once
  useEffect(() => {
    if (leafletMapRef.current || !mapRef.current) return

    const map = L.map(mapRef.current, { attributionControl: false, preferCanvas: true, zoomControl: false })
    map.setView([8.78, 78.13], 10)
    map.setMaxBounds([[8.0, 77.4], [9.7, 78.7]])
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Base layers
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 9, crossOrigin: true, className: 'leaflet-tile-osm',
    }).addTo(map)
    osmRef.current = osm

    // Google layers (only if API key is available and GoogleMutant is loaded)
    const baseMaps = { 'Street Map': osm }
    if (typeof L.gridLayer?.googleMutant === 'function') {
      const gSat = L.gridLayer.googleMutant({ type: 'satellite', maxZoom: 20 })
      const gMap = L.gridLayer.googleMutant({ type: 'roadmap', maxZoom: 20 })
      baseMaps['Google Satellite'] = gSat
      baseMaps['Google Maps'] = gMap
    }

    // Police overlay
    const policeOverlay = L.imageOverlay(
      '/static/images/police_district_map.jpg',
      [[8.321394944, 77.665043156], [9.378570475, 78.399076760]],
      { opacity: policeOpacity }
    )
    layersRef.current.policeOverlay = policeOverlay

    L.control.layers(baseMaps, { 'Police District Map': policeOverlay }).addTo(map)

    // Layers
    layersRef.current.highlight = L.geoJSON(null, {
      style: (feature) => {
        const name = feature.properties?.subdivisionName;
        const color = name ? (SUBDIVISION_COLORS[name] || '#6366f1') : '#6366f1';
        return { weight: 3, color: color, opacity: 1, fillOpacity: 0.2, fillColor: color };
      }
    }).addTo(map)
    layersRef.current.point = L.layerGroup().addTo(map)
    layersRef.current.savedLayer = L.layerGroup().addTo(map)
    layersRef.current.villageLayer = L.layerGroup().addTo(map)

    // District boundary + labels
    fetch('/static/geojson/THOOTHUKUDI-POLICE-MAP-OUTLINE.geojson')
      .then(r => r.json())
      .then(data => {
        L.geoJSON(data, {
          style: { fill: false, weight: 1.2, opacity: 0.55, color: '#6366f1', dashArray: '4, 4' },
        }).addTo(map)
        data.features.forEach(f => {
          const name = f.properties.SD_NAME
          if (!name) return
          const center = L.geoJSON(f).getBounds().getCenter()
          L.tooltip({ permanent: true, direction: 'center', className: 'boundary-label' })
            .setContent(name).setLatLng(center).addTo(map)
        })
      })
      .catch(() => {})

    map.on('zoomend', () => {
      const show = map.getZoom() <= 11
      document.querySelectorAll('.boundary-label').forEach(el => { el.style.opacity = show ? '1' : '0' })
    })

    leafletMapRef.current = map
    return () => { map.remove(); leafletMapRef.current = null }
  }, [])

  // Auto-switch to satellite for CCTV, back to OSM otherwise
  useEffect(() => {
    // intentionally left minimal — user can switch manually
  }, [activeSheet])

  // Police overlay opacity
  useEffect(() => {
    layersRef.current.policeOverlay?.setOpacity(policeOpacity)
  }, [policeOpacity])

  // Fly + highlight selected subdivisions
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return
    const hl = layersRef.current.highlight
    hl.clearLayers()
    if (!filters.subdivisions.length) return

    if (filters.subdivisions.length === 1) {
      const c = SUBDIVISION_CENTERS[filters.subdivisions[0]]
      if (c) map.flyTo([c[0], c[1]], c[2], { duration: 0.7 })
    }
    filters.subdivisions.forEach(name => {
      const fn = name.toLowerCase().replace(/\s+/g, '') + '.geojson'
      fetch(`/static/geojson/${fn}`).then(r => r.json()).then(d => {
        if (d.features) d.features.forEach(f => { if (!f.properties) f.properties = {}; f.properties.subdivisionName = name; })
        else { if (!d.properties) d.properties = {}; d.properties.subdivisionName = name; }
        hl.addData(d)
      }).catch(() => {})
    })
  }, [filters.subdivisions])

  // Render saved custom points
  useEffect(() => {
    const sg = layersRef.current.savedLayer
    if (!sg) return
    sg.clearLayers()
    savedPoints.forEach(pt => {
      const marker = L.circleMarker([pt.lat, pt.lon], {
        radius: 8, fillColor: pt.color, color: '#fff',
        weight: 2, fillOpacity: 1,
      })
      marker.bindPopup(
        `<div style="padding:6px 8px;background:rgba(10,14,26,0.95);border-radius:8px">` +
        `<b style="color:${pt.color}">${pt.label}</b><br>` +
        `<span style="color:#64748b;font-size:11px">${pt.lat.toFixed(5)}, ${pt.lon.toFixed(5)}</span></div>`
      )
      sg.addLayer(marker)
    })
  }, [savedPoints])

  // Village markers
  useEffect(() => {
    const vg = layersRef.current.villageLayer
    if (!vg) return
    vg.clearLayers()

    const addVillage = (v, color, label) => {
      const icon = makeVillageIcon(color, label === 'Active')
      const m = L.marker([v.lat, v.lon], { icon })
      m.bindPopup(
        `<div style="padding:6px 10px;background:rgba(10,14,26,0.95);border-radius:8px">` +
        `<b style="color:${color}">${v.name}</b><br>` +
        `<span style="color:#64748b;font-size:11px">Atrocity-Prone · ${label}</span><br>` +
        `<span style="color:#64748b;font-size:10px">${v.lat}°N, ${v.lon}°E</span></div>`
      )
      vg.addLayer(m)
    }

    if (showActiveVillages) activeVillages.forEach(v => addVillage(v, '#ef4444', 'Active'))
    if (showDormantVillages) dormantVillages.forEach(v => addVillage(v, '#3b82f6', 'Dormant'))
  }, [showActiveVillages, showDormantVillages, activeVillages, dormantVillages])

  // Re-draw crime markers
  const filteredData = useMemo(() => {
    if (!sheetData?.data) return []
    return applyFilters(sheetData.data, filters, activeSheet)
  }, [sheetData, filters, activeSheet])

  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return

    layersRef.current.point?.clearLayers()
    if (layersRef.current.heat) { map.removeLayer(layersRef.current.heat); layersRef.current.heat = null }
    if (layersRef.current.cluster) { map.removeLayer(layersRef.current.cluster); layersRef.current.cluster = null }

    if (!activeSheet || !filteredData.length) return

    if (mapView === 'heat') {
      if (typeof L.heatLayer === 'function') {
        layersRef.current.heat = L.heatLayer(
          filteredData.map(i => [i.Latitude, i.Longitude, 0.5]),
          { radius: 20, blur: 15, maxZoom: 18 }
        ).addTo(map)
      }
      return
    }

    const addMarker = (item, target) => {
      const style = getStyle(item, activeSheet, colorBySubdivision)
      let marker
      if (!style) {
        const el = document.createElement('div')
        el.className = 'cctv-icon'
        marker = L.marker([item.Latitude, item.Longitude], {
          icon: L.divIcon({ className: '', html: el, iconSize: [16, 16] }),
        })
      } else {
        marker = L.circleMarker([item.Latitude, item.Longitude], {
          radius: 6, weight: 1.5, fillOpacity: 0.9, ...style,
        })
      }
      marker.bindPopup(buildPopup(item, activeSheet), { maxWidth: 240 })
      if (target.addLayer) target.addLayer(marker)
      else marker.addTo(target)
    }

    if (mapView === 'cluster') {
      const cluster = L.markerClusterGroup({ chunkedLoading: true })
      filteredData.forEach(item => addMarker(item, cluster))
      map.addLayer(cluster)
      layersRef.current.cluster = cluster
    } else {
      filteredData.forEach(item => addMarker(item, layersRef.current.point))
    }
  }, [filteredData, mapView, activeSheet, colorBySubdivision])

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!mapRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(mapRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,                 // 2× for crisp output
        backgroundColor: '#0a0e1a',
        logging: false,
        ignoreElements: (el) =>
          el.classList?.contains('leaflet-control-container'), // skip zoom/layer controls
      })

      // Stamp label bottom-left
      const ctx = canvas.getContext('2d')
      const tabLabel = activeSheet
        .replace('100_calls_new', '100 Calls')
        .replace('Robbrey-theft', 'Robbery / Theft')
        .replace('__empty__', 'Empty Map')
      const label = `Thoothukudi Police · ${tabLabel} · ${new Date().toLocaleDateString('en-IN')}`
      const scale = 2
      ctx.font = `bold ${13 * scale}px Inter, sans-serif`
      const tw = ctx.measureText(label).width
      const pad = 10 * scale
      const bh = 28 * scale
      const by = canvas.height - bh - 10 * scale
      ctx.fillStyle = 'rgba(10,14,26,0.82)'
      ctx.beginPath()
      ctx.roundRect(12 * scale, by, tw + pad * 2, bh, 6 * scale)
      ctx.fill()
      ctx.fillStyle = '#a5b4fc'
      ctx.fillText(label, 12 * scale + pad, by + bh * 0.67)

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `crime_map_${tabLabel.replace(/[^a-z0-9]/gi,'_')}_${new Date().toISOString().slice(0,10)}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Map export error:', err)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Screenshot button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        title="Export map as PNG"
        style={{
          position: 'absolute', top: 12, right: 52, zIndex: 900,
          width: 36, height: 36, borderRadius: 8,
          background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.35)',
          color: exporting ? '#64748b' : '#a5b4fc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: exporting ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.15s',
          fontSize: 16,
        }}
      >
        {exporting ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </path>
          </svg>
        ) : (
          /* Camera icon */
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        )}
      </button>

      {exporting && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10,14,26,0.4)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 850, pointerEvents: 'none',
        }}>
          <div style={{
            padding: '14px 24px', borderRadius: 12,
            background: 'rgba(10,14,26,0.9)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc', fontSize: 14, fontWeight: 500,
          }}>
            📸 Capturing map…
          </div>
        </div>
      )}


      {filteredData.length > 0 && activeSheet && (
        <div style={{
          position: 'absolute', bottom: 16, left: 16, zIndex: 800,
          padding: '6px 14px', borderRadius: 20,
          background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.3)',
          color: '#a5b4fc', fontSize: 13, fontWeight: 600,
          boxShadow: '0 0 16px rgba(99,102,241,0.2)',
          pointerEvents: 'none',
        }}>
          {filteredData.length.toLocaleString()} incidents
        </div>
      )}
    </div>
  )
}
