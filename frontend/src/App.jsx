import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { Fish, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react'
import SessionGrid from './components/SessionGrid'
import DeviationChart from './components/DeviationChart'
import ProbabilityChart from './components/ProbabilityChart'
import StreaksPanel from './components/StreaksPanel'

function App() {
  const [sessionData, setSessionData] = useState({
    totalCatches: 0,
    creatures: {},
    statistics: {}
  })
  
  const [selectedCreature, setSelectedCreature] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  useEffect(() => {
    const socket = io('http://localhost:3001')
    
    socket.on('initialState', (data) => {
      setSessionData(data)
    })
    
    socket.on('catchUpdate', (data) => {
      setSessionData(data)
    })
    
    return () => {
      socket.disconnect()
    }
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 to-dark-900">
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
            
            <div className="text-right">
              <div className="text-sm text-dark-400">Total Catches</div>
              <div className="text-2xl font-bold text-white">
                {sessionData.totalCatches.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
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
        
        {activeTab === 'overview' && (
          <>
            <SessionGrid 
              creatures={sessionData.creatures}
              statistics={sessionData.statistics}
              totalCatches={sessionData.totalCatches}
              onSelectCreature={setSelectedCreature}
            />
            <div className="mt-8">
              <DeviationChart 
                creatures={sessionData.creatures}
                statistics={sessionData.statistics}
              />
            </div>
          </>
        )}
        
        {activeTab === 'analysis' && (
          <ProbabilityChart 
            creatures={sessionData.creatures}
            statistics={sessionData.statistics}
            totalCatches={sessionData.totalCatches}
            selectedCreature={selectedCreature}
          />
        )}
        
        {activeTab === 'anomalies' && (
          <StreaksPanel 
            creatures={sessionData.creatures}
            statistics={sessionData.statistics}
            totalCatches={sessionData.totalCatches}
          />
        )}
      </main>
    </div>
  )
}

export default App