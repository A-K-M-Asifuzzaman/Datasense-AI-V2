import { useState, useEffect } from 'react'
import { Microscope, RefreshCw, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { getProfile } from '../services/api'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import PlotlyChart from '../components/PlotlyChart'

function StatPill({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={`font-mono text-xs font-bold ${highlight ? 'text-amber-400' : 'text-slate-300'}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function ColumnCard({ col, stats, i }) {
  const [open, setOpen] = useState(false)
  const isNum = stats.mean !== undefined
  const missingHigh = (stats.missing_pct || 0) > 10
  const skewHigh = Math.abs(stats.skewness || 0) > 2

  return (
    <div className="glass rounded-xl overflow-hidden animate-fade-up border border-white/5 hover:border-white/10 transition-all"
      style={{ animationDelay: `${i * 40}ms` }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${isNum ? 'bg-brand-500' : 'bg-purple-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white truncate">{col}</span>
            <span className={`badge text-[10px] ${isNum
              ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
              : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'}`}>
              {stats.dtype}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">{stats.count?.toLocaleString()} values</span>
            <span className="text-xs text-slate-500">{stats.unique} unique</span>
            {missingHigh && <span className="text-xs text-amber-400">{stats.missing_pct}% missing</span>}
          </div>
        </div>
        {/* Indicators */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {stats.is_normal === true && <span title="Normal distribution" className="text-emerald-400 text-xs">N</span>}
          {stats.is_normal === false && <span title="Not normal" className="text-amber-400 text-xs">~N</span>}
          {skewHigh && <span title="High skew" className="badge bg-amber-500/15 text-amber-400 text-[10px]">skewed</span>}
          {stats.is_binary && <span className="badge bg-purple-500/15 text-purple-400 text-[10px]">binary</span>}
        </div>
        <span className={`text-slate-500 text-xs ml-1 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="px-4 pb-4 animate-fade-in border-t border-white/5 pt-3">
          {isNum ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Mean',     stats.mean?.toFixed(4)],
                ['Median',   stats.median?.toFixed(4)],
                ['Std',      stats.std?.toFixed(4)],
                ['Min',      stats.min?.toFixed(4)],
                ['Max',      stats.max?.toFixed(4)],
                ['IQR',      stats.iqr?.toFixed(4)],
                ['Skewness', stats.skewness?.toFixed(4)],
                ['Kurtosis', stats.kurtosis?.toFixed(4)],
                ['Outliers', `${stats.outliers} (${stats.outlier_pct}%)`],
                ['Zeros',    stats.zeros],
                ['Negatives',stats.negatives],
                ['Normality p', stats.normality_p_value?.toFixed(4) ?? 'N/A'],
              ].map(([label, value]) => (
                <StatPill key={label} label={label} value={value}
                  highlight={label === 'Skewness' && Math.abs(parseFloat(value) || 0) > 2} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <StatPill label="Top Value" value={stats.top_value} />
              <StatPill label="Top Freq" value={`${stats.top_freq} (${stats.top_freq_pct}%)`} />
              <StatPill label="Entropy" value={stats.entropy?.toFixed(4)} />
              <StatPill label="Binary" value={stats.is_binary ? 'Yes' : 'No'} />
              {stats.top_5 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-bold">Top 5 Values</p>
                  {Object.entries(stats.top_5).map(([val, count]) => (
                    <div key={val} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-slate-400 w-28 truncate">{val}</span>
                      <div className="flex-1 h-1.5 bg-surface-400 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(count / (stats.count || 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 font-mono w-10 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProfilingPage() {
  const { session, cleaningResult } = useApp()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { if (session && !result) fetchProfile() }, [session])

  const fetchProfile = async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await getProfile(session.session_id, !!cleaningResult)
      setResult(res)
      toast.success('Deep profile complete')
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  if (!session) return <EmptyState title="No Dataset Loaded" description="Upload a CSV to deep-profile your data." />
  if (loading) return <LoadingSpinner text="Running deep statistical profiling..." size="lg" />

  const filteredCols = result
    ? Object.entries(result.columns || {}).filter(([col]) =>
        col.toLowerCase().includes(search.toLowerCase()))
    : []

  const ov = result?.overview || {}

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader icon={Microscope} title="Deep Statistical Profile"
        subtitle="Per-column statistics, normality tests, distribution shapes, and correlation matrix"
        gradient="from-teal-500 to-cyan-600"
        actions={<button onClick={fetchProfile} className="btn-ghost"><RefreshCw className="w-4 h-4" />Refresh</button>}
      />

      {result && (
        <div className="space-y-6 animate-fade-up">
          {/* Overview */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label:'Rows',          value:ov.rows?.toLocaleString(),      color:'text-white' },
              { label:'Columns',       value:ov.columns,                     color:'text-brand-400' },
              { label:'Missing Cells', value:ov.missing_cells?.toLocaleString(), color:ov.missing_cells > 0 ? 'text-amber-400' : 'text-emerald-400' },
              { label:'Missing %',     value:`${ov.missing_pct}%`,           color:ov.missing_pct > 5 ? 'text-amber-400' : 'text-emerald-400' },
              { label:'Duplicates',    value:ov.duplicate_rows,              color:ov.duplicate_rows > 0 ? 'text-red-400' : 'text-emerald-400' },
              { label:'Memory (MB)',   value:ov.memory_mb,                   color:'text-slate-300' },
            ].map(({ label, value, color }, i) => (
              <div key={label} className="metric-card text-center animate-scale-in" style={{ animationDelay:`${i*50}ms` }}>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">{label}</p>
                <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* High-corr pairs */}
          {result.high_correlation_pairs?.length > 0 && (
            <div className="glass p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <h3 className="section-title text-base mb-0">High Correlation Pairs</h3>
                <span className="badge bg-brand-500/15 text-brand-400 ml-auto text-xs border border-brand-500/25">
                  {result.high_correlation_pairs.length} pairs (|r| &gt; 0.7)
                </span>
              </div>
              <div className="space-y-2">
                {result.high_correlation_pairs.map((pair, i) => {
                  const abs = Math.abs(pair.correlation)
                  const color = abs > 0.9 ? '#ef4444' : abs > 0.8 ? '#f59e0b' : '#6366f1'
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-fade-up"
                      style={{ background: 'rgba(255,255,255,0.03)', animationDelay:`${i*40}ms` }}>
                      <span className="font-mono text-xs text-slate-300 w-28 truncate">{pair.col1}</span>
                      <span className="text-slate-600">↔</span>
                      <span className="font-mono text-xs text-slate-300 w-28 truncate">{pair.col2}</span>
                      <div className="flex-1 h-1.5 bg-surface-400 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width:`${abs*100}%`, background:color }} />
                      </div>
                      <span className="font-mono text-xs font-bold w-14 text-right" style={{ color }}>
                        {pair.correlation.toFixed(3)}
                      </span>
                      <span className="badge text-[10px]" style={{ background:`${color}20`, color }}>
                        {pair.strength}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Profile charts */}
          {result.charts?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.charts.map(chart => (
                <div key={chart.id} className="glass p-5 animate-fade-up">
                  <PlotlyChart data={chart.data} layout={chart.layout} className="h-64" />
                </div>
              ))}
            </div>
          )}

          {/* Column cards */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="section-title text-base mb-0">Column Profiles</h3>
              <span className="badge bg-surface-400 text-slate-400 text-xs">{filteredCols.length} columns</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter columns..." className="input-field ml-auto w-48 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCols.map(([col, stats], i) => (
                <ColumnCard key={col} col={col} stats={stats} i={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
