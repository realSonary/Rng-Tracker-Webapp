import { memo } from 'react'

const SessionGrid = memo(({ creatures, statistics, totalCatches, onSelectCreature }) => {
  const getBadgeClass = (luckStatus) => {
    if (luckStatus === 'lucky') return 'badge-lucky'
    if (luckStatus === 'slightly_lucky') return 'badge-slightly-lucky'
    if (luckStatus === 'unlucky') return 'badge-unlucky'
    if (luckStatus === 'slightly_unlucky') return 'badge-slightly-unlucky'
    return 'badge-average'
  }
  
  const getLuckLabel = (luckStatus) => {
    if (luckStatus === 'lucky') return 'Very Lucky'
    if (luckStatus === 'slightly_lucky') return 'Slightly Lucky'
    if (luckStatus === 'unlucky') return 'Very Unlucky'
    if (luckStatus === 'slightly_unlucky') return 'Slightly Unlucky'
    return 'Average'
  }
  
  if (!creatures || Object.keys(creatures).length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-dark-400">Waiting for catch data...</p>
        <p className="text-sm text-dark-500 mt-2">Start fishing in Hypixel Skyblock to see your statistics</p>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Object.values(creatures).map(creature => {
        const stats = statistics[creature.id] || {}
        
        return (
          <div
            key={creature.id}
            onClick={() => onSelectCreature(creature.id)}
            className="card hover:border-dark-600 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-dark-100 group-hover:text-white transition-colors">
                {creature.name}
              </h3>
              <span className={`badge ${getBadgeClass(stats.luckStatus)}`}>
                {getLuckLabel(stats.luckStatus)}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-dark-400">Actual Catches:</span>
                <span className="text-xl font-bold text-white">{creature.catches}</span>
              </div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-dark-400">Expected:</span>
                <span className="text-lg font-semibold text-dark-300">
                  {stats.expectedValue?.toFixed(1) || '0'}
                </span>
              </div>
              
              <div className="flex justify-between items-baseline pt-2 border-t border-dark-700">
                <span className="text-xs text-dark-400">Z-Score:</span>
                <span className={`text-sm font-mono font-bold ${
                  (stats.zScore || 0) > 0 ? 'text-green-400' : 
                  (stats.zScore || 0) < 0 ? 'text-red-400' : 'text-dark-400'
                }`}>
                  {stats.zScore?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
})

SessionGrid.displayName = 'SessionGrid'

export default SessionGrid