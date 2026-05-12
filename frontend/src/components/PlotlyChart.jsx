import { useEffect, useRef, useState } from 'react'

export default function PlotlyChart({ data, layout, config, className='' }) {
  const ref = useRef(null)
  const mounted = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min')
        if (!ref.current || cancelled) return
        const lyt = {
          margin:{t:50,r:20,b:60,l:60},
          autosize:true,
          ...layout,
        }
        const cfg = { responsive:true, displayModeBar:true, displaylogo:false,
          modeBarButtonsToRemove:['select2d','lasso2d'], ...config }
        if (mounted.current) {
          await Plotly.react(ref.current, data, lyt, cfg)
        } else {
          await Plotly.newPlot(ref.current, data, lyt, cfg)
          mounted.current = true
        }
        if (!cancelled) setReady(true)
      } catch(e) { console.error('Plotly:', e) }
    }
    render()
    return () => { cancelled = true }
  }, [data, layout, config])

  useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(async () => {
      try {
        const Plotly = await import('plotly.js-dist-min')
        if (ref.current) Plotly.Plots.resize(ref.current)
      } catch(e){}
    })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div className={`relative ${className}`} style={{minHeight:320}}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1">
            {[0,1,2,3].map(i=>(
              <div key={i} className="w-1.5 h-6 bg-brand-600/40 rounded-full animate-bounce"
                style={{animationDelay:`${i*100}ms`}} />
            ))}
          </div>
        </div>
      )}
      <div ref={ref} className={`w-full h-full transition-opacity duration-500 ${ready?'opacity-100':'opacity-0'}`} />
    </div>
  )
}
