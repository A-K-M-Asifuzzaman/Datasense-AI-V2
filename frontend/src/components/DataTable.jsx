export default function DataTable({ data, maxRows=10, title }) {
  if (!data?.length) return null
  const columns = Object.keys(data[0])
  const rows = data.slice(0, maxRows)
  return (
    <div className="glass overflow-hidden animate-fade-up">
      {title && (
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
          <span className="badge bg-surface-400 text-slate-400 text-xs">{data.length} rows</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{background:'rgba(255,255,255,0.02)'}}>
              {columns.map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-white/5">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-150">
                {columns.map(col => (
                  <td key={col} className="px-4 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap max-w-[160px] truncate">
                    {row[col] === null || row[col] === undefined || row[col] === ''
                      ? <span className="text-slate-700 italic">null</span>
                      : <span className={typeof row[col] === 'number' || !isNaN(Number(row[col])) ? 'text-brand-400' : 'text-slate-300'}>
                          {String(row[col])}
                        </span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > maxRows && (
        <div className="px-5 py-3 border-t border-white/5 text-xs text-slate-600">
          Showing {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  )
}
