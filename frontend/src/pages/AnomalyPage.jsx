import { useState, useEffect } from 'react'
import { AlertOctagon, RefreshCw, ShieldAlert, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { getAnomaly } from '../services/api'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import PlotlyChart from '../components/PlotlyChart'
import DataTable from '../components/DataTable'

export default function AnomalyPage() {
  const { session, cleaningResult } = useApp()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => { if (session && !result) fetchAnomaly() }, [session])

  const fetchAnomaly = async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await getAnomaly(session.session_id, !!cleaningResult)
      setResult(res)
      toast.success(`Found ${res.iso_forest_anomalies} anomalies`)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  if (!session) return <EmptyState title="No Dataset Loaded" description="Upload a CSV to detect anomalies." />
  if (loading) return <LoadingSpinner text="Running Isolation Forest anomaly detection..." size="lg" />

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader icon={AlertOctagon} title="Anomaly Detection"
        subtitle="Isolation Forest + IQR multi-method anomaly analysis"
        gradient="from-red-500 to-rose-600"
        actions={<button onClick={fetchAnomaly} className="btn-ghost"><RefreshCw className="w-4 h-4" />Refresh</button>}
      />

      {!result && !loading && (
        <div className="glass p-16 text-center animate-fade-up">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <button onClick={fetchAnomaly} className="btn-primary">Run Detection</button>
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-6 animate-fade-up">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Total Rows',          value:result.total_rows?.toLocaleString(),           color:'text-white' },
              { label:'Isolation Forest',    value:`${result.iso_forest_anomalies} (${result.iso_forest_anomaly_pct}%)`, color:'text-red-400' },
              { label:'IQR Anomaly Rows',    value:`${result.iqr_anomaly_rows} (${result.iqr_anomaly_row_pct}%)`,       color:'text-amber-400' },
              { label:'Columns with Anomalies', value:result.column_anomaly_summary?.length ?? 0, color:'text-orange-400' },
            ].map(({ label, value, color }, i) => (
              <div key={label} className="metric-card animate-fade-up" style={{ animationDelay:`${i*60}ms` }}>
                <p className="text-xs text-slate-600 uppercase tracking-wider font-bold">{label}</p>
                <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          {result.charts?.map(chart => (
            <div key={chart.id} className="glass p-5 animate-fade-up">
              <PlotlyChart data={chart.data} layout={chart.layout} className="h-72" />
            </div>
          ))}

          {/* Column breakdown */}
          {result.column_anomaly_summary?.length > 0 && (
            <div className="glass overflow-hidden animate-fade-up">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400" />
                <h3 className="section-title text-base mb-0">Column Anomaly Breakdown (IQR)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['Column','Anomaly Count','Anomaly %','Lower Bound','Upper Bound','Min Anomaly','Max Anomaly'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.column_anomaly_summary.map((c, i) => (
                      <tr key={c.column} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors animate-fade-up"
                        style={{ animationDelay:`${i*40}ms` }}>
                        <td className="px-4 py-3 font-semibold text-white">{c.column}</td>
                        <td className="px-4 py-3 font-mono text-red-400 font-bold">{c.count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-surface-400 rounded-full overflow-hidden w-16">
                              <div className="h-full bg-red-500 rounded-full" style={{ width:`${Math.min(c.pct, 100)}%` }} />
                            </div>
                            <span className="font-mono text-xs text-red-400">{c.pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.lower_bound}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.upper_bound}</td>
                        <td className="px-4 py-3 font-mono text-xs text-amber-400">{c.min_anomaly ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-amber-400">{c.max_anomaly ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Anomalous rows sample */}
          {result.sample_anomalous_rows?.length > 0 && (
            <div className="animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-red-400" />
                <h3 className="section-title text-base">Sample Anomalous Rows (top 20)</h3>
              </div>
              <DataTable data={result.sample_anomalous_rows.slice(0,10)} title="Anomalous Rows Preview" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
