const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const config = require('./config.json');

// ---------- HTTP + Socket.io ----------
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// ---------- Persistence file ----------
const SESSION_FILE = path.join(__dirname, 'sessionData.json');

// ---------- Session Data ----------
let sessionData = {};                   // static categories
let dynamicCategories = {};            // merged categories definitions
let dynamicSessionData = {};           // catches for dynamic categories

// ---------- Load previous session from disk ----------
function loadSession() {
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const raw = fs.readFileSync(SESSION_FILE, 'utf8');
      const saved = JSON.parse(raw);
      if (saved.static) sessionData = saved.static;
      if (saved.dynamicCategories) dynamicCategories = saved.dynamicCategories;
      if (saved.dynamicSessionData) dynamicSessionData = saved.dynamicSessionData;
      console.log('📂 Loaded previous session data');
    } catch (err) {
      console.error('⚠️ Failed to load session data, starting fresh', err.message);
    }
  }
}

// ---------- Save session to disk (debounced) ----------
let saveTimeout;
function saveSession() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const toSave = {
      static: sessionData,
      dynamicCategories: dynamicCategories,
      dynamicSessionData: dynamicSessionData
    };
    try {
      fs.writeFileSync(SESSION_FILE, JSON.stringify(toSave, null, 2), 'utf8');
    } catch (err) {
      console.error('❌ Failed to save session data', err.message);
    }
  }, 1000); // save 1 second after last update
}

// ---------- Initialise / merge static categories ----------
function initializeStaticCategories() {
  const freshData = {};
  Object.keys(config.fishingCategories).forEach(categoryId => {
    const category = config.fishingCategories[categoryId];
    let creatures = [...category.seaCreatures];

    // Handle "extends"
    if (category.extends) {
      category.extends.forEach(baseId => {
        if (config.fishingCategories[baseId]) {
          creatures = creatures.concat(config.fishingCategories[baseId].seaCreatures);
        }
      });
    }

    // Remove duplicates by ID
    const seen = new Set();
    creatures = creatures.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    // Calculate drop rates from weights
    const totalWeight = creatures.reduce((sum, c) => sum + (c.weight || 0), 0);
    creatures.forEach(creature => {
      creature.drop_rate = totalWeight > 0 ? creature.weight / totalWeight : 0;
    });

    // Build fresh structure (catches zero)
    freshData[categoryId] = {
      totalCatches: 0,
      creatures: {}
    };
    creatures.forEach(creature => {
      freshData[categoryId].creatures[creature.id] = {
        ...creature,
        catches: 0
      };
    });
  });

  // Merge loaded data into fresh structure (keep old catches for known creatures, add new ones)
  for (const catId in freshData) {
    if (sessionData[catId]) {
      // keep totalCatches and individual catches from previous session if creature still exists
      freshData[catId].totalCatches = sessionData[catId].totalCatches || 0;
      for (const cId in freshData[catId].creatures) {
        if (sessionData[catId].creatures && sessionData[catId].creatures[cId]) {
          freshData[catId].creatures[cId].catches = sessionData[catId].creatures[cId].catches || 0;
        }
      }
    }
  }

  sessionData = freshData;
}

// ---------- Helper: Statistics ----------
function calcStats(totalCatches, catches, dropRate) {
  if (totalCatches === 0 || dropRate === 0) {
    return { expectedValue: 0, standardDeviation: 0, zScore: 0, luckStatus: 'average' };
  }
  const expected = totalCatches * dropRate;
  const variance = totalCatches * dropRate * (1 - dropRate);
  const stdDev = Math.sqrt(variance);
  const z = stdDev > 0 ? (catches - expected) / stdDev : 0;

  let luck = 'average';
  if (z > 1.5) luck = 'lucky';
  else if (z > 0.5) luck = 'slightly_lucky';
  else if (z < -1.5) luck = 'unlucky';
  else if (z < -0.5) luck = 'slightly_unlucky';

  return { expectedValue: expected, standardDeviation: stdDev, zScore: z, luckStatus: luck };
}

