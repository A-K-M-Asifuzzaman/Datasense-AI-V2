import { useState, createContext, useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import UploadPage   from './pages/UploadPage'
import QualityPage  from './pages/QualityPage'
import CleaningPage from './pages/CleaningPage'
import EDAPage      from './pages/EDAPage'
import MLPage       from './pages/MLPage'
import AutoMLPage   from './pages/AutoMLPage'
import AnomalyPage  from './pages/AnomalyPage'
import ProfilingPage from './pages/ProfilingPage'
import FeaturesPage  from './pages/FeaturesPage'

export const AppContext = createContext(null)
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppContext')
  return ctx
}

export default function App() {
  const [session, setSession]               = useState(null)
  const [qualityData, setQualityData]       = useState(null)
  const [cleaningResult, setCleaningResult] = useState(null)
  const [edaData, setEdaData]               = useState(null)
  const [insightsData, setInsightsData]     = useState(null)
  const [mlResult, setMlResult]             = useState(null)
  const [xaiResult, setXaiResult]           = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const resetAll = () => {
    setSession(null); setQualityData(null); setCleaningResult(null)
    setEdaData(null); setInsightsData(null); setMlResult(null); setXaiResult(null)
  }

  return (
    <AppContext.Provider value={{
      session, setSession,
      qualityData, setQualityData,
      cleaningResult, setCleaningResult,
      edaData, setEdaData,
      insightsData, setInsightsData,
      mlResult, setMlResult,
      xaiResult, setXaiResult,
      sidebarCollapsed, setSidebarCollapsed,
      resetAll,
    }}>
      <Router>
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.06] blur-3xl"
            style={{ background:'radial-gradient(circle,#6366f1,transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-[0.04] blur-3xl"
            style={{ background:'radial-gradient(circle,#8b5cf6,transparent)' }} />
          <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full opacity-[0.03] blur-3xl"
            style={{ background:'radial-gradient(circle,#10b981,transparent)' }} />
          <div className="absolute inset-0 bg-grid" />
        </div>

        <div className="relative z-10 flex h-screen overflow-hidden">
          <Sidebar />
          <main className={`flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300
            ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
            <Routes>
              <Route path="/"          element={<Navigate to="/upload" replace />} />
              <Route path="/upload"    element={<UploadPage />} />
              <Route path="/quality"   element={<QualityPage />} />
              <Route path="/cleaning"  element={<CleaningPage />} />
              <Route path="/eda"       element={<EDAPage />} />
              <Route path="/ml"        element={<MLPage />} />
              <Route path="/automl"    element={<AutoMLPage />} />
              <Route path="/anomaly"   element={<AnomalyPage />} />
              <Route path="/profiling" element={<ProfilingPage />} />
              <Route path="/features"  element={<FeaturesPage />} />
            </Routes>
          </main>
        </div>

        <Toaster position="top-right" toastOptions={{
          style: {
            background:'rgba(17,20,32,0.95)', backdropFilter:'blur(12px)',
            color:'#e2e8f0', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:'14px', fontSize:'13px', fontWeight:500, padding:'12px 16px',
          },
          success:{ iconTheme:{ primary:'#10b981', secondary:'#080910' } },
          error:{   iconTheme:{ primary:'#ef4444', secondary:'#080910' } },
          duration: 4000,
        }} />
      </Router>
    </AppContext.Provider>
  )
}
