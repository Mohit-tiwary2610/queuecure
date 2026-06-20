require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000']
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true }
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ─── In-Memory State ───────────────────────────────────────────────────────────
let clinicState = {
  queue: [],
  currentToken: null,
  avgConsultationTime: 10,
  totalServed: 0,
  clinicOpen: true,
  lastUpdated: new Date(),
  announcements: [], // recent announcements ticker
};

// Analytics tracking
let analytics = {
  hourlyPatients: {}, // { "HH": count }
  waitTimeSamples: [], // actual wait times in minutes
  priorityCounts: { normal: 0, urgent: 0, elderly: 0 },
  peakHour: null,
  avgActualWait: 0,
  totalToday: 0,
  sessionStart: new Date(),
};

function recordAnalytics(patient) {
  const hour = new Date().getHours().toString().padStart(2, '0');
  analytics.hourlyPatients[hour] = (analytics.hourlyPatients[hour] || 0) + 1;
  analytics.priorityCounts[patient.priority] = (analytics.priorityCounts[patient.priority] || 0) + 1;
  analytics.totalToday++;

  // Compute actual wait if calledAt and addedAt exist
  if (patient.calledAt && patient.addedAt) {
    const waitMin = Math.round((new Date(patient.calledAt) - new Date(patient.addedAt)) / 60000);
    if (waitMin >= 0) {
      analytics.waitTimeSamples.push(waitMin);
      analytics.avgActualWait = Math.round(
        analytics.waitTimeSamples.reduce((a, b) => a + b, 0) / analytics.waitTimeSamples.length
      );
    }
  }

  // Peak hour
  const maxCount = Math.max(...Object.values(analytics.hourlyPatients));
  analytics.peakHour = Object.keys(analytics.hourlyPatients).find(h => analytics.hourlyPatients[h] === maxCount);
}

function createPatient(name, phone = '', priority = 'normal', notes = '') {
  const allTokens = [...clinicState.queue.map(p => p.tokenNumber), clinicState.totalServed];
  const tokenNumber = allTokens.length > 0 ? Math.max(...allTokens) + 1 : clinicState.totalServed + 1;
  return {
    id: uuidv4(),
    tokenNumber,
    name: name.trim(),
    phone: phone.trim(),
    priority,
    notes: notes.trim(),
    status: 'waiting',
    addedAt: new Date(),
    calledAt: null,
    completedAt: null,
    estimatedCallTime: null,
  };
}

function getQueueStats() {
  const waiting = clinicState.queue.filter(p => p.status === 'waiting');
  return {
    totalWaiting: waiting.length,
    urgentCount: waiting.filter(p => p.priority === 'urgent').length,
    elderlyCount: waiting.filter(p => p.priority === 'elderly').length,
    estimatedClearTime: waiting.length * clinicState.avgConsultationTime,
  };
}

function getEstimatedCallTimes() {
  const waiting = clinicState.queue.filter(p => p.status === 'waiting');
  const now = new Date();
  waiting.forEach((p, i) => {
    const minsFromNow = i * clinicState.avgConsultationTime;
    clinicState.queue.find(q => q.id === p.id).estimatedCallTime = new Date(now.getTime() + minsFromNow * 60000);
  });
}

function broadcastState() {
  clinicState.lastUpdated = new Date();
  getEstimatedCallTimes();
  const stats = getQueueStats();
  io.emit('state_update', {
    queue: clinicState.queue,
    currentToken: clinicState.currentToken,
    avgConsultationTime: clinicState.avgConsultationTime,
    totalServed: clinicState.totalServed,
    clinicOpen: clinicState.clinicOpen,
    stats,
    lastUpdated: clinicState.lastUpdated,
    announcements: clinicState.announcements.slice(-5),
    analytics,
  });
}

// ─── REST API ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.get('/api/state', (req, res) => {
  res.json({
    queue: clinicState.queue,
    currentToken: clinicState.currentToken,
    avgConsultationTime: clinicState.avgConsultationTime,
    totalServed: clinicState.totalServed,
    clinicOpen: clinicState.clinicOpen,
    stats: getQueueStats(),
    lastUpdated: clinicState.lastUpdated,
    analytics,
  });
});

app.get('/api/analytics', (req, res) => res.json(analytics));

// Patient token lookup by name/phone
app.get('/api/lookup', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  const term = q.toLowerCase().trim();
  const matches = clinicState.queue.filter(p =>
    p.status === 'waiting' &&
    (p.name.toLowerCase().includes(term) || p.phone.includes(term))
  );
  if (matches.length === 0) return res.json({ found: false });
  const waiting = clinicState.queue.filter(p => p.status === 'waiting');
  const results = matches.map(p => ({
    ...p,
    position: waiting.findIndex(w => w.id === p.id) + 1,
    estimatedWait: waiting.findIndex(w => w.id === p.id) * clinicState.avgConsultationTime,
  }));
  res.json({ found: true, results });
});

