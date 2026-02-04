import { useState } from 'react'
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
  Architecture
} from './pages'

export type Page = 'landing' | 'regional' | 'siteops' | 'equipment' | 'earthwork' | 'ghost' | 'brief' | 'docs' | 'architecture'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing')

  // Landing page without layout wrapper
  if (currentPage === 'landing') {
    return <Landing onNavigate={setCurrentPage} />
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
      default:
        return <RegionalOverview />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default App
