import { memo } from 'react'

const SessionGrid = memo(({ creatures, statistics, totalCatches, onSelectCreature }) => {
  const getBadgeClass = (luckStatus) => {
    switch (luckStatus) {
      case 'lucky': return 'badge-lucky'
      case 'slightly_lucky': return 'badge-slightly-lucky'
      case 'unlucky': return 'badge-unlucky'
      case 'slightly_unlucky': return 'badge-slightly-unlucky'
      default: return 'badge-average'
    }
  }
  
  const getLuckLabel = (luckStatus) => {
    switch (luckStatus) {
      case 'lucky': return 'Very Lucky 🍀'
      case 'slightly_lucky': return 'Slightly Lucky'
      case 'unlucky': return 'Very Unlucky 💀'
      case 'slightly_unlucky': return 'Slightly Unlucky'
      default: return 'Average'
    }
  }
  
  if (!creatures || Object.keys(creatures).length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-dark-400">No creatures configured for this category</p>
        <p className="text-sm text-dark-500 mt-2">Add creatures to the config.json file</p>
      </div>
    )
  }
  
  const creatureList = Object.values(creatures)
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {creatureList.map(creature => {
        const stats = statistics[creature.id] || {}
        const actualCatches = creature.catches || 0
        const expectedCatches = stats.expectedValue || 0
        const dropRatePercent = (creature.drop_rate * 100).toFixed(2)
        
        // Calculate progress percentage
        const progressPercent = totalCatches > 0 
          ? Math.min((actualCatches / Math.max(expectedCatches, 1)) * 100, 100)
          : 0
        
        return (
          <div
            key={creature.id}
            onClick={() => onSelectCreature(creature.id)}
            className="card hover:border-dark-600 hover:bg-dark-700/50 transition-all cursor-pointer group transform hover:scale-105"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-dark-100 group-hover:text-white transition-colors">
                {creature.name}
              </h3>
              <span className={`badge ${getBadgeClass(stats.luckStatus)}`}>
                {getLuckLabel(stats.luckStatus)}
              </span>
            </div>
            
            {/* Drop Rate */}
            <div className="text-xs text-dark-500 mb-3">
              Drop Rate: {dropRatePercent}%
            </div>
            
            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-dark-400">Actual:</span>
                <span className="text-xl font-bold text-white">{actualCatches}</span>
              </div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-dark-400">Expected:</span>
                <span className="text-lg font-semibold text-dark-300">
                  {expectedCatches.toFixed(1)}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-dark-700">
                  <div
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                      actualCatches >= expectedCatches ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-dark-500">
                    {progressPercent.toFixed(0)}% of expected
                  </span>
                </div>
              </div>
              
              {/* Z-Score */}
              <div className="flex justify-between items-baseline pt-2 border-t border-dark-700">
                <span className="text-xs text-dark-400">Z-Score:</span>
                <span className={`text-sm font-mono font-bold ${
                  (stats.zScore || 0) > 0.5 ? 'text-green-400' : 
                  (stats.zScore || 0) < -0.5 ? 'text-red-400' : 
                  'text-dark-400'
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