// AI Chat
app.post('/api/chat', async (req, res) => {
  const { message, conversationHistory = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const waiting = clinicState.queue.filter(p => p.status === 'waiting');
  const stats = getQueueStats();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const lowerMsg = message.toLowerCase();
    let reply = '';
    if (lowerMsg.includes('wait') || lowerMsg.includes('time') || lowerMsg.includes('long')) {
      reply = `Currently ${waiting.length} patients are waiting. With ${clinicState.avgConsultationTime}-minute consultations, estimated total wait is ${stats.estimatedClearTime} minutes.`;
    } else if (lowerMsg.includes('current') || lowerMsg.includes('serving') || lowerMsg.includes('token')) {
      reply = clinicState.currentToken
        ? `Token #${clinicState.currentToken.tokenNumber} (${clinicState.currentToken.name}) is currently being served.`
        : 'No patient is currently being served. The doctor is available!';
    } else if (lowerMsg.includes('queue') || lowerMsg.includes('how many') || lowerMsg.includes('patient')) {
      reply = `There are ${waiting.length} patients waiting. ${stats.urgentCount > 0 ? `${stats.urgentCount} urgent.` : ''} ${stats.elderlyCount > 0 ? `${stats.elderlyCount} elderly/special.` : ''}`;
    } else if (lowerMsg.includes('open') || lowerMsg.includes('close')) {
      reply = `The clinic is currently ${clinicState.clinicOpen ? 'OPEN' : 'CLOSED'}.`;
    } else if (lowerMsg.includes('served') || lowerMsg.includes('today') || lowerMsg.includes('total')) {
      reply = `${clinicState.totalServed} patients have been served today. ${analytics.avgActualWait > 0 ? `Average actual wait time: ${analytics.avgActualWait} minutes.` : ''}`;
    } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('help')) {
      reply = `Hello! I'm the QueueCure AI assistant 🏥\n\nI can help with:\n• Current wait times & queue status\n• Your token position (tell me your name)\n• Clinic information\n• Patient statistics\n\nWhat would you like to know?`;
    } else if (lowerMsg.includes('next')) {
      reply = waiting.length > 0
        ? `Next patient to be called is Token #${waiting[0].tokenNumber} — ${waiting[0].name} (${waiting[0].priority} priority).`
        : 'The queue is currently empty.';
    } else {
      reply = `I can help with queue status, wait times, and clinic info. Currently ${waiting.length} patients are waiting. What would you like to know?`;
    }
    return res.json({ reply });
  }

  try {
    const systemPrompt = `You are a helpful, friendly assistant for QueueCure clinic management system.

Current clinic status:
- Patients waiting: ${waiting.length}
- Urgent patients: ${stats.urgentCount}
- Currently serving: ${clinicState.currentToken ? `Token #${clinicState.currentToken.tokenNumber} - ${clinicState.currentToken.name}` : 'No one'}
- Average consultation time: ${clinicState.avgConsultationTime} minutes
- Total served today: ${clinicState.totalServed}
- Clinic status: ${clinicState.clinicOpen ? 'Open' : 'Closed'}
- Estimated total wait: ${stats.estimatedClearTime} minutes
- Average actual wait (from data): ${analytics.avgActualWait} minutes

Waiting patients: ${waiting.map((p, i) => `#${p.tokenNumber} ${p.name} (pos ${i + 1}, ~${i * clinicState.avgConsultationTime}min wait)`).join(', ') || 'None'}

Be concise, warm, and helpful. If someone asks about their position, check the waiting list above.`;

    const messages = [...conversationHistory.slice(-6), { role: 'user', content: message }];
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, system: systemPrompt, messages })
    });
    const data = await response.json();
    res.json({ reply: data.content?.[0]?.text || 'Sorry, could not process your request.' });
  } catch (err) {
    console.error('AI error:', err);
    res.json({ reply: 'I\'m having connection issues. Please try again.' });
  }
});

// ─── Socket.io ──────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);
  getEstimatedCallTimes();
  socket.emit('state_update', {
    queue: clinicState.queue,
    currentToken: clinicState.currentToken,
    avgConsultationTime: clinicState.avgConsultationTime,
    totalServed: clinicState.totalServed,
    clinicOpen: clinicState.clinicOpen,
    stats: getQueueStats(),
    lastUpdated: clinicState.lastUpdated,
    announcements: clinicState.announcements.slice(-5),
    analytics,
  });

  socket.on('add_patient', ({ name, phone, priority, notes }, callback) => {
    if (!name?.trim() || name.trim().length < 2) return callback?.({ error: 'Valid patient name required' });
    if (!clinicState.clinicOpen) return callback?.({ error: 'Clinic is closed' });

    const patient = createPatient(name, phone, priority || 'normal', notes || '');

    if (priority === 'urgent') {
      const lastUrgentIdx = clinicState.queue.reduce((acc, p, idx) =>
        p.priority === 'urgent' && p.status === 'waiting' ? idx : acc, -1);
      clinicState.queue.splice(lastUrgentIdx + 1, 0, patient);
    } else {
      clinicState.queue.push(patient);
    }

    // Add ticker announcement
    clinicState.announcements.push({ type: 'added', name: patient.name, token: patient.tokenNumber, time: new Date() });

    callback?.({ success: true, patient });
    broadcastState();
  });

  socket.on('call_next', (_, callback) => {
    if (clinicState.currentToken) {
      const idx = clinicState.queue.findIndex(p => p.id === clinicState.currentToken.id);
      if (idx !== -1) {
        clinicState.queue[idx].status = 'done';
        clinicState.queue[idx].completedAt = new Date();
        recordAnalytics(clinicState.queue[idx]);
      }
      clinicState.totalServed++;
    }

    const nextPatient = clinicState.queue.find(p => p.status === 'waiting');
    if (!nextPatient) {
      clinicState.currentToken = null;
      callback?.({ success: true, message: 'Queue empty', currentToken: null });
      broadcastState();
      return;
    }

    const idx = clinicState.queue.findIndex(p => p.id === nextPatient.id);
    clinicState.queue[idx].status = 'serving';
    clinicState.queue[idx].calledAt = new Date();
    clinicState.currentToken = clinicState.queue[idx];

    clinicState.announcements.push({ type: 'called', name: nextPatient.name, token: nextPatient.tokenNumber, time: new Date() });

    callback?.({ success: true, currentToken: clinicState.currentToken });
    broadcastState();
    io.emit('token_called', {
      tokenNumber: nextPatient.tokenNumber,
      name: nextPatient.name,
      priority: nextPatient.priority,
    });
  });

  socket.on('skip_patient', ({ patientId }, callback) => {
    const idx = clinicState.queue.findIndex(p => p.id === patientId);
    if (idx === -1) return callback?.({ error: 'Not found' });
    clinicState.queue[idx].status = 'skipped';
    if (clinicState.currentToken?.id === patientId) clinicState.currentToken = null;
    callback?.({ success: true });
    broadcastState();
  });

  socket.on('remove_patient', ({ patientId }, callback) => {
    const idx = clinicState.queue.findIndex(p => p.id === patientId);
    if (idx === -1) return callback?.({ error: 'Not found' });
    if (clinicState.currentToken?.id === patientId) clinicState.currentToken = null;
    clinicState.queue.splice(idx, 1);
    callback?.({ success: true });
    broadcastState();
  });

  socket.on('update_avg_time', ({ minutes }, callback) => {
    const mins = parseInt(minutes);
    if (isNaN(mins) || mins < 1 || mins > 60) return callback?.({ error: 'Must be 1–60 minutes' });
    clinicState.avgConsultationTime = mins;
    callback?.({ success: true });
    broadcastState();
  });

  socket.on('toggle_clinic', (_, callback) => {
    clinicState.clinicOpen = !clinicState.clinicOpen;
    callback?.({ success: true, clinicOpen: clinicState.clinicOpen });
    io.emit('clinic_status_changed', { clinicOpen: clinicState.clinicOpen });
    broadcastState();
  });

  socket.on('reset_queue', (_, callback) => {
    clinicState.queue = [];
    clinicState.currentToken = null;
    clinicState.totalServed = 0;
    clinicState.announcements = [];
    analytics = {
      hourlyPatients: {}, waitTimeSamples: [],
      priorityCounts: { normal: 0, urgent: 0, elderly: 0 },
      peakHour: null, avgActualWait: 0, totalToday: 0, sessionStart: new Date(),
    };
    callback?.({ success: true });
    broadcastState();
  });

  socket.on('complete_current', (_, callback) => {
    if (!clinicState.currentToken) return callback?.({ error: 'No current patient' });
    const idx = clinicState.queue.findIndex(p => p.id === clinicState.currentToken.id);
    if (idx !== -1) {
      clinicState.queue[idx].status = 'done';
      clinicState.queue[idx].completedAt = new Date();
      recordAnalytics(clinicState.queue[idx]);
    }
    clinicState.totalServed++;
    clinicState.currentToken = null;
    callback?.({ success: true });
    broadcastState();
  });

  socket.on('add_announcement', ({ text }, callback) => {
    clinicState.announcements.push({ type: 'custom', text, time: new Date() });
    callback?.({ success: true });
    broadcastState();
  });

  socket.on('disconnect', () => console.log(`Disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`QueueCure server on port ${PORT}`));