function getCategoryStatistics(catId, dataSource = sessionData) {
  const stats = {};
  const cat = dataSource[catId];
  if (!cat) return stats;
  Object.keys(cat.creatures).forEach(cid => {
    const c = cat.creatures[cid];
    stats[cid] = calcStats(cat.totalCatches, c.catches, c.drop_rate);
  });
  return stats;
}

function getAllData() {
  const data = {};
  // Static categories
  Object.keys(sessionData).forEach(id => {
    data[id] = {
      totalCatches: sessionData[id].totalCatches,
      creatures: sessionData[id].creatures,
      statistics: getCategoryStatistics(id, sessionData)
    };
  });
  // Dynamic categories
  Object.keys(dynamicSessionData).forEach(id => {
    data[id] = {
      totalCatches: dynamicSessionData[id].totalCatches,
      creatures: dynamicSessionData[id].creatures,
      statistics: getCategoryStatistics(id, dynamicSessionData)
    };
  });
  return data;
}

// ---------- Dynamic Merged Categories ----------
function createMergedCategory(name, baseIds) {
  const mergedId = 'merged_' + baseIds.sort().join('_') + '_' + Date.now();

  // Collect creatures from base static categories (with extends)
  let creatures = [];
  baseIds.forEach(bid => {
    const cat = config.fishingCategories[bid];
    if (cat) {
      let baseCreatures = [...cat.seaCreatures];
      if (cat.extends) {
        cat.extends.forEach(eid => {
          if (config.fishingCategories[eid]) {
            baseCreatures = baseCreatures.concat(config.fishingCategories[eid].seaCreatures);
          }
        });
      }
      creatures = creatures.concat(baseCreatures);
    }
  });

  // Remove duplicates by ID
  const seen = new Set();
  creatures = creatures.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const totalWeight = creatures.reduce((sum, c) => sum + (c.weight || 0), 0);
  creatures.forEach(c => {
    c.drop_rate = totalWeight > 0 ? c.weight / totalWeight : 0;
  });

  dynamicCategories[mergedId] = {
    name: name,
    icon: 'zap',
    description: `Merged: ${baseIds.map(id => config.fishingCategories[id]?.name || id).join(' + ')}`,
    seaCreatures: creatures
  };

  dynamicSessionData[mergedId] = {
    totalCatches: 0,
    creatures: {}
  };
  creatures.forEach(c => {
    dynamicSessionData[mergedId].creatures[c.id] = { ...c, catches: 0 };
  });

  saveSession(); // persist the new dynamic category definition
  return mergedId;
}

// ---------- Log Watching ----------
function findCatchMatch(line) {
  // Static categories (with extends)
  for (const [catId, cat] of Object.entries(config.fishingCategories)) {
    let creatures = cat.seaCreatures;
    if (cat.extends) {
      cat.extends.forEach(eid => {
        if (config.fishingCategories[eid]) {
          creatures = creatures.concat(config.fishingCategories[eid].seaCreatures);
        }
      });
    }
    for (const creature of creatures) {
      if (line.includes(creature.chat_trigger)) {
        return { categoryId: catId, creatureId: creature.id, creature, isDynamic: false };
      }
    }
  }
  // Dynamic categories
  for (const [catId, cat] of Object.entries(dynamicCategories)) {
    for (const creature of cat.seaCreatures) {
      if (line.includes(creature.chat_trigger)) {
        return { categoryId: catId, creatureId: creature.id, creature, isDynamic: true };
      }
    }
  }
  return null;
}

function processLine(line) {
  if (!line || !line.trim()) return;

  const match = findCatchMatch(line);
  if (!match) return;

  const { categoryId, creatureId, creature, isDynamic } = match;
  const dataSource = isDynamic ? dynamicSessionData : sessionData;
  if (!dataSource[categoryId]) return;

  dataSource[categoryId].totalCatches++;
  dataSource[categoryId].creatures[creatureId].catches++;

  const catName = isDynamic
    ? dynamicCategories[categoryId].name
    : config.fishingCategories[categoryId].name;
  console.log(`✅ [${catName}] ${creature.name} (total: ${dataSource[categoryId].creatures[creatureId].catches})`);

  // Save to disk
  saveSession();

  // Emit update
  const allData = getAllData();
  io.emit('catchUpdate', {
    categoryId,
    data: allData,
    lastLine: line.trim()
  });
}

