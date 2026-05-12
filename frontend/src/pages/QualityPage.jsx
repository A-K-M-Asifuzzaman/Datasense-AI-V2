import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ArrowRight, RefreshCw, AlertTriangle, Info, CheckCircle, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { getQuality, getSuggestions } from '../services/api'
import PageHeader from '../components/PageHeader'
import ScoreGauge, { MiniScore } from '../components/ScoreGauge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import PlotlyChart from '../components/PlotlyChart'

const SEV = {
  high:   { cls:'bg-red-500/10 border-red-500/25 text-red-300',   icon: AlertTriangle, badge:'bg-red-500/20 text-red-400' },
  medium: { cls:'bg-amber-500/10 border-amber-500/25 text-amber-300', icon: Info,       badge:'bg-amber-500/20 text-amber-400' },
  low:    { cls:'bg-blue-500/10 border-blue-500/25 text-blue-300', icon: CheckCircle,  badge:'bg-blue-500/20 text-blue-400' },
}

function SuggestionCard({ s, i }) {
  const cfg = SEV[s.severity] || SEV.low
  const Icon = cfg.icon
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.cls} animate-fade-up`}
      style={{ animationDelay: `${i * 60}ms` }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{s.description}</p>
        <p className="text-xs opacity-60 mt-1">→ {s.action}</p>
      </div>
      <span className={`badge text-xs capitalize ${cfg.badge} flex-shrink-0`}>{s.severity}</span>
    </div>
  )
}

export default function QualityPage() {
  const { session, qualityData, setQualityData } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => { if (session && !qualityData) fetchQuality() }, [session])

  const fetchQuality = async () => {
    if (!session) return
    setLoading(true)
    try {
      const [q, s] = await Promise.all([getQuality(session.session_id), getSuggestions(session.session_id)])
      setQualityData(q); setSuggestions(s.suggestions || [])
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  if (!session) return <EmptyState title="No Dataset Loaded" description="Upload a CSV to analyze data quality." />
  if (loading)  return <LoadingSpinner text="Computing quality metrics…" size="lg" />
  if (!qualityData) return null

  const colStats = qualityData.column_stats || {}
  const cols = Object.keys(colStats)
  const missingCols = cols.filter(c => colStats[c].missing_pct > 0)
  const outlierCols = cols.filter(c => (colStats[c].outlier_count || 0) > 0)

  const missingChart = {
    data: [{ type:'bar', x:missingCols, y:missingCols.map(c=>colStats[c].missing_pct),
      marker:{ color:'#f59e0b', opacity:0.9 }, name:'Missing %' }],
    layout: { title:'Missing Value % per Column', xaxis:{title:'Column',tickangle:-30},
      yaxis:{title:'Missing %',range:[0,100]}, template:'plotly_dark',
      paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)', font:{color:'#e2e8f0'} }
  }
  const outlierChart = {
    data: [{ type:'bar', x:outlierCols, y:outlierCols.map(c=>colStats[c].outlier_count),
      marker:{ color:'#ef4444', opacity:0.9 }, name:'Outliers' }],
    layout: { title:'Outlier Count per Numeric Column', xaxis:{title:'Column',tickangle:-30},
      yaxis:{title:'Outlier Count'}, template:'plotly_dark',
      paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)', font:{color:'#e2e8f0'} }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader icon={BarChart3} title="Data Quality Dashboard"
        subtitle={`Analyzing ${session.filename} — ${session.rows?.toLocaleString()} rows × ${session.columns} columns`}
        gradient="from-emerald-500 to-teal-600"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchQuality} className="btn-ghost"><RefreshCw className="w-4 h-4"/>Refresh</button>
            <button onClick={() => navigate('/cleaning')} className="btn-primary">
              Clean Data <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        }
      />

      {/* Score overview */}
      <div className="glass p-8 mb-6 animate-fade-up">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <ScoreGauge score={qualityData.overall_score} label="Overall Quality Score" size="lg" />
          <div className="flex-1 grid grid-cols-2 gap-4 w-full">
            {[
              { label:'Completeness', score:qualityData.completeness, desc:'Non-null cell ratio' },
              { label:'Uniqueness',   score:qualityData.uniqueness,   desc:'Non-duplicate rows' },
              { label:'Outlier Score',score:qualityData.outlier_score,desc:'Clean numeric values' },
              { label:'Validity',     score:qualityData.validity,     desc:'Correct data types' },
            ].map((item, i) => (
              <div key={item.label} className="animate-fade-up" style={{ animationDelay: `${i*80}ms` }}>
                <MiniScore {...item} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Rows',       value:qualityData.total_rows?.toLocaleString(),       color:'text-white' },
          { label:'Missing Cells',    value:qualityData.total_missing?.toLocaleString(),    color:qualityData.total_missing>0?'text-amber-400':'text-emerald-400' },
          { label:'Duplicate Rows',   value:qualityData.total_duplicates?.toLocaleString(), color:qualityData.total_duplicates>0?'text-amber-400':'text-emerald-400' },
          { label:'Outlier Values',   value:qualityData.total_outliers?.toLocaleString(),   color:qualityData.total_outliers>0?'text-red-400':'text-emerald-400' },
        ].map(({ label, value, color }, i) => (
          <div key={label} className="metric-card animate-fade-up" style={{ animationDelay: `${i*60}ms` }}>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-bold">{label}</p>
            <p className={`text-3xl font-black mt-1 count-animate ${color}`}>{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {missingCols.length > 0 && (
          <div className="glass p-5 animate-fade-up delay-150">
            <h3 className="section-title text-base mb-3">Missing Values</h3>
            <PlotlyChart data={missingChart.data} layout={missingChart.layout} className="h-56" />
          </div>
        )}
        {outlierCols.length > 0 && (
          <div className="glass p-5 animate-fade-up delay-225">
            <h3 className="section-title text-base mb-3">Outlier Analysis</h3>
            <PlotlyChart data={outlierChart.data} layout={outlierChart.layout} className="h-56" />
          </div>
        )}
      </div>

      {/* Column stats table */}
      <div className="glass overflow-hidden mb-6 animate-fade-up delay-300">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="section-title text-base mb-0">Column Statistics</h3>
          <span className="badge bg-surface-400 text-slate-400 text-xs">{cols.length} columns</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{background:'rgba(255,255,255,0.02)'}}>
                {['Column','Type','Missing','Unique','Outliers','Skewness','Mean / Top'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-white/5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cols.map((col, i) => {
                const s = colStats[col]
                return (
                  <tr key={col} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{col}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${s.dtype.includes('int')||s.dtype.includes('float')
                        ?'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                        :'bg-purple-500/15 text-purple-300 border border-purple-500/20'}`}>{s.dtype}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs font-bold ${s.missing_pct>20?'text-red-400':s.missing_pct>5?'text-amber-400':'text-slate-500'}`}>
                        {s.missing_count} <span className="opacity-50">({s.missing_pct}%)</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.unique_count}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs font-bold ${(s.outlier_count||0)>0?'text-red-400':'text-slate-600'}`}>
                        {s.outlier_count ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.skewness!=null ? (
                        <span className={`font-mono text-xs ${Math.abs(s.skewness)>2?'text-amber-400':'text-slate-500'}`}>
                          {s.skewness.toFixed(3)}
                        </span>
                      ) : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {s.mean!=null ? s.mean.toFixed(3) : (s.top_value ?? '—')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="glass p-5 animate-fade-up delay-375">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base mb-0">Cleaning Suggestions</h3>
            <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/25">{suggestions.length} items</span>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => <SuggestionCard key={i} s={s} i={i} />)}
          </div>
          <button onClick={() => navigate('/cleaning')}
            className="btn-primary mt-4 w-full justify-center">
            Apply Suggestions <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      )}
    </div>
  )
}
