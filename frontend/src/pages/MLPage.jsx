import { useState } from 'react'
import { Brain, Play, Zap, Target, Download, TrendingUp, Award, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { trainModel, getXAI, downloadReport } from '../services/api'
import PageHeader from '../components/PageHeader'
import PlotlyChart from '../components/PlotlyChart'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

function StatCard({ label, value, sub, color = '#6366f1', delay = 0 }) {
  return (
    <div className="glass p-5 flex flex-col gap-1 animate-scale-in" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-black count-animate" style={{ color }}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  )
}

function FeatureBar({ feature, value, max, i }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
      <span className="text-xs text-slate-400 font-mono w-32 text-right truncate flex-shrink-0">{feature}</span>
      <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-lg flex items-center px-2 transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #6366f1, #8b5cf6)`,
            boxShadow: '0 0 8px rgba(99,102,241,0.4)',
            minWidth: pct > 0 ? 8 : 0
          }}>
          {pct > 15 && <span className="text-[10px] text-white font-mono">{(value * 100).toFixed(2)}%</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-[10px] text-slate-500 font-mono w-12">{(value * 100).toFixed(2)}%</span>}
    </div>
  )
}

export default function MLPage() {
  const { session, mlResult, setMlResult, xaiResult, setXaiResult, cleaningResult } = useApp()
  const [trainLoading, setTrainLoading] = useState(false)
  const [xaiLoading, setXaiLoading] = useState(false)
  const [targetCol, setTargetCol] = useState('')
  const [modelType, setModelType] = useState('auto')
  const [testSize, setTestSize] = useState(0.2)
  const [activeTab, setActiveTab] = useState('results')

  if (!session) return <EmptyState title="No Dataset Loaded" description="Upload a CSV to use AutoML & XAI." />

  const cols = session.column_names || []

  const handleTrain = async () => {
    if (!targetCol) { toast.error('Select a target column first.'); return }
    setTrainLoading(true); setMlResult(null); setXaiResult(null)
    try {
      const res = await trainModel({
        session_id: session.session_id, target_column: targetCol,
        use_cleaned: !!cleaningResult, model_type: modelType, test_size: testSize
      })
      setMlResult(res); setActiveTab('results')
      toast.success(`Model trained! Type: ${res.model_type}`)
    } catch (e) { toast.error(e.message) }
    finally { setTrainLoading(false) }
  }

  const handleXAI = async () => {
    setXaiLoading(true)
    try {
      const res = await getXAI(session.session_id)
      setXaiResult(res); setActiveTab('xai')
      toast.success('SHAP explanations ready!')
    } catch (e) { toast.error(e.message) }
    finally { setXaiLoading(false) }
  }

  const handleDownload = async () => {
    try { await downloadReport(session.session_id); toast.success('Report downloaded!') }
    catch (e) { toast.error(e.message) }
  }

  const fiEntries = mlResult ? Object.entries(mlResult.feature_importance || {}).slice(0, 15) : []
  const maxFI = fiEntries[0]?.[1] || 1

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader icon={Brain} title="AutoML & Explainable AI"
        subtitle="Train Random Forest models and explain predictions with SHAP"
        gradient="from-violet-500 to-purple-700"
        actions={mlResult && (
          <button onClick={handleDownload} className="btn-secondary">
            <Download className="w-4 h-4"/> Report
          </button>
        )} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-1 space-y-4 animate-slide-right">
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-violet-400"/>
              <h3 className="section-title text-base mb-0">Model Config</h3>
            </div>

            {/* Target */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Column</label>
              <select value={targetCol} onChange={e => setTargetCol(e.target.value)} className="input-field">
                <option value="">Select target…</option>
                {cols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Task type */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Task Type</label>
              <div className="space-y-1.5">
                {[
                  { v:'auto',           l:'Auto-Detect',     d:'From target data' },
                  { v:'classification', l:'Classification',  d:'Categorical target' },
                  { v:'regression',     l:'Regression',      d:'Numeric target' },
                ].map(({ v, l, d }) => (
                  <label key={v}
                    className={`flex gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all duration-200 text-sm
                      ${modelType===v ? 'border-violet-500/40 text-white' : 'border-white/5 text-slate-400 hover:border-white/10'}`}
                    style={{ background: modelType===v ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)' }}>
                    <input type="radio" name="mt" value={v} checked={modelType===v}
                      onChange={() => setModelType(v)} className="mt-0.5 accent-violet-500 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-xs">{l}</div>
                      <div className="text-[10px] opacity-50">{d}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Test split */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Test Split: <span className="text-violet-400">{Math.round(testSize*100)}%</span>
              </label>
              <input type="range" min="0.1" max="0.4" step="0.05" value={testSize}
                onChange={e => setTestSize(parseFloat(e.target.value))}
                className="w-full accent-violet-500" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>10%</span><span>40%</span></div>
            </div>

            <button onClick={handleTrain} disabled={trainLoading || !targetCol}
              className="btn-primary w-full justify-center mb-2">
              {trainLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Training…</>
                : <><Play className="w-4 h-4"/>Train Model</>}
            </button>
            {mlResult && (
              <button onClick={handleXAI} disabled={xaiLoading}
                className="btn-secondary w-full justify-center animate-fade-in">
                {xaiLoading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Computing…</>
                  : <><Zap className="w-4 h-4"/>Run SHAP XAI</>}
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {(trainLoading || xaiLoading) && (
            <LoadingSpinner text={trainLoading ? 'Training Random Forest…' : 'Computing SHAP values…'} />
          )}

          {!trainLoading && !xaiLoading && !mlResult && (
            <div className="glass p-20 flex flex-col items-center justify-center text-center animate-fade-up">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-3xl animate-glow-pulse"
                  style={{background:'rgba(139,92,246,0.15)',filter:'blur(20px)'}} />
                <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center animate-float"
                  style={{background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.25)'}}>
                  <Brain className="w-10 h-10 text-violet-400" />
                </div>
              </div>
              <h3 className="section-title text-xl mb-2">Ready to Train</h3>
              <p className="text-slate-500 text-sm max-w-xs">Select a target column and click Train Model to start AutoML.</p>
            </div>
          )}

          {mlResult && !trainLoading && (
            <div className="space-y-4 animate-fade-up">
              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl w-fit" style={{background:'rgba(255,255,255,0.04)'}}>
                {[
                  { id:'results', label:'Model Results', icon:Award },
                  { id:'xai',     label:'SHAP XAI',      icon:Zap,   disabled:!xaiResult }
                ].map(({ id, label, icon:Icon, disabled }) => (
                  <button key={id} onClick={() => !disabled && setActiveTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                      ${activeTab===id ? 'text-white' : disabled ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                    style={{ background: activeTab===id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '',
                      boxShadow: activeTab===id ? '0 2px 12px rgba(99,102,241,0.3)' : '' }}>
                    <Icon className="w-3.5 h-3.5"/> {label}
                  </button>
                ))}
              </div>

              {/* Results tab */}
              {activeTab==='results' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Model banner */}
                  <div className="glass p-4 flex items-center gap-4 border border-violet-500/20"
                    style={{background:'rgba(139,92,246,0.06)'}}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{background:'rgba(139,92,246,0.2)'}}>
                      <Brain className="w-6 h-6 text-violet-400"/>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        Random Forest {mlResult.model_type==='classification'?'Classifier':'Regressor'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Target: <span className="text-violet-300 font-mono">{mlResult.target_column}</span> ·
                        {mlResult.n_train} train · {mlResult.n_test} test · {mlResult.n_features} features
                      </p>
                    </div>
                    <span className={`ml-auto badge text-xs font-bold border
                      ${mlResult.model_type==='classification'
                        ?'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        :'bg-sky-500/15 text-sky-400 border-sky-500/25'}`}>
                      {mlResult.model_type}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    {mlResult.model_type==='classification' ? <>
                      <StatCard label="Accuracy" value={`${(mlResult.metrics.accuracy*100).toFixed(1)}%`} color="#10b981" delay={0} />
                      <StatCard label="F1 Score" value={mlResult.metrics.f1_score?.toFixed(4)} color="#6366f1" delay={60} />
                      <StatCard label="Features"  value={mlResult.n_features} color="#8b5cf6" delay={120} />
                    </> : <>
                      <StatCard label="RMSE"    value={mlResult.metrics.rmse?.toFixed(4)} color="#f59e0b" delay={0} />
                      <StatCard label="MAE"     value={mlResult.metrics.mae?.toFixed(4)}  color="#ef4444" delay={60} />
                      <StatCard label="R² Score" value={mlResult.metrics.r2_score?.toFixed(4)} color="#10b981" delay={120} />
                    </>}
                  </div>

                  {/* Feature importance */}
                  {fiEntries.length > 0 && (
                    <div className="glass p-5 animate-fade-up delay-300">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-brand-400"/>
                        <h3 className="section-title text-base mb-0">Feature Importance</h3>
                      </div>
                      <div className="space-y-2">
                        {fiEntries.map(([feat, val], i) => (
                          <FeatureBar key={feat} feature={feat} value={val} max={maxFI} i={i} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Classification report */}
                  {mlResult.metrics?.classification_report && (
                    <div className="glass overflow-hidden animate-fade-up delay-375">
                      <div className="px-5 py-4 border-b border-white/5">
                        <h3 className="section-title text-base mb-0">Classification Report</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{background:'rgba(255,255,255,0.02)'}}>
                              {['Class','Precision','Recall','F1-Score','Support'].map(h=>(
                                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(mlResult.metrics.classification_report)
                              .filter(([k])=>!['accuracy','macro avg','weighted avg'].includes(k))
                              .map(([cls,m])=>(
                                <tr key={cls} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                  <td className="px-4 py-2.5 font-mono text-xs text-white font-bold">{cls}</td>
                                  <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{m.precision?.toFixed(3)}</td>
                                  <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{m.recall?.toFixed(3)}</td>
                                  <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{m['f1-score']?.toFixed(3)}</td>
                                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{m.support}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* XAI tab */}
              {activeTab==='xai' && xaiResult && (
                <div className="space-y-4 animate-fade-in">
                  {xaiResult.warning && (
                    <div className="flex gap-3 p-3.5 rounded-xl border border-amber-500/25 text-xs text-amber-300"
                      style={{background:'rgba(245,158,11,0.08)'}}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                      {xaiResult.warning}
                    </div>
                  )}
                  <div className="glass p-4 flex items-center gap-3 text-sm">
                    <Zap className="w-4 h-4 text-brand-400"/>
                    <span className="text-slate-400">Explained</span>
                    <span className="font-bold text-white">{xaiResult.n_samples_explained} predictions</span>
                    <span className="text-slate-400">with</span>
                    <span className="badge bg-brand-500/15 text-brand-300 border border-brand-500/25">SHAP TreeExplainer</span>
                  </div>

                  {(xaiResult.charts||[]).map(chart => (
                    <div key={chart.id} className="glass p-5 animate-scale-in">
                      <PlotlyChart data={chart.data} layout={chart.layout} className="h-96" />
                    </div>
                  ))}

                  {/* Individual bars */}
                  {xaiResult.individual_explanation?.length > 0 && (
                    <div className="glass p-5 animate-fade-up">
                      <h3 className="section-title text-base mb-4">
                        Feature Contributions — Instance #1
                      </h3>
                      <div className="space-y-2.5">
                        {xaiResult.individual_explanation.slice(0,12).map((item,i)=>{
                          const maxV = Math.max(...xaiResult.individual_explanation.map(x=>Math.abs(x.shap_value)))
                          const pct = maxV>0 ? (Math.abs(item.shap_value)/maxV)*100 : 0
                          const pos = item.direction==='positive'
                          return (
                            <div key={i} className="flex items-center gap-3 animate-fade-up"
                              style={{animationDelay:`${i*30}ms`}}>
                              <span className="text-xs text-slate-500 font-mono w-28 text-right truncate flex-shrink-0">{item.feature}</span>
                              <div className="flex-1 h-6 rounded-lg overflow-hidden relative"
                                style={{background:'rgba(255,255,255,0.05)'}}>
                                <div className="h-full rounded-lg transition-all duration-700 flex items-center px-2"
                                  style={{
                                    width:`${pct}%`,
                                    background: pos ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#ef4444,#dc2626)',
                                    boxShadow: pos ? '0 0 8px rgba(16,185,129,0.4)' : '0 0 8px rgba(239,68,68,0.4)',
                                    minWidth: pct>0 ? 8 : 0
                                  }}>
                                  {pct>20 && <span className="text-[10px] text-white font-mono">
                                    {item.shap_value>0?'+':''}{item.shap_value.toFixed(4)}
                                  </span>}
                                </div>
                              </div>
                              <span className={`text-xs font-bold w-6 flex-shrink-0 ${pos?'text-emerald-400':'text-red-400'}`}>
                                {pos?'▲':'▼'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