function watchLogFile() {
  let logPath = config.logFilePath;
  if (process.platform === 'win32' && logPath.includes('%appdata%')) {
    logPath = logPath.replace('%appdata%', process.env.APPDATA);
  }

  console.log('='.repeat(60));
  console.log('🎣 Fishing RNG Tracker');
  console.log('='.repeat(60));
  console.log(`📁 ${logPath}`);

  if (!fs.existsSync(logPath)) {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(logPath, '');
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
      // Log reset
      Object.values(sessionData).forEach(cat => {
        cat.totalCatches = 0;
        Object.values(cat.creatures).forEach(c => c.catches = 0);
      });
      Object.values(dynamicSessionData).forEach(cat => {
        cat.totalCatches = 0;
        Object.values(cat.creatures).forEach(c => c.catches = 0);
      });
      saveSession();
      lastSize = 0;
    }
    if (newSize > lastSize) {
      const stream = fs.createReadStream(filePath, { start: lastSize, end: newSize, encoding: 'utf8' });
      let buffer = '';
      stream.on('data', chunk => {
        buffer += chunk;
        const lines = buffer.split('\n');
        for (let i = 0; i < lines.length - 1; i++) processLine(lines[i]);
        buffer = lines[lines.length - 1];
      });
      stream.on('end', () => {
        if (buffer.trim()) processLine(buffer);
      });
    }
    lastSize = newSize;
  });

  console.log('👀 Watching...\n');
}

// ---------- Socket.io Events ----------
io.on('connection', (socket) => {
  console.log(`🔌 Client connected (${socket.id})`);

  socket.emit('initialState', {
    data: getAllData(),
    categories: { ...config.fishingCategories, ...dynamicCategories }
  });

  socket.on('simulateCatch', (categoryId) => {
    const allCats = { ...config.fishingCategories, ...dynamicCategories };
    const cat = allCats[categoryId || Object.keys(allCats)[0]];
    if (!cat) return;
    const totalWeight = cat.seaCreatures.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = null;
    for (const creature of cat.seaCreatures) {
      r -= creature.weight;
      if (r <= 0) { chosen = creature; break; }
    }
    if (chosen) {
      const testLine = `[CHAT] ${chosen.chat_trigger}`;
      console.log(`🎮 Simulating: ${testLine}`);
      processLine(testLine);
    }
  });

  socket.on('createMergedCategory', ({ name, baseCategoryIds }) => {
    if (!name || !baseCategoryIds || baseCategoryIds.length < 2) return;
    createMergedCategory(name, baseCategoryIds);
    io.emit('initialState', {
      data: getAllData(),
      categories: { ...config.fishingCategories, ...dynamicCategories }
    });
  });

  socket.on('removeMergedCategory', (categoryId) => {
    if (dynamicCategories[categoryId]) {
      delete dynamicCategories[categoryId];
      delete dynamicSessionData[categoryId];
      saveSession();
      io.emit('initialState', {
        data: getAllData(),
        categories: { ...config.fishingCategories, ...dynamicCategories }
      });
    }
  });

  socket.on('resetCategory', (categoryId) => {
    const target = sessionData[categoryId] || dynamicSessionData[categoryId];
    if (target) {
      target.totalCatches = 0;
      Object.values(target.creatures).forEach(c => c.catches = 0);
      saveSession();
      io.emit('catchUpdate', {
        categoryId,
        data: getAllData(),
        lastLine: 'Category reset'
      });
    }
  });

  socket.on('resetAll', () => {
    [...Object.values(sessionData), ...Object.values(dynamicSessionData)].forEach(cat => {
      cat.totalCatches = 0;
      Object.values(cat.creatures).forEach(c => c.catches = 0);
    });
    saveSession();
    io.emit('catchUpdate', {
      categoryId: 'all',
      data: getAllData(),
      lastLine: 'All reset'
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected (${socket.id})`);
  });
});

// ---------- Start ----------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);

  // Load previous session, then init static categories (merging old catches)
  loadSession();
  initializeStaticCategories();
  // Save the merged state immediately
  saveSession();

  watchLogFile();
});