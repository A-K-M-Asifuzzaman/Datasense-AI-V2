import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'

export default function EmptyState({ icon:Icon=Upload, title='No Data Loaded', description='Upload a CSV file to get started.', action }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-28 px-8 text-center animate-fade-up">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl animate-glow-pulse"
          style={{background:'rgba(99,102,241,0.1)',filter:'blur(20px)'}} />
        <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center border border-white/10"
          style={{background:'rgba(255,255,255,0.03)'}}>
          <Icon className="w-12 h-12 text-slate-600" />
        </div>
      </div>
      <h3 className="section-title mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-6 leading-relaxed">{description}</p>
      {action ?? (
        <button onClick={() => navigate('/upload')} className="btn-primary">
          <Upload className="w-4 h-4" /> Upload CSV
        </button>
      )}
    </div>
  )
}
