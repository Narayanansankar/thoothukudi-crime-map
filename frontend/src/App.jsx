import { useState, useCallback, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from './components/Header'
import MapView from './components/MapView'
import FilterPanel from './components/FilterPanel'
import LoadingOverlay from './components/LoadingOverlay'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } }
})

const TABS = [
  { id: '100_calls_new', label: '100 Calls', color: '#6366f1' },
  { id: 'Robbrey-theft', label: 'Robbery / Theft', color: '#ef4444' },
  { id: 'Hurt', label: 'Hurt', color: '#f97316' },
  { id: 'POCSO', label: 'POCSO', color: '#ec4899' },
  { id: 'CCTV', label: 'CCTV', color: '#06b6d4' },
]

function loadSavedPoints() {
  try { return JSON.parse(localStorage.getItem('crimedash_points') || '[]') }
  catch { return [] }
}

function Dashboard() {
  const [activeSheet, setActiveSheet] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [mapView, setMapView] = useState('point')
  const [filters, setFilters] = useState({ subdivisions: [], crimeType: 'All', fromDate: '', toDate: '', subCategories: [] })
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [policeOpacity, setPoliceOpacity] = useState(0.5)
  const [savedPoints, setSavedPoints] = useState(loadSavedPoints)
  const [showActiveVillages, setShowActiveVillages] = useState(false)
  const [showDormantVillages, setShowDormantVillages] = useState(false)
  const [activeVillages, setActiveVillages] = useState([])
  const [dormantVillages, setDormantVillages] = useState([])
  const [subdivisionList, setSubdivisionList] = useState([])

  useEffect(() => {
    fetch('/api/atrocity/active').then(r => r.json()).then(setActiveVillages).catch(() => {})
    fetch('/api/atrocity/dormant').then(r => r.json()).then(setDormantVillages).catch(() => {})
    fetch('/api/subdivisions').then(r => r.json()).then(setSubdivisionList).catch(() => {})
  }, [])
  const [colorBySubdivision, setColorBySubdivision] = useState(false)

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  const handleTabChange = useCallback((sheetId) => {
    setActiveSheet(sheetId)
    setFilters({ subdivisions: [], crimeType: 'All', fromDate: '', toDate: '', subCategories: [] })
    setMapView('point')
  }, [])

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), [])
  const handleDataLoaded = useCallback(() => setLastUpdated(new Date()), [])

  const addPoint = useCallback((pt) => {
    setSavedPoints(prev => {
      const next = [...prev, { ...pt, id: Date.now() }]
      localStorage.setItem('crimedash_points', JSON.stringify(next))
      return next
    })
  }, [])

  const removePoint = useCallback((id) => {
    setSavedPoints(prev => {
      const next = prev.filter(p => p.id !== id)
      localStorage.setItem('crimedash_points', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: isDark ? '#0a0e1a' : '#f1f5f9' }}>
      <Header
        tabs={TABS}
        activeSheet={activeSheet}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        onToggleTheme={toggleTheme}
        isDark={isDark}
        lastUpdated={lastUpdated}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <FilterPanel
          activeSheet={activeSheet}
          filters={filters}
          setFilters={setFilters}
          mapView={mapView}
          setMapView={setMapView}
          isDark={isDark}
          refreshKey={refreshKey}
          policeOpacity={policeOpacity}
          setPoliceOpacity={setPoliceOpacity}
          savedPoints={savedPoints}
          onAddPoint={addPoint}
          onRemovePoint={removePoint}
          showActiveVillages={showActiveVillages}
          setShowActiveVillages={setShowActiveVillages}
          showDormantVillages={showDormantVillages}
          setShowDormantVillages={setShowDormantVillages}
          activeVillages={activeVillages}
          dormantVillages={dormantVillages}
          subdivisionList={subdivisionList}
          colorBySubdivision={colorBySubdivision}
          setColorBySubdivision={setColorBySubdivision}
        />

        <MapView
          activeSheet={activeSheet}
          filters={filters}
          mapView={mapView}
          isDark={isDark}
          refreshKey={refreshKey}
          setLoading={setLoading}
          onDataLoaded={handleDataLoaded}
          policeOpacity={policeOpacity}
          savedPoints={savedPoints}
          showActiveVillages={showActiveVillages}
          showDormantVillages={showDormantVillages}
          activeVillages={activeVillages}
          dormantVillages={dormantVillages}
          colorBySubdivision={colorBySubdivision}
        />

        {loading && <LoadingOverlay />}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}
