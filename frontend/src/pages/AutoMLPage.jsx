import { useState } from 'react'
import { Cpu, Play, Trophy, Clock, Target, ChevronRight, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { runAutoML } from '../services/api'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import PlotlyChart from '../components/PlotlyChart'

const MODEL_COLORS = {
  'Random Forest':       '#6366f1',
  'Extra Trees':         '#8b5cf6',
  'Gradient Boosting':   '#a78bfa',
  'XGBoost':             '#f59e0b',
  'LightGBM':            '#10b981',
  'Logistic Regression': '#06b6d4',
  'Decision Tree':       '#f97316',
  'KNN':                 '#ec4899',
  'Ridge':               '#84cc16',
  'Lasso':               '#14b8a6',
}

function LeaderboardRow({ row, i }) {
  const [open, setOpen] = useState(false)
  const color = MODEL_COLORS[row.model] || '#6366f1'
  const isBest = row.is_best
  return (
    <div className={`rounded-xl border transition-all duration-300 overflow-hidden animate-fade-up
      ${isBest ? 'border-amber-500/40' : 'border-white/5'}`}
      style={{
        background: isBest ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
        animationDelay: `${i * 50}ms`
      }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {/* Rank */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-sm
          ${isBest ? 'bg-amber-500 text-white' : 'bg-surface-400 text-slate-400'}`}>
          {isBest ? <Trophy className="w-4 h-4" /> : `#${row.rank}`}
        </div>
        {/* Color dot */}
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        {/* Model name */}
        <span className={`text-sm font-semibold flex-1 ${isBest ? 'text-amber-300' : 'text-white'}`}>
          {row.model}
        </span>
        {/* Score */}
        <span className="font-mono text-sm font-bold" style={{ color }}>
          {(row.score * 100).toFixed(1)}%
        </span>
        {/* Status */}
        <span className={`badge text-xs ml-2 ${row.status === 'success'
          ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
          {row.status}
        </span>
        {/* Time */}
        <span className="flex items-center gap-1 text-xs text-slate-500 ml-2 w-16">
          <Clock className="w-3 h-3" />{row.train_time_sec}s
        </span>
        <div className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      </button>

      {/* Score bar */}
      <div className="px-4 pb-2">
        <div className="h-1 bg-surface-400 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.max(0, row.score * 100)}%`, background: color, boxShadow: `0 0 6px ${color}80` }} />
        </div>
      </div>

      {/* Expanded metrics */}
      {open && row.metrics && Object.keys(row.metrics).length > 0 && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="h-px bg-white/5 mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(row.metrics).filter(([k]) => k !== 'classification_report').map(([k, v]) => (
              <div key={k} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{k.replace(/_/g, ' ')}</div>
                <div className="font-mono font-bold text-sm" style={{ color }}>
                  {typeof v === 'number' ? (k.includes('accuracy') ? `${(v * 100).toFixed(2)}%` : v.toFixed(4)) : v}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {open && row.error && (
        <div className="px-4 pb-3 text-xs text-red-400 animate-fade-in">{row.error}</div>
      )}
    </div>
  )
}

export default function AutoMLPage() {
  const { session, mlResult, setMlResult, xaiResult, setXaiResult, cleaningResult } = useApp()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [targetCol, setTargetCol] = useState('')
  const [taskType, setTaskType] = useState('auto')
  const [testSize, setTestSize] = useState(0.2)

  if (!session) return <EmptyState title="No Dataset Loaded" description="Upload a CSV to use AutoML Leaderboard." />

  const cols = session.column_names || []

  const handleRun = async () => {
    if (!targetCol) { toast.error('Select a target column.'); return }
    setLoading(true); setResult(null)
    try {
      const res = await runAutoML({
        session_id: session.session_id, target_column: targetCol,
        use_cleaned: !!cleaningResult, model_type: taskType, test_size: testSize
      })
      setResult(res)
      // Also store best model for XAI
      if (res.best_model) {
        toast.success(`Best: ${res.best_model} (${res.n_models_trained} models trained)`)
      }
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  // Build comparison chart
  const leaderboard = result?.leaderboard || []
  const compChart = leaderboard.length > 0 ? {
    data: [{
      type: 'bar',
      x: leaderboard.map(r => r.model),
      y: leaderboard.map(r => Math.max(0, r.score) * 100),
      marker: { color: leaderboard.map(r => MODEL_COLORS[r.model] || '#6366f1'), opacity: 0.9 },
      name: 'Score %',
      text: leaderboard.map(r => `${(Math.max(0, r.score) * 100).toFixed(1)}%`),
      textposition: 'outside',
    }],
    layout: {
      title: 'Model Score Comparison',
      xaxis: { title: 'Model', tickangle: -25 },
      yaxis: { title: 'Score (%)', range: [0, 105] },
      template: 'plotly_dark', paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' },
    }
  } : null

  const timeChart = leaderboard.length > 0 ? {
    data: [{
      type: 'scatter',
      x: leaderboard.map(r => r.train_time_sec),
      y: leaderboard.map(r => Math.max(0, r.score) * 100),
      mode: 'markers+text',
      text: leaderboard.map(r => r.model),
      textposition: 'top center',
      marker: { color: leaderboard.map(r => MODEL_COLORS[r.model] || '#6366f1'), size: 14, opacity: 0.9 },
      name: 'Speed vs Accuracy',
    }],
    layout: {
      title: 'Speed vs Score Tradeoff',
      xaxis: { title: 'Training Time (s)' },
      yaxis: { title: 'Score (%)' },
      template: 'plotly_dark', paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' },
    }
  } : null

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader icon={Cpu} title="AutoML Leaderboard"
        subtitle="Train 8+ models simultaneously and compare them with a ranked leaderboard"
        gradient="from-amber-500 to-orange-600"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Config */}
        <div className="lg:col-span-1 space-y-4 animate-slide-right">
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-amber-400" />
              <h3 className="section-title text-base mb-0">Configuration</h3>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Column</label>
              <select value={targetCol} onChange={e => setTargetCol(e.target.value)} className="input-field">
                <option value="">Select target...</option>
                {cols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Task Type</label>
              <div className="space-y-1.5">
                {[{ v:'auto',l:'Auto-Detect' },{ v:'classification',l:'Classification' },{ v:'regression',l:'Regression' }].map(({ v, l }) => (
                  <label key={v}
                    className={`flex gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all duration-200 text-sm
                      ${taskType === v ? 'border-amber-500/40 text-white' : 'border-white/5 text-slate-400 hover:border-white/10'}`}
                    style={{ background: taskType === v ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)' }}>
                    <input type="radio" name="tt" value={v} checked={taskType === v}
                      onChange={() => setTaskType(v)} className="mt-0.5 accent-amber-500" />
                    <span className="text-xs font-semibold">{l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Test Split: <span className="text-amber-400">{Math.round(testSize * 100)}%</span>
              </label>
              <input type="range" min="0.1" max="0.4" step="0.05" value={testSize}
                onChange={e => setTestSize(parseFloat(e.target.value))} className="w-full accent-amber-500" />
            </div>

            {/* Model list */}
            <div className="mb-5 glass p-3 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Models to train</p>
              <div className="space-y-1.5">
                {Object.entries(MODEL_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs text-slate-400">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleRun} disabled={loading || !targetCol} className="btn-primary w-full justify-center"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 2px 20px rgba(245,158,11,0.3)' }}>
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Training all models...</>
                : <><Play className="w-4 h-4" />Run AutoML</>}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {loading && <LoadingSpinner text="Training all models in parallel..." size="lg" />}

          {!loading && !result && (
            <div className="glass p-20 flex flex-col items-center justify-center text-center animate-fade-up">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-3xl animate-glow-pulse"
                  style={{ background: 'rgba(245,158,11,0.12)', filter: 'blur(20px)' }} />
                <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center animate-float"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <Trophy className="w-10 h-10 text-amber-400" />
                </div>
              </div>
              <h3 className="section-title text-xl mb-2">Ready to Race</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                Up to 10 models will train simultaneously. The best one wins the crown.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4 animate-fade-up">
              {/* Stats banner */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label:'Models Trained', value:result.n_models_trained, color:'#f59e0b' },
                  { label:'Models Failed',  value:result.n_models_failed,  color:result.n_models_failed>0?'#ef4444':'#10b981' },
                  { label:'Best Model',     value:result.best_model,       color:'#10b981' },
                  { label:'Task Type',      value:result.task,             color:'#6366f1' },
                ].map(({ label, value, color }, i) => (
                  <div key={label} className="metric-card animate-scale-in" style={{ animationDelay:`${i*60}ms` }}>
                    <p className="text-xs text-slate-600 uppercase tracking-wider font-bold">{label}</p>
                    <p className="font-black mt-1 truncate text-sm" style={{ color }}>{value ?? '—'}</p>
                  </div>
                ))}
              </div>

              {/* Leaderboard */}
              <div className="glass p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="section-title text-base mb-0">Model Leaderboard</h3>
                  <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/25 ml-auto text-xs">
                    {leaderboard.length} models
                  </span>
                </div>
                <div className="space-y-2">
                  {leaderboard.map((row, i) => <LeaderboardRow key={row.model} row={row} i={i} />)}
                </div>
              </div>

              {/* Charts */}
              {compChart && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass p-5 animate-fade-up">
                    <PlotlyChart data={compChart.data} layout={compChart.layout} className="h-72" />
                  </div>
                  {timeChart && (
                    <div className="glass p-5 animate-fade-up delay-75">
                      <PlotlyChart data={timeChart.data} layout={timeChart.layout} className="h-72" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-xl border border-brand-500/20 animate-fade-up"
                style={{ background: 'rgba(99,102,241,0.06)' }}>
                <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  The best model has been saved for XAI analysis. Go to <strong className="text-white">AutoML & XAI</strong> page to run SHAP explanations on it.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
