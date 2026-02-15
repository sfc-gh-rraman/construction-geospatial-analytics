import { useState, createContext, useContext, ReactNode } from 'react'
import { Layout } from './components/Layout'
import { 
  Landing,
  RegionalOverview,
  SiteCommand,
  SiteMap,
  EarthworkProgress,
  GhostCycleAnalysis,
  DailyBriefing,
  DocumentSearch,
  Architecture,
  MLExplainability
} from './pages'

export type Page = 'landing' | 'regional' | 'siteops' | 'equipment' | 'earthwork' | 'ghost' | 'brief' | 'docs' | 'architecture' | 'ml'

export interface NavigationContextType {
  currentPage: Page
  onNavigate: (page: Page) => void
  selectedSiteId: string | null
  setSelectedSiteId: (id: string | null) => void
  selectedEquipmentId: string | null
  setSelectedEquipmentId: (id: string | null) => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('landing')
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)

  const value: NavigationContextType = {
    currentPage,
    onNavigate: setCurrentPage,
    selectedSiteId,
    setSelectedSiteId,
    selectedEquipmentId,
    setSelectedEquipmentId,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

function AppContent() {
  const { currentPage, onNavigate, selectedSiteId } = useNavigation()

  if (currentPage === 'landing') {
    return <Landing onNavigate={onNavigate} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'regional':
        return <RegionalOverview />
      case 'siteops':
        return <SiteCommand />
      case 'equipment':
        return <SiteMap />
      case 'earthwork':
        return <EarthworkProgress />
      case 'ghost':
        return <GhostCycleAnalysis />
      case 'brief':
        return <DailyBriefing />
      case 'docs':
        return <DocumentSearch />
      case 'architecture':
        return <Architecture />
      case 'ml':
        return <MLExplainability />
      default:
        return <RegionalOverview />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={onNavigate} selectedSiteId={selectedSiteId}>
      {renderPage()}
    </Layout>
  )
}

function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  )
}

export default App
