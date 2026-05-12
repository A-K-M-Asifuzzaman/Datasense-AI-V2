import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, Zap, Shield, BarChart3, Brain, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { uploadCSV } from '../services/api'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'

const STEPS = [
  { icon: Upload,    label: 'Upload CSV',        desc: 'Drop any CSV file',            color: 'from-blue-500 to-cyan-500' },
  { icon: Shield,    label: 'Quality Analysis',  desc: 'Auto-computed quality score',  color: 'from-emerald-500 to-teal-500' },
  { icon: Sparkles,  label: 'Smart Cleaning',    desc: 'AI-powered data prep',         color: 'from-amber-500 to-orange-500' },
  { icon: BarChart3, label: 'EDA & Insights',    desc: 'Interactive Plotly charts',    color: 'from-sky-500 to-blue-500' },
  { icon: Brain,     label: 'AutoML + XAI',      desc: 'Train models & SHAP explain',  color: 'from-violet-500 to-purple-500' },
]

export default function UploadPage() {
  const { setSession, resetAll } = useApp()
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setError('Only CSV files are supported.'); return }
    if (file.size > 100 * 1024 * 1024) { setError('File size must be under 100 MB.'); return }
    setError(null); setUploading(true); setProgress(0); resetAll()
    try {
      const res = await uploadCSV(file, setProgress)
      setResult(res); setSession(res)
      toast.success(`Loaded ${res.rows.toLocaleString()} rows successfully!`)
    } catch (e) {
      setError(e.message); toast.error(e.message)
    } finally { setUploading(false) }
  }, [setSession, resetAll])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1, disabled: uploading
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader icon={Upload} title="Upload Your Dataset"
        subtitle="Import a CSV file to start your AI-powered data analysis pipeline" />

      {/* Pipeline steps */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
        {STEPS.map(({ icon: Icon, label, desc, color }, i) => (
          <div key={label} className="flex items-center">
            <div className={`flex flex-col items-center gap-2 min-w-[100px] animate-fade-up`}
              style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-slate-300">{label}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{desc}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-white/5 mx-2 min-w-[20px] mt-[-20px]" />
            )}
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div {...getRootProps()}
        className={`relative glass rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer
          border-2 border-dashed transition-all duration-300 mb-6 overflow-hidden
          ${isDragActive && !isDragReject ? 'border-brand-500 scale-[1.01]' : ''}
          ${isDragReject ? 'border-red-500' : ''}
          ${!isDragActive && !isDragReject ? 'border-white/10 hover:border-brand-500/40' : ''}
          ${uploading ? 'cursor-not-allowed' : ''}
        `}
        style={{
          background: isDragActive ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
          boxShadow: isDragActive ? '0 0 60px rgba(99,102,241,0.15) inset' : 'none'
        }}>
        <input {...getInputProps()} />

        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80
            rounded-full opacity-5 animate-spin-slow"
            style={{ background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #06b6d4, #6366f1)' }} />
        </div>

        {/* Icon */}
        <div className={`relative w-24 h-24 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300
          ${isDragActive ? 'scale-110' : 'animate-float'}`}
          style={{ background: isDragActive ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)' }}>
          {uploading
            ? <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-2 border-brand-900 rounded-full" />
                <div className="absolute inset-0 border-2 border-t-brand-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
            : <Upload className={`w-12 h-12 transition-colors duration-300 ${isDragActive ? 'text-brand-400' : 'text-slate-600'}`} />
          }
        </div>

        {uploading ? (
          <div className="text-center relative z-10 w-full max-w-xs">
            <p className="text-lg font-semibold text-white mb-3">Processing your data...</p>
            <div className="h-1.5 bg-surface-400 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(99,102,241,0.6)' }} />
            </div>
            <p className="text-sm text-brand-400 font-mono">{progress}%</p>
          </div>
        ) : (
          <div className="text-center relative z-10">
            <p className="text-xl font-semibold text-white mb-2">
              {isDragActive ? '✨ Release to upload' : 'Drop your CSV here'}
            </p>
            <p className="text-slate-500 text-sm mb-5">or click to browse files from your computer</p>
            <div className="flex items-center gap-2 justify-center flex-wrap">
              {['.CSV files only','Max 100 MB','Up to 100K rows'].map(t => (
                <span key={t} className="badge bg-surface-400 text-slate-400 text-xs border border-white/5">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 mb-6 animate-scale-in"
          style={{ background: 'rgba(239,68,68,0.08)' }}>
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Success */}
      {result && !uploading && (
        <div className="space-y-4 animate-fade-up">
          {/* Banner */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/30"
            style={{ background: 'rgba(16,185,129,0.08)' }}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-300">
                Successfully loaded <span className="text-white">{result.filename}</span>
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {result.rows.toLocaleString()} rows · {result.columns} columns ·
                {result.numeric_columns.length} numeric · {result.categorical_columns.length} categorical
              </p>
            </div>
            <button onClick={() => navigate('/quality')} className="btn-primary flex-shrink-0">
              Analyze <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:'Rows',        value:result.rows.toLocaleString(),              color:'text-brand-400' },
              { label:'Columns',     value:result.columns,                            color:'text-purple-400' },
              { label:'Numeric',     value:result.numeric_columns.length,             color:'text-emerald-400' },
              { label:'Categorical', value:result.categorical_columns.length,         color:'text-amber-400' },
            ].map(({ label, value, color }, i) => (
              <div key={label} className="metric-card text-center animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}>
                <span className={`text-2xl font-black ${color}`}>{value}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>

          {/* Column chips */}
          <div className="glass p-5 animate-fade-up delay-225">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-300">Detected Columns</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.column_names.map((col, i) => {
                const isNum = result.numeric_columns.includes(col)
                return (
                  <span key={col} className={`badge text-xs font-mono animate-scale-in border
                    ${isNum ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                             : 'bg-purple-500/15 text-purple-300 border-purple-500/30'}`}
                    style={{ animationDelay: `${i * 30}ms` }}>
                    {col}
                    <span className="ml-1.5 opacity-50 font-sans">{isNum ? 'num' : 'cat'}</span>
                  </span>
                )
              })}
            </div>
          </div>

          <DataTable data={result.preview} title="Data Preview — first 10 rows" />
        </div>
      )}
    </div>
  )
}
