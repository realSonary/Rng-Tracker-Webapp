const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const config = require('./config.json');

// Create HTTP server and Socket.io
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Track session data for each category
let sessionData = {};

// Initialize categories from config
Object.keys(config.fishingCategories).forEach(categoryId => {
  sessionData[categoryId] = {
    totalCatches: 0,
    creatures: {}
  };
  
  config.fishingCategories[categoryId].seaCreatures.forEach(creature => {
    sessionData[categoryId].creatures[creature.id] = {
      ...creature,
      catches: 0
    };
  });
});

// Statistics calculation functions
function calculateStatistics(categoryId, creatureId) {
  const category = sessionData[categoryId];
  if (!category) return null;
  
  const creature = category.creatures[creatureId];
  if (!creature) return null;
  
  const n = category.totalCatches;
  const k = creature.catches;
  const p = creature.drop_rate;
  
  if (n === 0 || p === 0) {
    return {
      expectedValue: 0,
      standardDeviation: 0,
      zScore: 0,
      luckStatus: 'average'
    };
  }
  
  const expectedValue = n * p;
  const variance = n * p * (1 - p);
  const standardDeviation = Math.sqrt(variance);
  const zScore = standardDeviation > 0 ? (k - expectedValue) / standardDeviation : 0;
  
  let luckStatus = 'average';
  if (zScore > 1.5) luckStatus = 'lucky';
  else if (zScore > 0.5) luckStatus = 'slightly_lucky';
  else if (zScore < -1.5) luckStatus = 'unlucky';
  else if (zScore < -0.5) luckStatus = 'slightly_unlucky';
  
  return { expectedValue, standardDeviation, zScore, luckStatus };
}

function getCategoryStatistics(categoryId) {
  const stats = {};
  const category = sessionData[categoryId];
  if (!category) return stats;
  
  Object.keys(category.creatures).forEach(creatureId => {
    stats[creatureId] = calculateStatistics(categoryId, creatureId);
  });
  
  return stats;
}

function getAllData() {
  const data = {};
  
  Object.keys(sessionData).forEach(categoryId => {
    data[categoryId] = {
      totalCatches: sessionData[categoryId].totalCatches,
      creatures: sessionData[categoryId].creatures,
      statistics: getCategoryStatistics(categoryId)
    };
  });
  
  return data;
}

// Find which creature and category a line matches
// ONLY uses chat triggers from config.json
function findCatchMatch(line) {
  for (const [categoryId, category] of Object.entries(config.fishingCategories)) {
    for (const creature of category.seaCreatures) {
      if (line.includes(creature.chat_trigger)) {
        return { 
          categoryId, 
          creatureId: creature.id, 
          creature: creature 
        };
      }
    }
  }
  return null;
}

// Process a line from the log file
function processLine(line) {
  if (!line || !line.trim()) return;
  
  // Check if line matches any creature's chat trigger from config
  const match = findCatchMatch(line);
  
  if (match) {
    const { categoryId, creatureId, creature } = match;
    
    // Increment total catches for this category
    sessionData[categoryId].totalCatches++;
    
    // Increment specific creature
    sessionData[categoryId].creatures[creatureId].catches++;
    
    console.log(`✅ [${config.fishingCategories[categoryId].name}] ${creature.name} (Total: ${sessionData[categoryId].creatures[creatureId].catches})`);
    console.log(`   Trigger: "${creature.chat_trigger}"`);
    
    // Send updated data to all clients
    const allData = getAllData();
    io.emit('catchUpdate', {
      categoryId: categoryId,
      data: allData,
      lastLine: line.trim()
    });
  }
}

