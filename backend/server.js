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

// Track session data
let sessionData = {
  totalCatches: 0,
  creatures: {}
};

// Initialize creatures from config
config.seaCreatures.forEach(creature => {
  sessionData.creatures[creature.id] = {
    ...creature,
    catches: 0
  };
});

// Statistics calculation functions
function calculateStatistics(creatureId) {
  const creature = sessionData.creatures[creatureId];
  const n = sessionData.totalCatches;
  const k = creature.catches;
  const p = creature.drop_rate;

  if (n === 0) {
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

function getAllStatistics() {
  const stats = {};
  Object.keys(sessionData.creatures).forEach(creatureId => {
    stats[creatureId] = calculateStatistics(creatureId);
  });
  return stats;
}

// Check if line contains a catch
function isCatchLine(line) {
  return line.includes('You caught a') || line.includes('You caught an');
}

function getCreatureIdFromLine(line) {
  for (const creature of config.seaCreatures) {
    if (line.includes(creature.chat_trigger)) {
      return creature.id;
    }
  }
  return null;
}

// Watch log file
function watchLogFile() {
  let logPath = config.logFilePath;

  if (process.platform === 'win32' && logPath.includes('%appdata%')) {
    logPath = logPath.replace('%appdata%', process.env.APPDATA);
  }

  console.log('Watching log file: ' + logPath);

  if (!fs.existsSync(logPath)) {
    console.error('Log file not found: ' + logPath);
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
      lastSize = 0;
      sessionData.totalCatches = 0;
      Object.keys(sessionData.creatures).forEach(id => {
        sessionData.creatures[id].catches = 0;
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
}

function processLine(line) {
  if (isCatchLine(line)) {
    sessionData.totalCatches++;

    const creatureId = getCreatureIdFromLine(line);
    if (creatureId) {
      sessionData.creatures[creatureId].catches++;
    }

    const stats = getAllStatistics();
    io.emit('catchUpdate', {
      totalCatches: sessionData.totalCatches,
      creatures: sessionData.creatures,
      statistics: stats,
      lastLine: line
    });
  }
}

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.emit('initialState', {
    totalCatches: sessionData.totalCatches,
    creatures: sessionData.creatures,
    statistics: getAllStatistics()
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Fishing RNG Tracker backend running on port ' + PORT);
  watchLogFile();
});
