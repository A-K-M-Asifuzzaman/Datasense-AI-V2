export default function PageHeader({ icon: Icon, title, subtitle, actions, gradient = 'from-brand-500 to-purple-600' }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div className="flex items-center gap-4 animate-fade-up">
        {Icon && (
          <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl`}
            style={{boxShadow:`0 8px 32px rgba(99,102,241,0.3)`}}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        )}
        <div>
          <h1 className="page-title leading-tight">{title}</h1>
          {subtitle && <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 animate-fade-up delay-150">
          {actions}
        </div>
      )}
    </div>
  )
}
