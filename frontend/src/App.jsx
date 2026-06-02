import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import {
  Fish, BarChart3, TrendingUp, AlertTriangle,
  Snowflake, Flame, Anchor, Zap, Plus, X
} from 'lucide-react'
import SessionGrid from './components/SessionGrid'
import DeviationChart from './components/DeviationChart'
import ProbabilityChart from './components/ProbabilityChart'
import StreaksPanel from './components/StreaksPanel'

const iconMap = {
  fish: Fish,
  snowflake: Snowflake,
  flame: Flame,
  anchor: Anchor,
  zap: Zap
}

function App() {
  const [sessionData, setSessionData] = useState({})
  const [categories, setCategories] = useState({})
  const [activeCategory, setActiveCategory] = useState(null)
  const [selectedCreature, setSelectedCreature] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [socket, setSocket] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeSelection, setMergeSelection] = useState([])
  const [mergeName, setMergeName] = useState('')

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001')
    setSocket(newSocket)

    newSocket.on('initialState', ({ data, categories }) => {
      setSessionData(data || {})
      setCategories(categories || {})
      if (!activeCategory && categories) {
        setActiveCategory(Object.keys(categories)[0])
      }
    })

    newSocket.on('catchUpdate', ({ data, categoryId, lastLine }) => {
      setSessionData(data || {})
      setLastUpdate({ categoryId, message: lastLine, time: new Date() })
    })

    return () => newSocket.disconnect()
  }, [])

  // Current category data
  const currentCategoryData = activeCategory ? sessionData[activeCategory] : null
  const currentCategoryConfig = activeCategory ? categories[activeCategory] : null
  const CategoryIcon = currentCategoryConfig
    ? (iconMap[currentCategoryConfig.icon] || Fish)
    : Fish

  // Total catches across all categories
  const totalAllCatches = Object.values(sessionData).reduce(
    (sum, cat) => sum + (cat?.totalCatches || 0), 0
  )

  // Handlers
  const handleCategoryChange = (id) => {
    setActiveCategory(id)
    setSelectedCreature(null)
  }

  const handleCreateMerge = () => {
    if (mergeSelection.length >= 2 && mergeName.trim() && socket) {
      socket.emit('createMergedCategory', {
        name: mergeName.trim(),
        baseCategoryIds: mergeSelection
      })
      setShowMergeModal(false)
      setMergeSelection([])
      setMergeName('')
    }
  }

  const handleRemoveMerged = (id) => {
    if (socket && id.startsWith('merged_')) {
      socket.emit('removeMergedCategory', id)
    }
  }

  // Derived list of static vs dynamic categories for display
  const staticCategories = Object.entries(categories).filter(([id]) => !id.startsWith('merged_'))
  const dynamicCategories = Object.entries(categories).filter(([id]) => id.startsWith('merged_'))

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 to-dark-900">
      {/* ---------- HEADER ---------- */}
      <header className="border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Fish className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Fishing RNG Tracker</h1>
                <p className="text-sm text-dark-400">Hypixel Skyblock</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <div className="hidden lg:block text-xs text-dark-500">
                  Last: {lastUpdate.time?.toLocaleTimeString()}
                </div>
              )}
              <div className="text-right">
                <div className="text-sm text-dark-400">Total Catches</div>
                <div className="text-2xl font-bold text-white">
                  {totalAllCatches.toLocaleString()}
                </div>
              </div>
              {socket && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="px-3 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
                >
                  + Merge
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
            {staticCategories.map(([id, cat]) => {
              const Icon = iconMap[cat.icon] || Fish
              const isActive = activeCategory === id
              const count = sessionData[id]?.totalCatches || 0
              return (
                <button
                  key={id}
                  onClick={() => handleCategoryChange(id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                      : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-700 text-dark-400'
                  }`}>
                    {count.toLocaleString()}
                  </span>
                </button>
              )
            })}
            {/* Dynamic categories */}
            {dynamicCategories.map(([id, cat]) => {
              const isActive = activeCategory === id
              const count = sessionData[id]?.totalCatches || 0
              return (
                <div key={id} className="relative group">
                  <button
                    onClick={() => handleCategoryChange(id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800 border border-transparent'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>{cat.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-dark-400'
                    }`}>
                      {count.toLocaleString()}
                    </span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveMerged(id) }}
                    className="absolute -top-1 -right-1 hidden group-hover:block bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </header>

      {/* ---------- MAIN CONTENT ---------- */}
      <main className="container mx-auto px-4 py-8">
        {currentCategoryConfig && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-dark-700 rounded-lg">
                <CategoryIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{currentCategoryConfig.name}</h2>
                <p className="text-sm text-dark-400">{currentCategoryConfig.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-dark-400">Category Catches</div>
                <div className="text-xl font-bold text-white">
                  {currentCategoryData?.totalCatches?.toLocaleString() || 0}
                </div>
              </div>
              {socket && (
                <button
                  onClick={() => socket.emit('resetCategory', activeCategory)}
                  className="px-3 py-2 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {activeCategory && (
          <div className="flex space-x-4 mb-8">
            {['overview', 'analysis', 'anomalies'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                }`}
              >
                {tab === 'overview' && <BarChart3 className="w-4 h-4 inline mr-2" />}
                {tab === 'analysis' && <TrendingUp className="w-4 h-4 inline mr-2" />}
                {tab === 'anomalies' && <AlertTriangle className="w-4 h-4 inline mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'overview' && currentCategoryData && (
          <>
            <SessionGrid
              creatures={currentCategoryData.creatures}
              statistics={currentCategoryData.statistics}
              totalCatches={currentCategoryData.totalCatches}
              onSelectCreature={setSelectedCreature}
            />
            <div className="mt-8">
              <DeviationChart
                creatures={currentCategoryData.creatures}
                statistics={currentCategoryData.statistics}
              />
            </div>
          </>
        )}

        {activeTab === 'analysis' && currentCategoryData && (
          <ProbabilityChart
            creatures={currentCategoryData.creatures}
            statistics={currentCategoryData.statistics}
            totalCatches={currentCategoryData.totalCatches}
            selectedCreature={selectedCreature}
          />
        )}

        {activeTab === 'anomalies' && currentCategoryData && (
          <StreaksPanel
            creatures={currentCategoryData.creatures}
            statistics={currentCategoryData.statistics}
            totalCatches={currentCategoryData.totalCatches}
          />
        )}
      </main>

      {/* ---------- MERGE MODAL ---------- */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Create Merged Category</h3>
            <input
              type="text"
              placeholder="Category name (e.g., Hotspot+Lava)"
              value={mergeName}
              onChange={(e) => setMergeName(e.target.value)}
              className="w-full p-2 bg-dark-700 rounded mb-4 text-white"
            />
            <div className="mb-4">
              <p className="text-sm text-dark-400 mb-2">Select categories to merge:</p>
              {staticCategories.map(([id, cat]) => (
                <label key={id} className="flex items-center space-x-2 mb-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeSelection.includes(id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMergeSelection([...mergeSelection, id])
                      } else {
                        setMergeSelection(mergeSelection.filter(i => i !== id))
                      }
                    }}
                  />
                  <span className="text-dark-200">{cat.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 bg-dark-700 rounded text-dark-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMerge}
                disabled={mergeSelection.length < 2 || !mergeName.trim()}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App