import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, RefreshCw, ArrowRight, Lightbulb, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../App'
import { getEDA, getInsights } from '../services/api'
import PageHeader from '../components/PageHeader'
import PlotlyChart from '../components/PlotlyChart'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

const SEV = {
  high:   { bg:'rgba(239,68,68,0.08)',   border:'rgba(239,68,68,0.25)',   badge:'bg-red-500/20 text-red-400',   dot:'bg-red-400' },
  medium: { bg:'rgba(245,158,11,0.08)',  border:'rgba(245,158,11,0.25)',  badge:'bg-amber-500/20 text-amber-400',dot:'bg-amber-400' },
  low:    { bg:'rgba(59,130,246,0.08)',  border:'rgba(59,130,246,0.25)',  badge:'bg-blue-500/20 text-blue-400',  dot:'bg-blue-400' },
  info:   { bg:'rgba(99,102,241,0.08)',  border:'rgba(99,102,241,0.25)',  badge:'bg-brand-500/20 text-brand-400',dot:'bg-brand-400' },
}

function InsightCard({ insight, i }) {
  const [open, setOpen] = useState(false)
  const s = SEV[insight.severity] || SEV.info
  return (
    <button onClick={() => setOpen(o=>!o)}
      className="w-full text-left rounded-xl border transition-all duration-300 overflow-hidden animate-fade-up"
      style={{ background:s.bg, borderColor:s.border, animationDelay:`${i*50}ms` }}>
      <div className="flex items-center gap-3 p-3.5">
        <span className="text-xl flex-shrink-0">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">{insight.title}</p>
          {insight.column && <p className="text-xs text-slate-500 mt-0.5 font-mono">{insight.column}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge text-xs ${s.badge}`}>{insight.severity}</span>
          <div className={`transition-transform duration-200 ${open?'rotate-180':''}`}>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="h-px bg-white/5 mb-3" />
          <p className="text-xs text-slate-300 leading-relaxed">{insight.description}</p>
        </div>
      )}
    </button>
  )
}

const CHART_TYPE_ICONS = {
  histogram:'📊', box:'📦', heatmap:'🔥', scatter:'✦', bar:'📈', pie:'🥧'
}

export default function EDAPage() {
  const { session, edaData, setEdaData, insightsData, setInsightsData, cleaningResult } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [activeChart, setActiveChart] = useState(null)
  const [view, setView] = useState('single') // single | grid

  useEffect(() => { if (session && !edaData) fetchEDA() }, [session])

  const fetchEDA = async () => {
    if (!session) return
    setLoading(true)
    try {
      const [eda, ins] = await Promise.all([
        getEDA(session.session_id, !!cleaningResult),
        getInsights(session.session_id, !!cleaningResult)
      ])
      setEdaData(eda); setInsightsData(ins)
      if (eda.charts?.length) setActiveChart(eda.charts[0].id)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  if (!session) return <EmptyState title="No Dataset Loaded" description="Upload a CSV to explore your data." />
  if (loading)  return <LoadingSpinner text="Generating interactive charts…" size="lg" />

  const charts = edaData?.charts || []
  const insights = insightsData?.insights || []
  const currentChart = charts.find(c=>c.id===activeChart) || charts[0]

  if (!charts.length) return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader icon={TrendingUp} title="EDA & Insights" subtitle="No charts generated" gradient="from-sky-500 to-blue-600" />
      <div className="glass p-16 text-center animate-fade-up">
        <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500">Dataset may lack numeric columns. <button onClick={fetchEDA} className="text-brand-400 underline">Retry</button></p>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader icon={TrendingUp} title="EDA & Visual Insights"
        subtitle={`Exploring ${edaData?.data_source||'dataset'} — ${charts.length} interactive Plotly charts`}
        gradient="from-sky-500 to-blue-600"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setView(v=>v==='single'?'grid':'single')} className="btn-ghost">
              <Layers className="w-4 h-4"/> {view==='single'?'Grid View':'Focus View'}
            </button>
            <button onClick={fetchEDA} className="btn-ghost"><RefreshCw className="w-4 h-4"/></button>
            <button onClick={() => navigate('/ml')} className="btn-primary">AutoML <ArrowRight className="w-4 h-4"/></button>
          </div>
        }
      />

      {view === 'single' ? (
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-52 flex-shrink-0 animate-slide-right">
            <div className="glass p-2 space-y-1 sticky top-6">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider px-2 py-1.5">
                {charts.length} Charts
              </p>
              {charts.map((chart, i) => (
                <button key={chart.id} onClick={() => setActiveChart(chart.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium leading-tight
                    transition-all duration-200 flex items-center gap-2
                    ${activeChart===chart.id
                      ?'text-white border border-brand-500/30'
                      :'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  style={{ background: activeChart===chart.id ? 'rgba(99,102,241,0.15)' : '' }}>
                  <span>{CHART_TYPE_ICONS[chart.type]||'📊'}</span>
                  <span className="truncate">{chart.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0 space-y-5">
            {currentChart && (
              <div className="glass p-6 animate-scale-in" key={currentChart.id}>
                <h3 className="section-title text-lg mb-5">{currentChart.title}</h3>
                <PlotlyChart data={currentChart.data}
                  layout={{...currentChart.layout, autosize:true}} className="h-96" />
              </div>
            )}

            {insights.length > 0 && (
              <div className="glass p-5 animate-fade-up">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  <h3 className="section-title text-base mb-0">Automated Insights</h3>
                  <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/25 ml-auto text-xs">
                    {insights.length} findings
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {insights.map((ins, i) => <InsightCard key={i} insight={ins} i={i} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Grid view */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {charts.map((chart, i) => (
              <div key={chart.id}
                onClick={() => { setActiveChart(chart.id); setView('single') }}
                className="glass p-5 cursor-pointer glass-hover animate-fade-up"
                style={{ animationDelay:`${i*60}ms` }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">{CHART_TYPE_ICONS[chart.type]||'📊'}</span>
                  <h4 className="text-sm font-semibold text-slate-200 truncate">{chart.title}</h4>
                </div>
                <PlotlyChart data={chart.data}
                  layout={{...chart.layout, height:200, margin:{t:10,r:10,b:35,l:40}, title:null, showlegend:false}}
                  className="h-48 pointer-events-none" />
              </div>
            ))}
          </div>

          {insights.length > 0 && (
            <div className="glass p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-400"/>
                <h3 className="section-title text-base mb-0">All Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {insights.map((ins,i) => <InsightCard key={i} insight={ins} i={i} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
