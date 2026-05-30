import { memo, useMemo } from 'react'
import { AlertTriangle, Zap } from 'lucide-react'

const StreaksPanel = memo(({ creatures, statistics, totalCatches }) => {
  const anomalies = useMemo(() => {
    if (!creatures || totalCatches === 0) return []
    
    const results = []
    Object.values(creatures).forEach(creature => {
      const stats = statistics[creature.id]
      if (!stats) return
      
      const expectedCatches = stats.expectedValue
      const actualCatches = creature.catches
      
      if (expectedCatches > 0 && actualCatches === 0 && expectedCatches > 2) {
        results.push({
          type: 'extreme_dry',
          creature: creature.name,
          message: 'You have gone ' + totalCatches + ' catches without a single ' + creature.name + '. Expected: ' + expectedCatches.toFixed(1) + '. This is extremely unlucky!',
          severity: 'high'
        })
      }
      
      if (stats.zScore < -2) {
        results.push({
          type: 'very_unlucky',
          creature: creature.name,
          message: creature.name + ': Z-Score of ' + stats.zScore.toFixed(2) + ' indicates you are in the bottom 2.3% of luck distribution.',
          severity: 'high'
        })
      }
      
      if (stats.zScore > 2) {
        results.push({
          type: 'very_lucky',
          creature: creature.name,
          message: creature.name + ': Z-Score of ' + stats.zScore.toFixed(2) + ' indicates you are in the top 2.3% of luck distribution!',
          severity: 'low'
        })
      }
    })
    
    return results.sort((a, b) => a.severity === 'high' ? -1 : 1)
  }, [creatures, statistics, totalCatches])
  
  if (anomalies.length === 0) {
    return (
      <div className="card text-center py-12">
        <Zap className="w-12 h-12 text-dark-600 mx-auto mb-4" />
        <p className="text-dark-400">No significant anomalies detected</p>
        <p className="text-sm text-dark-500 mt-2">Keep fishing to discover statistical anomalies!</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-dark-100">Statistical Anomalies</h2>
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          className={'card border-l-4 ' + (anomaly.severity === 'high' ? 'border-l-red-500 bg-red-500/5' : 'border-l-green-500 bg-green-500/5')}
        >
          <div className="flex items-start space-x-3">
            {anomaly.severity === 'high' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Zap className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <h3 className="font-semibold text-dark-100 mb-1">{anomaly.creature}</h3>
              <p className="text-sm text-dark-300">{anomaly.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

StreaksPanel.displayName = 'StreaksPanel'

export default StreaksPanel