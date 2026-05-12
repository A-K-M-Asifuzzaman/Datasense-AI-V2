import { useState, useEffect } from 'react'
import { Wand2, RefreshCw, Code2, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { getFeatures } from '../services/api'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'

const PRIORITY_CFG = {
  high:   { badge:'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot:'bg-emerald-400', label:'High' },
  medium: { badge:'bg-amber-500/15 text-amber-400 border-amber-500/25',       dot:'bg-amber-400',   label:'Medium' },
  low:    { badge:'bg-slate-500/15 text-slate-400 border-slate-500/25',        dot:'bg-slate-500',   label:'Low' },
}

const TYPE_ICONS = {
  log_transform:  '📈',
  sqrt_transform: '√',
  binning:        '📦',
  normalize:      '⚖️',
  interaction:    '✕',
  ratio:          '÷',
  binary_encode:  '0/1',
  onehot:         '🔢',
  target_encode:  '🎯',
  hash_encode:    '#',
  datetime_extract: '📅',
}

function SuggestionCard({ s, i }) {
  const [copied, setCopied] = useState(false)
  const cfg = PRIORITY_CFG[s.priority] || PRIORITY_CFG.low

  const copy = () => {
    navigator.clipboard.writeText(s.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Code copied!')
  }

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/5 hover:border-white/10
      transition-all duration-300 animate-fade-up"
      style={{ animationDelay:`${i * 45}ms` }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)' }}>
            {TYPE_ICONS[s.type] || '⚙️'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="text-sm font-bold text-white">{s.title}</h4>
              <span className={`badge text-[10px] border ${cfg.badge}`}>{cfg.label} Priority</span>
              {s.column && (
                <span className="badge bg-surface-400 text-slate-400 text-[10px] font-mono">{s.column}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
          </div>
        </div>

        {/* Code block */}
        {s.code && (
          <div className="mt-3 relative group">
            <div className="rounded-xl overflow-hidden" style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[10px] text-slate-600 font-mono">Python</span>
                <button onClick={copy}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-brand-400 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                {s.code}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const TYPE_LABELS = {
  log_transform:'Log Transform', sqrt_transform:'Sqrt Transform', binning:'Binning',
  normalize:'Normalize', interaction:'Interaction', ratio:'Ratio',
  binary_encode:'Binary Encode', onehot:'One-Hot', target_encode:'Target Encode',
  hash_encode:'Hash Encode', datetime_extract:'Datetime',
}

export default function FeaturesPage() {
  const { session, cleaningResult } = useApp()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { if (session && !result) fetchFeatures() }, [session])

  const fetchFeatures = async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await getFeatures(session.session_id, !!cleaningResult)
      setResult(res)
      toast.success(`${res.total_suggestions} feature engineering suggestions ready`)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  if (!session) return <EmptyState title="No Dataset Loaded" description="Upload a CSV to get feature engineering suggestions." />
  if (loading) return <LoadingSpinner text="Analyzing features..." size="lg" />

  const suggestions = result?.suggestions || []
  const filtered = suggestions.filter(s => {
    const matchPriority = filter === 'all' || s.priority === filter
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.column || '').toLowerCase().includes(search.toLowerCase())
    return matchPriority && matchSearch
  })

  const typeGroups = {}
  filtered.forEach(s => {
    const label = TYPE_LABELS[s.type] || s.type
    if (!typeGroups[label]) typeGroups[label] = []
    typeGroups[label].push(s)
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader icon={Wand2} title="Feature Engineering"
        subtitle="AI-generated transformation suggestions with ready-to-paste Python code"
        gradient="from-pink-500 to-rose-600"
        actions={<button onClick={fetchFeatures} className="btn-ghost"><RefreshCw className="w-4 h-4" />Refresh</button>}
      />

      {result && (
        <div className="space-y-6 animate-fade-up">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total Suggestions', value:result.total_suggestions, color:'text-white' },
              { label:'High Priority',     value:result.high_priority,     color:'text-emerald-400' },
              { label:'Auto Features',     value:result.auto_features?.length || 0, color:'text-brand-400' },
            ].map(({ label, value, color }, i) => (
              <div key={label} className="metric-card text-center animate-scale-in" style={{ animationDelay:`${i*60}ms` }}>
                <p className="text-xs text-slate-600 uppercase tracking-wider font-bold">{label}</p>
                <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Auto features preview */}
          {result.auto_features?.length > 0 && (
            <div className="glass p-4 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <Code2 className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Recommended Auto-Features</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.auto_features.map(f => (
                  <span key={f.name} className="badge bg-brand-500/15 text-brand-300 border border-brand-500/25 font-mono text-xs">
                    {f.name}
                    <span className="ml-1.5 opacity-50 font-sans">{f.description}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.04)' }}>
              {['all','high','medium','low'].map(p => (
                <button key={p} onClick={() => setFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
                    ${filter === p ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {p === 'all' ? `All (${suggestions.length})` : `${p} (${suggestions.filter(s=>s.priority===p).length})`}
                </button>
              ))}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search suggestions..." className="input-field w-52 py-2 text-xs ml-auto" />
          </div>

          {/* Grouped suggestions */}
          {Object.keys(typeGroups).length === 0 ? (
            <div className="glass p-12 text-center animate-fade-up">
              <p className="text-slate-500">No suggestions match your filter.</p>
            </div>
          ) : (
            Object.entries(typeGroups).map(([groupName, items]) => (
              <div key={groupName} className="animate-fade-up">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{groupName}</h3>
                  <span className="badge bg-surface-400 text-slate-500 text-xs">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((s, i) => <SuggestionCard key={i} s={s} i={i} />)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
