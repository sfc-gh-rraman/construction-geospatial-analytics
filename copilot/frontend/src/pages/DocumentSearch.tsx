import { useState } from 'react'
import { Search, FileText, Calendar, MapPin, ChevronRight, Filter, Building, Shield, Wrench } from 'lucide-react'

interface Document {
  id: string
  title: string
  type: 'geotech' | 'safety' | 'equipment' | 'procedure'
  site: string
  date: string
  summary: string
  highlights: string[]
}

const sampleDocuments: Document[] = [
  {
    id: '1',
    title: 'Geotechnical Report - Project Alpha Phase 1',
    type: 'geotech',
    site: 'Project Alpha',
    date: '2026-01-15',
    summary: 'Soil bearing capacity analysis for main haul road foundation. Identifies soft ground conditions in Sector 3 NW quadrant requiring additional compaction.',
    highlights: [
      'Bearing capacity: 2500 psf in stable zones',
      'Soft clay identified at 3-5m depth in Sector 3',
      'Recommended compaction: 95% modified Proctor',
      'Water table at 8m - no dewatering required',
    ],
  },
  {
    id: '2',
    title: 'Site Safety Plan - Q1 2026',
    type: 'safety',
    site: 'Project Alpha',
    date: '2026-01-01',
    summary: 'Comprehensive safety protocols for earthwork operations including haul road traffic management and equipment inspection requirements.',
    highlights: [
      'Maximum speed: 15 mph loaded, 25 mph empty',
      'Pedestrian exclusion zones marked with orange fencing',
      'Daily pre-shift equipment inspections required',
      'Spotter required for all reversing operations',
    ],
  },
  {
    id: '3',
    title: 'CAT 793 Operating Parameters',
    type: 'equipment',
    site: 'All Sites',
    date: '2025-12-01',
    summary: 'Optimal operating parameters for CAT 793 haul trucks on clay and gravel surfaces. Includes grade limitations and payload guidelines.',
    highlights: [
      'Maximum grade: 10% loaded, 15% empty',
      'Optimal payload: 220-240 tons',
      'Tire pressure: 100 psi on clay surfaces',
      'Engine idle time should not exceed 15% of shift',
    ],
  },
  {
    id: '4',
    title: 'Haul Road Construction Procedure',
    type: 'procedure',
    site: 'All Sites',
    date: '2025-11-15',
    summary: 'Standard procedure for constructing and maintaining haul roads on earthwork sites. Includes drainage, surfacing, and maintenance schedules.',
    highlights: [
      'Road width: 40ft minimum for two-way traffic',
      'Crown: 2% grade from centerline',
      'Drainage ditch: 2ft deep on uphill side',
      'Water application: 3x daily in dry conditions',
    ],
  },
  {
    id: '5',
    title: 'Geotechnical Report - Fill Zone B',
    type: 'geotech',
    site: 'Project Alpha',
    date: '2026-01-20',
    summary: 'Compaction verification and moisture content analysis for Fill Zone B. Notes areas requiring additional passes.',
    highlights: [
      'Achieved density: 92-96% of modified Proctor',
      'NW corner at 89% - needs additional compaction',
      'Optimal moisture content: 12-15%',
      'Current moisture: 14% - within spec',
    ],
  },
]

const documentTypes = [
  { id: 'geotech', label: 'Geotechnical', icon: Building, color: 'amber' },
  { id: 'safety', label: 'Safety Plans', icon: Shield, color: 'green' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, color: 'blue' },
  { id: 'procedure', label: 'Procedures', icon: FileText, color: 'purple' },
]

export function DocumentSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const filteredDocs = sampleDocuments.filter((doc) => {
    const matchesSearch =
      searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.highlights.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = !activeFilter || doc.type === activeFilter
    return matchesSearch && matchesFilter
  })

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'geotech': return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' }
      case 'safety': return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' }
      case 'equipment': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' }
      case 'procedure': return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' }
      default: return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' }
    }
  }

  return (
    <div className="p-6 animated-grid-bg min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-200 flex items-center gap-3">
          <Search className="text-amber-400" />
          Document Search
        </h1>
        <p className="text-slate-400">Search geotechnical reports, safety plans, and equipment manuals</p>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search documents... (e.g., 'compaction', 'haul road', 'safety')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 input"
            />
          </div>
        </div>
        
        {/* Type Filters */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />
          <span className="text-sm text-slate-500 mr-2">Filter:</span>
          {documentTypes.map((type) => {
            const Icon = type.icon
            const isActive = activeFilter === type.id
            return (
              <button
                key={type.id}
                onClick={() => setActiveFilter(isActive ? null : type.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? `${getTypeStyles(type.id).bg} ${getTypeStyles(type.id).text} ${getTypeStyles(type.id).border} border`
                    : 'bg-navy-700 text-slate-400 hover:bg-navy-600'
                  }`}
              >
                <Icon size={14} />
                {type.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Document List */}
        <div className="w-1/2 space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-400">No documents match your search</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const styles = getTypeStyles(doc.type)
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left card hover:bg-navy-700/50 transition-colors ${
                    selectedDoc?.id === doc.id ? 'ring-2 ring-amber-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className={styles.text} size={20} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-200">{doc.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
                            {documentTypes.find(t => t.id === doc.type)?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {doc.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {doc.site}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-400" size={20} />
                  </div>
                  <p className="mt-3 text-sm text-slate-300 line-clamp-2">{doc.summary}</p>
                </button>
              )
            })
          )}
        </div>

        {/* Document Detail */}
        <div className="w-1/2">
          {selectedDoc ? (
            <div className="card sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-200">{selectedDoc.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-slate-400 text-sm">{selectedDoc.date}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-sm">{selectedDoc.site}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${getTypeStyles(selectedDoc.type).bg} ${getTypeStyles(selectedDoc.type).text}`}>
                  {documentTypes.find(t => t.id === selectedDoc.type)?.label}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
                  Summary
                </h3>
                <p className="text-slate-200">{selectedDoc.summary}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
                  Key Information
                </h3>
                <ul className="space-y-2">
                  {selectedDoc.highlights.map((highlight, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="text-amber-400">•</span>
                      <span className="text-slate-300">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-6 border-t border-navy-700 space-y-3">
                <button className="btn-primary w-full">
                  Ask TERRA About This Document
                </button>
                <button className="w-full px-4 py-2 bg-navy-700 text-slate-300 rounded-lg hover:bg-navy-600 transition-colors">
                  Download PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-16">
              <FileText className="mx-auto text-slate-500 mb-4" size={48} />
              <p className="text-slate-400">Select a document to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
