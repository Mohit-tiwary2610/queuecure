# QueueCure — Socket Event Diagram

> Hackathon Submission Document — Queue Cure '26

---

## System Architecture

```
┌──────────────────────┐
│   Landing Page  /    │──── REST GET /api/lookup  ──────────────────────────┐
│   (Patient Search)   │                                                      │
└──────────────────────┘                                                      ▼
                                                               ┌─────────────────────────┐
┌──────────────────────┐   WebSocket (Socket.io)              │                         │
│  Receptionist  /rec  │◄────────────────────────────────────►│   Node.js + Express     │
│  - Queue mgmt        │                                       │   Socket.io Server      │
│  - Analytics tab     │                                       │                         │
│  - Voice TTS         │                                       │   In-Memory State:      │
└──────────────────────┘                                       │   ┌───────────────────┐ │
                                                               │   │ queue[]           │ │
┌──────────────────────┐   WebSocket (Socket.io)              │   │ currentToken      │ │
│  Patient Display /p  │◄────────────────────────────────────►│   │ avgConsultTime    │ │
│  - Token board       │                                       │   │ totalServed       │ │
│  - Ticker marquee    │                                       │   │ clinicOpen        │ │
│  - Voice announce    │                                       │   │ announcements[]   │ │
└──────────────────────┘                                       │   │ analytics{}       │ │
                                                               │   └───────────────────┘ │
┌──────────────────────┐   WebSocket (Socket.io)              │                         │
│   Doctor View /doc   │◄────────────────────────────────────►│   REST Endpoints:       │
│  - Current patient   │                                       │   GET  /health          │
│  - Upcoming queue    │                                       │   GET  /api/state       │
└──────────────────────┘                                       │   GET  /api/analytics   │
                                                               │   GET  /api/lookup      │
┌──────────────────────┐   REST POST /api/chat                │   POST /api/chat        │
│   AI Chatbot         │──────────────────────────────────────►│                         │
│  (all screens)       │                                       └─────────────────────────┘
└──────────────────────┘
```

---

## Client → Server Events

| Event | Payload | Server Action | Broadcast |
|-------|---------|---------------|-----------|
| `add_patient` | `{ name, phone, priority, notes }` | Creates patient with UUID + token#. Inserts urgent patients after last urgent in queue, appends others. Records analytics. | `state_update` to ALL |
| `call_next` | — | Marks current patient `done`, increments `totalServed`, records analytics. Sets next `waiting` patient to `serving`. | `state_update` + `token_called` to ALL |
| `skip_patient` | `{ patientId }` | Sets patient status to `skipped`. Clears `currentToken` if it was this patient. | `state_update` to ALL |
| `remove_patient` | `{ patientId }` | Splices patient from queue array. | `state_update` to ALL |
| `update_avg_time` | `{ minutes }` | Updates `avgConsultationTime`. Triggers `getEstimatedCallTimes()` recalculation. | `state_update` to ALL |
| `toggle_clinic` | — | Flips `clinicOpen` boolean. | `state_update` + `clinic_status_changed` to ALL |
| `reset_queue` | — | Clears queue, currentToken, totalServed, announcements, and full analytics object. | `state_update` to ALL |
| `complete_current` | — | Marks current patient `done`, increments totalServed, clears currentToken. Does NOT call next. | `state_update` to ALL |
| `add_announcement` | `{ text }` | Pushes custom text to `announcements[]`. | `state_update` to ALL |

---

## Server → Client Events

| Event | Payload | When Emitted | Who Receives |
|-------|---------|--------------|--------------|
| `state_update` | Full state object (see below) | After EVERY mutation | All connected clients |
| `token_called` | `{ tokenNumber, name, priority }` | Only on `call_next` | All clients — triggers full-screen announcement + chime + voice on Patient screen |
| `clinic_status_changed` | `{ clinicOpen }` | On `toggle_clinic` | All clients |

---

## `state_update` Payload Structure

