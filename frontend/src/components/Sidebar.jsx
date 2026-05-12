import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Upload, BarChart3, Sparkles, TrendingUp, Brain,
  ChevronLeft, ChevronRight, Database, RefreshCw,
  Cpu, AlertOctagon, Microscope, Wand2, Download
} from 'lucide-react'
import { useApp } from '../App'
import { downloadPDF, downloadReport } from '../services/api'
import toast from 'react-hot-toast'

const NAV = [
  {
    section: 'Core Pipeline',
    items: [
      { path:'/upload',   icon:Upload,    label:'Upload Data',    desc:'Import CSV',        color:'from-blue-500 to-cyan-500' },
      { path:'/quality',  icon:BarChart3,  label:'Data Quality',  desc:'Quality Score',     color:'from-emerald-500 to-teal-500' },
      { path:'/cleaning', icon:Sparkles,   label:'Auto Clean',    desc:'Smart Cleaning',    color:'from-amber-500 to-orange-500' },
      { path:'/eda',      icon:TrendingUp, label:'EDA & Insights',desc:'Visualization',     color:'from-sky-500 to-blue-500' },
    ]
  },
  {
    section: 'AI & ML',
    items: [
      { path:'/automl',   icon:Cpu,          label:'AutoML',        desc:'8-Model Leaderboard',  color:'from-amber-400 to-yellow-500' },
      { path:'/ml',       icon:Brain,         label:'XAI & SHAP',   desc:'Explain Predictions',  color:'from-violet-500 to-purple-600' },
    ]
  },
  {
    section: 'Advanced',
    items: [
      { path:'/anomaly',   icon:AlertOctagon, label:'Anomaly',      desc:'Isolation Forest',    color:'from-red-500 to-rose-600' },
      { path:'/profiling', icon:Microscope,   label:'Profiling',    desc:'Deep Stats',          color:'from-teal-500 to-cyan-600' },
      { path:'/features',  icon:Wand2,        label:'Features',     desc:'Engineering',         color:'from-pink-500 to-rose-500' },
    ]
  },
]

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, session, resetAll } = useApp()
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)

  const handlePDF = async () => {
    if (!session) { toast.error('No session — upload a file first.'); return }
    setDownloading(true)
    try { await downloadPDF(session.session_id); toast.success('PDF downloaded!') }
    catch (e) { toast.error(e.message) }
    finally { setDownloading(false) }
  }

  return (
    <aside className={`fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300
      ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      style={{ background:'rgba(8,9,16,0.97)', borderRight:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(20px)' }}>

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 border-b border-white/5 h-16 flex-shrink-0 ${sidebarCollapsed?'justify-center':''}`}>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-surface-900 animate-pulse" />
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in overflow-hidden">
            <div className="font-bold text-sm text-white leading-tight" style={{fontFamily:'DM Serif Display,serif'}}>
              DataSense <span className="text-brand-400">AI</span>
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5 font-semibold uppercase tracking-wider">v2.0 · Startup Grade</div>
          </div>
        )}
      </div>

      {/* Session badge */}
      {session && !sidebarCollapsed && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl border border-brand-500/20 flex-shrink-0"
          style={{background:'rgba(99,102,241,0.07)'}}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-xs text-brand-300 font-semibold truncate">{session.filename}</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            {session.rows?.toLocaleString()} rows · {session.columns} cols
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest px-3 mb-1.5">{section}</p>
            )}
            <div className="space-y-0.5">
              {items.map(({ path, icon:Icon, label, desc, color }, i) => (
                <NavLink key={path} to={path}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                     ${isActive ? 'text-white' : 'text-slate-500 hover:text-white'}
                     ${sidebarCollapsed ? 'justify-center' : ''}`
                  }
                  title={sidebarCollapsed ? label : undefined}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))',border:'1px solid rgba(99,102,241,0.25)'}} />
                      )}
                      <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200
                        ${isActive ? `bg-gradient-to-br ${color} shadow-md` : 'bg-white/5 group-hover:bg-white/10'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      {!sidebarCollapsed && (
                        <div className="relative z-10 flex-1 min-w-0">
                          <div className="text-xs font-semibold leading-tight">{label}</div>
                          <div className="text-[10px] text-slate-600 group-hover:text-slate-500 transition-colors">{desc}</div>
                        </div>
                      )}
                      {isActive && !sidebarCollapsed && (
                        <div className="relative z-10 w-1.5 h-1.5 bg-brand-400 rounded-full flex-shrink-0" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/5 flex-shrink-0 space-y-1">
        {session && !sidebarCollapsed && (
          <button onClick={handlePDF} disabled={downloading}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
              transition-all duration-200 border
              ${downloading
                ? 'text-slate-600 border-white/5 cursor-not-allowed'
                : 'text-brand-400 border-brand-500/20 hover:bg-brand-500/10 hover:border-brand-500/30'}`}>
            {downloading
              ? <div className="w-3.5 h-3.5 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin flex-shrink-0" />
              : <Download className="w-3.5 h-3.5 flex-shrink-0" />}
            <span>{downloading ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        )}
        {session && (
          <button onClick={() => { resetAll(); navigate('/upload') }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600
              hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20
              transition-all duration-200 text-xs font-semibold ${sidebarCollapsed?'justify-center':''}`}
            title="New session">
            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
            {!sidebarCollapsed && <span>New Session</span>}
          </button>
        )}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700
            hover:text-slate-400 hover:bg-white/5 transition-all duration-200 text-xs ${sidebarCollapsed?'justify-center':''}`}>
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
