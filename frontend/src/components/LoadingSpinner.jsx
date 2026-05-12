export default function LoadingSpinner({ text = 'Loading...', size = 'md' }) {
  const sz = { sm:'w-6 h-6', md:'w-10 h-10', lg:'w-16 h-16' }[size]
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
      <div className="relative">
        <div className={`${sz} rounded-full border-2 border-brand-900`} />
        <div className={`${sz} rounded-full border-2 border-t-brand-400 border-r-transparent border-b-transparent border-l-transparent animate-spin absolute inset-0`}
          style={{filter:'drop-shadow(0 0 8px rgba(99,102,241,0.6))'}} />
        <div className={`${sz} rounded-full border border-t-purple-400/30 border-r-transparent border-b-transparent border-l-transparent animate-spin absolute inset-0`}
          style={{animationDuration:'1.5s',animationDirection:'reverse'}} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-300 animate-pulse">{text}</p>
        <div className="flex gap-1 justify-center mt-2">
          {[0,1,2].map(i=>(
            <div key={i} className="w-1 h-1 bg-brand-500 rounded-full animate-bounce"
              style={{animationDelay:`${i*150}ms`}} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonBlock({ className='' }) {
  return (
    <div className={`glass rounded-xl overflow-hidden ${className}`}>
      <div className="h-full shimmer-bg" />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="glass p-5 animate-fade-in">
      <div className="flex gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl shimmer-bg" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 shimmer-bg rounded w-1/3" />
          <div className="h-2 shimmer-bg rounded w-2/3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-8 shimmer-bg rounded" />
        <div className="h-3 shimmer-bg rounded w-3/4" />
      </div>
    </div>
  )
}
