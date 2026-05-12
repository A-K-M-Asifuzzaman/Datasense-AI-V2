import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Play, ArrowRight, CheckCircle, Download, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { cleanData, downloadCSV } from '../services/api'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'

const STRATEGIES = [
  { value:'auto',   label:'Auto (Recommended)', desc:'Mean for normal, Median for skewed, Mode for categorical' },
  { value:'mean',   label:'Fill with Mean',      desc:'Best for normally distributed numeric columns' },
  { value:'median', label:'Fill with Median',    desc:'Robust to outliers in numeric columns' },
  { value:'mode',   label:'Fill with Mode',      desc:'Most frequent value — good for categoricals' },
  { value:'drop',   label:'Drop Rows',           desc:'Remove any row containing a missing value' },
]

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 transition-all duration-200 hover:border-white/10"
      style={{background:'rgba(255,255,255,0.02)'}}>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
      </div>
      <button onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0
          ${checked ? 'bg-brand-600' : 'bg-surface-300'}`}
        style={{ boxShadow: checked ? '0 0 12px rgba(99,102,241,0.4)' : 'none' }}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300
          ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}

function LogItem({ text, i }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl animate-fade-up"
      style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.1)', animationDelay:`${i*40}ms` }}>
      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
    </div>
  )
}

export default function CleaningPage() {
  const { session, cleaningResult, setCleaningResult } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [cfg, setCfg] = useState({
    handle_missing: 'auto', remove_duplicates: true,
    handle_outliers: true, outlier_method: 'iqr'
  })

  if (!session) return <EmptyState title="No Dataset Loaded" description="Upload a CSV to use the cleaning module." />

  const handleClean = async () => {
    setLoading(true)
    try {
      const res = await cleanData({ session_id: session.session_id, ...cfg })
      setCleaningResult(res)
      toast.success(`Done! ${res.rows_removed} rows removed. ${res.cleaned_rows.toLocaleString()} rows remain.`)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const handleDownload = async () => {
    try { await downloadCSV(session.session_id); toast.success('CSV downloaded!') }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader icon={Sparkles} title="Smart Data Cleaning"
        subtitle="Configure cleaning strategies and apply them with one click"
        gradient="from-amber-500 to-orange-600"
        actions={cleaningResult && (
          <button onClick={() => navigate('/eda')} className="btn-primary">
            Run EDA <ArrowRight className="w-4 h-4"/>
          </button>
        )} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Config */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-5 animate-fade-up">
            <div className="flex items-center gap-2 mb-5">
              <Settings2 className="w-4 h-4 text-amber-400"/>
              <h3 className="section-title text-base mb-0">Configuration</h3>
            </div>

            {/* Missing strategy */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                Missing Value Strategy
              </label>
              <div className="space-y-2">
                {STRATEGIES.map(s => (
                  <label key={s.value}
                    className={`flex gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-200
                      ${cfg.handle_missing===s.value
                        ?'border-amber-500/40 text-white'
                        :'border-white/5 text-slate-400 hover:border-white/15'}`}
                    style={{ background: cfg.handle_missing===s.value ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)' }}>
                    <input type="radio" name="missing" value={s.value} checked={cfg.handle_missing===s.value}
                      onChange={() => setCfg(c=>({...c,handle_missing:s.value}))} className="mt-1 accent-amber-500 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">{s.label}</div>
                      <div className="text-xs opacity-50 mt-0.5">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 mb-5">
              <Toggle label="Remove Duplicates" desc="Drop exact duplicate rows"
                checked={cfg.remove_duplicates} onChange={() => setCfg(c=>({...c,remove_duplicates:!c.remove_duplicates}))} />
              <Toggle label="Handle Outliers" desc="Clip extreme numeric values"
                checked={cfg.handle_outliers} onChange={() => setCfg(c=>({...c,handle_outliers:!c.handle_outliers}))} />
            </div>

            {/* Outlier method */}
            {cfg.handle_outliers && (
              <div className="mb-5 animate-scale-in">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Outlier Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{v:'iqr',l:'IQR Clip'},{v:'zscore',l:'Z-Score'}].map(({v,l}) => (
                    <button key={v} onClick={() => setCfg(c=>({...c,outlier_method:v}))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200
                        ${cfg.outlier_method===v
                          ?'text-amber-400 border-amber-500/40':'text-slate-400 border-white/5 hover:border-white/15'}`}
                      style={{ background: cfg.outlier_method===v ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleClean} disabled={loading}
              className="btn-primary w-full justify-center">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Cleaning…</>
                : <><Play className="w-4 h-4"/>Apply Cleaning</>}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {loading && <LoadingSpinner text="Applying cleaning operations…" />}

          {!loading && !cleaningResult && (
            <div className="glass p-16 flex flex-col items-center justify-center text-center animate-fade-up"
              style={{minHeight:300}}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 animate-float"
                style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)'}}>
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="section-title text-lg mb-2">Ready to Clean</h3>
              <p className="text-slate-500 text-sm max-w-xs">Configure your cleaning strategy on the left, then hit Apply.</p>
            </div>
          )}

          {cleaningResult && !loading && (
            <div className="space-y-4 animate-fade-up">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'Original Rows',  value:cleaningResult.original_rows?.toLocaleString(), color:'text-white' },
                  { label:'Cleaned Rows',   value:cleaningResult.cleaned_rows?.toLocaleString(),  color:'text-emerald-400' },
                  { label:'Rows Removed',   value:cleaningResult.rows_removed?.toLocaleString(),  color:cleaningResult.rows_removed>0?'text-amber-400':'text-slate-500' },
                ].map(({ label, value, color }, i) => (
                  <div key={label} className="metric-card text-center animate-scale-in" style={{animationDelay:`${i*60}ms`}}>
                    <span className={`text-2xl font-black count-animate ${color}`}>{value}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider mt-1">{label}</span>
                  </div>
                ))}
              </div>

              {/* Cleaning log */}
              <div className="glass p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400"/>
                  <h3 className="section-title text-base mb-0">Cleaning Log</h3>
                  <span className="badge bg-emerald-500/15 text-emerald-400 ml-auto text-xs border border-emerald-500/25">
                    {cleaningResult.cleaning_log?.length} operations
                  </span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(cleaningResult.cleaning_log || []).map((log, i) => <LogItem key={i} text={log} i={i} />)}
                </div>
              </div>

              <DataTable data={cleaningResult.preview} title="Cleaned Data Preview" />

              <button onClick={handleDownload} className="btn-secondary w-full justify-center">
                <Download className="w-4 h-4"/> Download Cleaned CSV
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
