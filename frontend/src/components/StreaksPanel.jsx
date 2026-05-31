import { memo, useMemo } from 'react'
import { AlertTriangle, Zap, TrendingUp, TrendingDown } from 'lucide-react'

const StreaksPanel = memo(({ creatures, statistics, totalCatches }) => {
  const anomalies = useMemo(() => {
    if (!creatures || totalCatches === 0) return []
    
    const results = []
    
    Object.values(creatures).forEach(creature => {
      const stats = statistics[creature.id]
      if (!stats) return
      
      const expectedCatches = stats.expectedValue || 0
      const actualCatches = creature.catches || 0
      const zScore = stats.zScore || 0
      
      // Extreme dry streak (no catches when expected > 2)
      if (expectedCatches > 2 && actualCatches === 0) {
        results.push({
          type: 'extreme_dry',
          creature: creature.name,
          message: 'You have gone ' + totalCatches + ' catches without a single ' + creature.name + 
                   '. Expected: ' + expectedCatches.toFixed(1) + '. This is extremely unlucky!',
          severity: 'high'
        })
      }
      
      // Very unlucky (z-score < -2)
      if (zScore < -2) {
        results.push({
          type: 'very_unlucky',
          creature: creature.name,
          message: creature.name + ': Z-Score of ' + zScore.toFixed(2) + 
                   ' indicates you are in the bottom 2.3% of luck distribution.',
          severity: 'high'
        })
      }
      
      // Slightly unlucky (z-score between -2 and -1)
      if (zScore < -1 && zScore >= -2) {
        results.push({
          type: 'unlucky',
          creature: creature.name,
          message: creature.name + ': You are somewhat unlucky with a Z-Score of ' + zScore.toFixed(2) + '.',
          severity: 'medium'
        })
      }
      
      // Very lucky (z-score > 2)
      if (zScore > 2) {
        results.push({
          type: 'very_lucky',
          creature: creature.name,
          message: creature.name + ': Z-Score of ' + zScore.toFixed(2) + 
                   ' indicates you are in the top 2.3% of luck distribution! 🎉',
          severity: 'low'
        })
      }
      
      // Lucky (z-score between 1 and 2)
      if (zScore > 1 && zScore <= 2) {
        results.push({
          type: 'lucky',
          creature: creature.name,
          message: creature.name + ': You are getting lucky with a Z-Score of ' + zScore.toFixed(2) + '!',
          severity: 'low'
        })
      }
    })
    
    // Sort by severity (high first)
    return results.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
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
      <h2 className="text-lg font-semibold text-dark-100">
        Statistical Anomalies ({anomalies.length})
      </h2>
      
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          className={`card border-l-4 transition-all hover:scale-[1.02] ${
            anomaly.severity === 'high' 
              ? 'border-l-red-500 bg-red-500/5' 
              : anomaly.severity === 'medium'
              ? 'border-l-yellow-500 bg-yellow-500/5'
              : 'border-l-green-500 bg-green-500/5'
          }`}
        >
          <div className="flex items-start space-x-3">
            {anomaly.severity === 'high' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            ) : anomaly.severity === 'medium' ? (
              <TrendingDown className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            ) : (
              <TrendingUp className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <h3 className="font-semibold text-dark-100 mb-1">{anomaly.creature}</h3>
              <p className="text-sm text-dark-300">{anomaly.message}</p>
              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                anomaly.severity === 'high' 
                  ? 'bg-red-500/20 text-red-400' 
                  : anomaly.severity === 'medium'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
              }`}>
                {anomaly.severity === 'high' ? '⚠️ Critical' : 
                 anomaly.severity === 'medium' ? '⚡ Notable' : '✨ Lucky'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

StreaksPanel.displayName = 'StreaksPanel'

export default StreaksPanel