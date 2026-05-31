import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { Fish, BarChart3, TrendingUp, AlertTriangle, Snowflake, Flame, Anchor, RefreshCw } from 'lucide-react'
import SessionGrid from './components/SessionGrid'
import DeviationChart from './components/DeviationChart'
import ProbabilityChart from './components/ProbabilityChart'
import StreaksPanel from './components/StreaksPanel'

const iconMap = {
  fish: Fish,
  snowflake: Snowflake,
  flame: Flame,
  anchor: Anchor,
}

function App() {
  const [sessionData, setSessionData] = useState({})
  const [categories, setCategories] = useState({})
  const [activeCategory, setActiveCategory] = useState(null)
  const [selectedCreature, setSelectedCreature] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [socket, setSocket] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  useEffect(() => {
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)
    
    newSocket.on('initialState', (state) => {
      console.log('Initial state received:', state)
      setSessionData(state.data || {})
      setCategories(state.categories || {})
      
      // Set first category as active if none selected
      if (!activeCategory && state.categories) {
        const firstCategory = Object.keys(state.categories)[0]
        setActiveCategory(firstCategory)
      }
    })
    
    newSocket.on('catchUpdate', (update) => {
      console.log('Catch update received:', update)
      setSessionData(update.data || {})
      setLastUpdate({
        categoryId: update.categoryId,
        message: update.lastLine,
        time: new Date()
      })
    })
    
    return () => {
      newSocket.disconnect()
    }
  }, [])
  
  // Get current category data
  const currentCategoryData = activeCategory ? sessionData[activeCategory] : null
  const currentCategoryConfig = activeCategory ? categories[activeCategory] : null
  const CategoryIcon = currentCategoryConfig ? (iconMap[currentCategoryConfig.icon] || Fish) : Fish
  
  // Calculate total catches across all categories
  const totalAllCatches = Object.values(sessionData).reduce((sum, cat) => {
    return sum + (cat?.totalCatches || 0)
  }, 0)
  
  // Handle category change
  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId)
    setSelectedCreature(null) // Reset selected creature when switching categories
  }
  
  // Handle reset
  const handleResetCategory = () => {
    if (socket && activeCategory) {
      socket.emit('resetCategory', activeCategory)
    }
  }
  
  const handleResetAll = () => {
    if (socket) {
      socket.emit('resetAll')
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 to-dark-900">
      {/* Header */}
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
                  Last catch: {lastUpdate.time?.toLocaleTimeString()}
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
                  onClick={handleResetAll}
                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  title="Reset All Categories"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Category Tabs */}
          <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
            {Object.entries(categories).map(([categoryId, category]) => {
              const Icon = iconMap[category.icon] || Fish
              const categoryData = sessionData[categoryId]
              const isActive = activeCategory === categoryId
              
              return (
                <button
                  key={categoryId}
                  onClick={() => handleCategoryChange(categoryId)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                      : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-700 text-dark-400'
                  }`}>
                    {(categoryData?.totalCatches || 0).toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Category Header */}
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
                  onClick={handleResetCategory}
                  className="px-3 py-2 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center space-x-1"
                  title="Reset This Category"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* No Category Selected */}
        {!activeCategory && Object.keys(categories).length > 0 && (
          <div className="card text-center py-12">
            <Fish className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark-300 mb-2">Select a Fishing Category</h3>
            <p className="text-dark-500">Choose a fishing category above to view your statistics</p>
          </div>
        )}
        
        {/* No Categories Available */}
        {Object.keys(categories).length === 0 && (
          <div className="card text-center py-12">
            <div className="animate-pulse">
              <Fish className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-dark-300 mb-2">Connecting to Backend...</h3>
            <p className="text-dark-500">Make sure the backend server is running on port 3001</p>
          </div>
        )}
        
        {/* Tab Navigation */}
        {activeCategory && (
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'analysis' 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Analysis
            </button>
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'anomalies' 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Anomalies
            </button>
          </div>
        )}
        
        {/* Tab Content */}
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
        
        {/* Last Update Info */}
        {lastUpdate && (
          <div className="mt-8 text-center text-xs text-dark-600">
            Last detected: {lastUpdate.message} • {lastUpdate.time?.toLocaleTimeString()}
          </div>
        )}
      </main>
    </div>
  )
}

export default App