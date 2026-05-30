import { memo, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const DeviationChart = memo(({ creatures, statistics }) => {
  const chartData = useMemo(() => {
    if (!creatures) return []
    
    return Object.values(creatures)
      .map(creature => {
        const stats = statistics[creature.id]
        return {
          name: creature.name,
          'Actual': creature.catches,
          'Expected': Math.round(stats?.expectedValue || 0),
        }
      })
      .sort((a, b) => b['Actual'] - a['Actual'])
  }, [creatures, statistics])
  
  if (chartData.length === 0) return null
  
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-dark-100 mb-6">Expected vs Actual Catches</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
          />
          <Legend />
          <Bar dataKey="Expected" fill="#64748b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

DeviationChart.displayName = 'DeviationChart'

export default DeviationChart