```json
{
  "queue": [
    {
      "id": "uuid-v4",
      "tokenNumber": 3,
      "name": "Priya Sharma",
      "phone": "9876543210",
      "priority": "urgent",
      "notes": "Chest pain",
      "status": "waiting",
      "addedAt": "2026-06-15T05:30:00.000Z",
      "calledAt": null,
      "completedAt": null,
      "estimatedCallTime": "2026-06-15T05:48:00.000Z"
    }
  ],
  "currentToken": { /* patient object or null */ },
  "avgConsultationTime": 10,
  "totalServed": 4,
  "clinicOpen": true,
  "stats": {
    "totalWaiting": 3,
    "urgentCount": 1,
    "elderlyCount": 0,
    "estimatedClearTime": 30
  },
  "lastUpdated": "2026-06-15T05:30:00.000Z",
  "announcements": [
    { "type": "called", "name": "Ramesh Kumar", "token": 2, "time": "..." },
    { "type": "added", "name": "Priya Sharma", "token": 3, "time": "..." },
    { "type": "custom", "text": "Doctor is delayed by 5 minutes", "time": "..." }
  ],
  "analytics": {
    "hourlyPatients": { "09": 3, "10": 7, "11": 4 },
    "waitTimeSamples": [8, 12, 6, 9],
    "priorityCounts": { "normal": 8, "urgent": 2, "elderly": 1 },
    "peakHour": "10",
    "avgActualWait": 8,
    "totalToday": 11,
    "sessionStart": "2026-06-15T04:00:00.000Z"
  }
}
```

---

## Key Event Flow — Call Next Patient

```
Receptionist clicks "Call Next Patient"
          │
          ▼
Client emits: call_next ──────────────► Server receives
                                              │
                                    ┌─────────▼──────────┐
                                    │ 1. Find currentToken│
                                    │    → mark as 'done' │
                                    │    → completedAt=now│
                                    │ 2. totalServed++    │
                                    │ 3. recordAnalytics()│
                                    │ 4. Find next patient│
                                    │    with status=     │
                                    │    'waiting'        │
                                    │ 5. Mark as 'serving'│
                                    │    calledAt = now   │
                                    │ 6. Set currentToken │
                                    │ 7. getEstimatedCall │
                                    │    Times() for all  │
                                    └────────┬────────────┘
                                             │
                              ┌──────────────┼───────────────┐
                              ▼              ▼               ▼
                      emit: state_update  emit: token_called  callback({ success })
                      → ALL clients      → ALL clients       → calling client only
                              │              │
                    ┌─────────▼───┐   ┌──────▼────────────────────┐
                    │ All screens │   │ Patient Display:           │
                    │ update queue│   │ - Full-screen overlay      │
                    │ stats, etc. │   │ - 4-note chime plays       │
                    └─────────────┘   │ - Speech synthesis speaks  │
                                      │ - Auto-dismiss after 10s   │
                                      └───────────────────────────┘
```

---

## Concurrency & Edge Cases

### Multiple Receptionists Clicking Simultaneously

Node.js processes I/O events on a **single thread**. Socket.io event handlers run synchronously within the event loop:

```
Event Queue:
  [receptionist_A: call_next] → processes fully → broadcasts
  [receptionist_B: call_next] → processes on NEXT tick (different patient now current)

Result: No race condition possible. Sequential processing guaranteed.
```

### Other Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| `call_next` when queue empty | `currentToken = null`, broadcasts "queue empty" |
| `add_patient` when clinic closed | Returns error callback, state unchanged |
| `skip_patient` on current token | Clears `currentToken`, marks skipped |
| Client disconnect + reconnect | Server sends full `state_update` on `connection` event |
| Server restart | In-memory state resets (acceptable for single-day clinic) |

---

## Priority Queue Insertion Algorithm

```javascript
if (priority === 'urgent') {
  // Find last urgent patient currently waiting
  const lastUrgentIdx = queue.reduce((acc, p, idx) =>
    p.priority === 'urgent' && p.status === 'waiting' ? idx : acc, -1);

  // Insert immediately after them (before normal patients)
  queue.splice(lastUrgentIdx + 1, 0, newPatient);
} else {
  // Normal and elderly appended to end
  queue.push(newPatient);
}
```

This maintains **FIFO within each priority group** while ensuring all urgent patients are served before normal patients.

---

## Estimated Call Time Calculation

```javascript
function getEstimatedCallTimes() {
  const waiting = queue.filter(p => p.status === 'waiting');
  const now = new Date();

  waiting.forEach((p, i) => {
    const minsFromNow = i * avgConsultationTime;
    p.estimatedCallTime = new Date(now.getTime() + minsFromNow * 60000);
  });
}
```

Called on every `state_update` broadcast — all clients always see accurate, live estimated times.