// Watch log file for changes
function watchLogFile() {
  let logPath = config.logFilePath;
  
  if (process.platform === 'win32' && logPath.includes('%appdata%')) {
    logPath = logPath.replace('%appdata%', process.env.APPDATA);
  }
  
  console.log('='.repeat(60));
  console.log('🎣 Fishing RNG Tracker - Backend Server');
  console.log('='.repeat(60));
  console.log(`📁 Log file: ${logPath}`);
  console.log(`📋 Categories: ${Object.keys(config.fishingCategories).length}`);
  
  // List all creatures and their triggers
  Object.entries(config.fishingCategories).forEach(([id, cat]) => {
    console.log(`\n📂 ${cat.name}:`);
    cat.seaCreatures.forEach(creature => {
      console.log(`   • ${creature.name}: "${creature.chat_trigger}" (${(creature.drop_rate * 100).toFixed(1)}%)`);
    });
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (!fs.existsSync(logPath)) {
    console.error(`❌ Log file not found: ${logPath}`);
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(logPath, '');
    console.log('✅ Created empty log file');
  } else {
    console.log('✅ Log file found');
  }
  
  const watcher = chokidar.watch(logPath, {
    persistent: true,
    usePolling: true,
    interval: 100
  });
  
  let lastSize = fs.statSync(logPath).size;
  
  watcher.on('change', (filePath) => {
    const newSize = fs.statSync(filePath).size;
    
    if (newSize < lastSize) {
      console.log('⚠️ Log file was reset');
      lastSize = 0;
      
      Object.keys(sessionData).forEach(catId => {
        sessionData[catId].totalCatches = 0;
        Object.keys(sessionData[catId].creatures).forEach(creatureId => {
          sessionData[catId].creatures[creatureId].catches = 0;
        });
      });
    }
    
    if (newSize > lastSize) {
      const stream = fs.createReadStream(filePath, {
        start: lastSize,
        end: newSize,
        encoding: 'utf8'
      });
      
      let buffer = '';
      
      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
          processLine(lines[i]);
        }
        
        buffer = lines[lines.length - 1];
      });
      
      stream.on('end', () => {
        if (buffer.trim()) {
          processLine(buffer);
        }
      });
    }
    
    lastSize = newSize;
  });
  
  console.log('👀 Watching for changes...\n');
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected (ID: ${socket.id})`);
  
  socket.emit('initialState', {
    data: getAllData(),
    categories: config.fishingCategories
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected (ID: ${socket.id})`);
  });
  
  // Simulate catch for testing
  socket.on('simulateCatch', (categoryId) => {
    if (!categoryId) {
      categoryId = Object.keys(config.fishingCategories)[0];
    }
    
    const category = config.fishingCategories[categoryId];
    if (!category) return;
    
    const random = Math.random();
    let cumulative = 0;
    let caughtCreature = null;
    
    for (const creature of category.seaCreatures) {
      cumulative += creature.drop_rate;
      if (random <= cumulative) {
        caughtCreature = creature;
        break;
      }
    }
    
    if (caughtCreature) {
      const testLine = `[CHAT] ${caughtCreature.chat_trigger}`;
      console.log(`🎮 Simulating: ${testLine}`);
      processLine(testLine);
    }
  });
  
  socket.on('resetCategory', (categoryId) => {
    if (sessionData[categoryId]) {
      sessionData[categoryId].totalCatches = 0;
      Object.keys(sessionData[categoryId].creatures).forEach(creatureId => {
        sessionData[categoryId].creatures[creatureId].catches = 0;
      });
      
      console.log(`🔄 Reset: ${config.fishingCategories[categoryId].name}`);
      
      io.emit('catchUpdate', {
        categoryId: categoryId,
        data: getAllData(),
        lastLine: 'Category reset'
      });
    }
  });
  
  socket.on('resetAll', () => {
    Object.keys(sessionData).forEach(catId => {
      sessionData[catId].totalCatches = 0;
      Object.keys(sessionData[catId].creatures).forEach(creatureId => {
        sessionData[catId].creatures[creatureId].catches = 0;
      });
    });
    
    console.log('🔄 Reset all categories');
    
    io.emit('catchUpdate', {
      categoryId: 'all',
      data: getAllData(),
      lastLine: 'All categories reset'
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log('💡 Open http://localhost:5173 in your browser\n');
  watchLogFile();
});