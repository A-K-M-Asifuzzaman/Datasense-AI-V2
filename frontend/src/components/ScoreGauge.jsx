import { useEffect, useState } from 'react'

export default function ScoreGauge({ score, label, size = 'lg' }) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    const s = Math.max(0, Math.min(100, score ?? 0))
    const start = performance.now()
    const dur = 1200
    const frame = (now) => {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setAnimated(s * ease)
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [score])

  const final = Math.max(0, Math.min(100, score ?? 0))
  const getColors = (s) => {
    if (s >= 80) return { stroke:'#10b981', glow:'rgba(16,185,129,0.4)', text:'text-emerald-400', label:'Excellent' }
    if (s >= 60) return { stroke:'#f59e0b', glow:'rgba(245,158,11,0.4)',  text:'text-amber-400',  label:'Fair' }
    return           { stroke:'#ef4444', glow:'rgba(239,68,68,0.4)',    text:'text-red-400',    label:'Poor' }
  }
  const c = getColors(final)

  const cfg = size === 'lg'
    ? { r:52, sw:8, sz:128, fontSize:'text-3xl', subSize:'text-xs' }
    : { r:36, sw:6, sz:90,  fontSize:'text-xl',  subSize:'text-xs' }

  const { r, sw, sz } = cfg
  const center = sz / 2
  const circ = 2 * Math.PI * r
  const arc = (animated / 100) * circ * 0.75

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{width:sz,height:sz}}>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full opacity-20 animate-glow-pulse"
          style={{background:`radial-gradient(circle, ${c.glow} 0%, transparent 70%)`}} />
        <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
          <circle cx={center} cy={center} r={r} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth={sw}
            strokeDasharray={`${circ*0.75} ${circ*0.25}`}
            strokeLinecap="round"
            transform={`rotate(-135 ${center} ${center})`} />
          <circle cx={center} cy={center} r={r} fill="none"
            stroke={c.stroke} strokeWidth={sw}
            strokeDasharray={`${arc} ${circ-arc}`}
            strokeLinecap="round"
            transform={`rotate(-135 ${center} ${center})`}
            style={{filter:`drop-shadow(0 0 6px ${c.stroke})`, transition:'none'}} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-black ${c.text} ${cfg.fontSize} count-animate`} key={Math.round(animated)}>
            {Math.round(animated)}
          </span>
          <span className={`${cfg.subSize} text-slate-500 mt-0.5`}>/ 100</span>
        </div>
      </div>
      {label && <p className="text-sm font-medium text-slate-300 text-center">{label}</p>}
      {size==='lg' && (
        <span className={`badge text-xs font-bold px-3 py-1 rounded-full border ${
          final>=80?'bg-emerald-500/15 text-emerald-400 border-emerald-500/30':
          final>=60?'bg-amber-500/15 text-amber-400 border-amber-500/30':
                    'bg-red-500/15 text-red-400 border-red-500/30'}`}>
          {c.label}
        </span>
      )}
    </div>
  )
}

export function MiniScore({ label, score, desc }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const s = Math.max(0,Math.min(100,score??0))
    const start = performance.now(); const dur = 900
    const frame = (now) => {
      const t = Math.min((now-start)/dur,1)
      setAnimated(s*(1-Math.pow(1-t,3)))
      if(t<1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [score])
  const pct = Math.round(animated)
  const color = score>=80?'#10b981':score>=60?'#f59e0b':'#ef4444'
  return (
    <div className="metric-card group cursor-default">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
        <span className="text-lg font-black count-animate" style={{color}} key={pct}>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{width:`${pct}%`,background:color,boxShadow:`0 0 8px ${color}60`}} />
      </div>
      {desc && <p className="text-xs text-slate-600 mt-1.5">{desc}</p>}
    </div>
  )
}
