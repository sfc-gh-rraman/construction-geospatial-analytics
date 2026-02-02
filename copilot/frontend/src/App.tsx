import { useState } from 'react'
import { Layout } from './components/Layout'
import { 
  CommandCenter, 
  FleetOverview, 
  MLExplainability,
  SiteMap,
  Architecture
} from './pages'

type Page = 'command' | 'fleet' | 'map' | 'ml' | 'architecture'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('command')

  const renderPage = () => {
    switch (currentPage) {
      case 'command':
        return <CommandCenter />
      case 'fleet':
        return <FleetOverview />
      case 'map':
        return <SiteMap />
      case 'ml':
        return <MLExplainability />
      case 'architecture':
        return <Architecture />
      default:
        return <CommandCenter />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default App
