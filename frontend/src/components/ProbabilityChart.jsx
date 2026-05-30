import { memo, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Activity } from 'lucide-react'

const ProbabilityChart = memo(({ creatures, statistics, totalCatches, selectedCreature }) => {
  const { distributionData, currentPosition } = useMemo(() => {
    if (!totalCatches || totalCatches === 0) return { distributionData: [], currentPosition: null }
    
    const targetId = selectedCreature || Object.keys(creatures)[0]
    const creature = creatures[targetId]
    
    if (!creature) return { distributionData: [], currentPosition: null }
    
    const p = creature.drop_rate
    const n = totalCatches
    const k = creature.catches
    
    const mean = n * p
    const stdDev = Math.sqrt(n * p * (1 - p))
    
    const points = []
    const startX = Math.max(0, Math.floor(mean - 4 * stdDev))
    const endX = Math.ceil(mean + 4 * stdDev)
    
    for (let x = startX; x <= endX; x++) {
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
                Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2))
      points.push({
        x: x,
        y: y,
        isActual: x === Math.round(k)
      })
    }
    
    return {
      distributionData: points,
      currentPosition: {
        x: k,
        creature: creature
      }
    }
  }, [creatures, totalCatches, selectedCreature])
  
  if (!distributionData.length) {
    return (
      <div className="card text-center py-12">
        <Activity className="w-12 h-12 text-dark-600 mx-auto mb-4" />
        <p className="text-dark-400">No data available yet</p>
        <p className="text-sm text-dark-500 mt-2">Start fishing to see probability distributions</p>
      </div>
    )
  }
  
  const actualPoint = distributionData.find(p => p.isActual)
  
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-dark-100 mb-6">Probability Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="x" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#3b82f6" 
            dot={false}
            strokeWidth={2}
          />
          {actualPoint && (
            <ReferenceLine 
              x={actualPoint.x} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: 'You', fill: '#ef4444', fontSize: 12 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})

ProbabilityChart.displayName = 'ProbabilityChart'

export default ProbabilityChart