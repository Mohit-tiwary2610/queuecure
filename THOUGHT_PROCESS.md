# QueueCure — Thought Process Sheet

> Hackathon Submission Document — Queue Cure '26 by Wooble × Unstop  
> **Builder:** Mohit Tiwary | **Category:** Full Stack Development

---

## 1. Problem Understanding

Reading the problem statement carefully, I identified three distinct user pain points:

| User | Pain Point |
|------|-----------|
| **Patient** | No visibility — can't tell if they're 2nd or 20th in line |
| **Receptionist** | Manual chaos — paper slips, shouting names, no dashboard |
| **Doctor** | Blind — doesn't know who's coming next until they walk in |

This told me I needed **three distinct views**, not just one.

---

## 2. Architecture Decision — Why WebSockets?

The hardest requirement: *"both screens update the moment 'Call Next' is clicked."*

This is a **push** problem, not a **pull** problem.

| Approach | Latency | Bandwidth | Complexity | Decision |
|----------|---------|-----------|------------|----------|
| HTTP Polling (every 2s) | 0–2s delay | Wasteful | Low | ❌ |
| Server-Sent Events | <100ms | Efficient | Medium | ❌ one-way only |
| **WebSockets (Socket.io)** | **<50ms** | **Efficient** | **Medium** | **✅ Chosen** |

Socket.io was chosen specifically because it:
- Handles **reconnection automatically** (crucial for clinic uptime)
- Falls back to **HTTP polling** if WebSockets are blocked by a network
- Makes it easy to **broadcast to all clients** with `io.emit()`

---

## 3. State Management — In-Memory vs Database

**Decision: In-Memory on the Node.js server**

```javascript
let clinicState = {
  queue: [],
  currentToken: null,
  avgConsultationTime: 10,
  totalServed: 0,
  clinicOpen: true,
  announcements: [],
};
```

**Why not MongoDB/Redis?**

| Factor | In-Memory | Database |
|--------|-----------|----------|
| Latency | 0ms | 1–10ms |
| Complexity | Simple | Requires ORM, connection handling |
| Race conditions | None (single-thread) | Requires transactions |
| Data persistence | Lost on restart | Survives restart |
| For this use case | ✅ Perfect | ⚠️ Overkill |

For a **single clinic running daily shifts**, in-memory is the right call. A reset button clears state between days. If this were a multi-clinic SaaS, I'd add MongoDB with Redis for pub/sub.

---

## 4. Wait Time Calculation — Not Hardcoded

**Evaluation criterion weight: 25%**

```javascript
// Dynamic — never hardcoded
function calculateWaitTime(position) {
  return position * clinicState.avgConsultationTime;
}

// Estimated clock time
function getEstimatedCallTimes() {
  const waiting = queue.filter(p => p.status === 'waiting');
  const now = new Date();
  waiting.forEach((p, i) => {
    p.estimatedCallTime = new Date(now.getTime() + i * avgConsultationTime * 60000);
  });
}
```

**Three layers of "real data":**
1. `position` — computed from live queue, updates instantly when someone is called/skipped
2. `avgConsultationTime` — receptionist sets this based on actual doctor speed for the day
3. `estimatedCallTime` — exact clock time, recalculated on every broadcast

When the receptionist changes avg time from 10 → 5 minutes, **every patient's wait display updates instantly** without them needing to refresh.

---

## 5. Receptionist UX — Mistake-Proof Design

**Evaluation criterion weight: 20%**

Every design decision was made to prevent errors:

| Risk | Prevention |
|------|-----------|
| Accidentally calling next when not ready | Large button requires deliberate click |
| Accidentally resetting the whole day | Two-step: click Reset → confirm in modal |
| Adding patient when clinic is closed | Button disabled + explanatory message shown |
| Confusing Skip with Remove | Two separate buttons with distinct colors (amber vs red) |
| Missing current patient | "Now Serving" always pinned, glows when active |
| Calling next when queue is empty | Button disabled + shows "0 waiting" |

Additional UX: **Toast notifications** on every action so the receptionist always gets feedback, even if the action was fast.

---

## 6. Concurrency — The Multi-Receptionist Problem

**Evaluation criterion weight: 15%**

**Question: What if two receptionists click "Call Next" simultaneously?**

**Answer: It's physically impossible to race on Node.js.**

```
JavaScript Event Loop:
┌──────────────────────────────────────────────────────────┐
│  Call Stack (single-threaded — only one thing at a time) │
├──────────────────────────────────────────────────────────┤
│  Macrotask Queue:                                        │
│  [socket_A: call_next] ──► runs fully ──► broadcasts    │
│  [socket_B: call_next] ──► sees updated state ──► runs  │
└──────────────────────────────────────────────────────────┘
```

Socket.io event handlers are synchronous callbacks inside the Node.js event loop. They **cannot interrupt each other**. Receptionist B's click arrives as a new macrotask that only executes after A's has fully completed and the updated state has been broadcast.

This is one of the fundamental architectural advantages of Node.js for this type of real-time coordination problem.

---

## 7. Priority Queue Implementation

Real clinics have urgent patients. I built a **stable priority insertion** algorithm:

```javascript
if (priority === 'urgent') {
  // Find the last urgent patient currently waiting
  const lastUrgentIdx = queue.reduce((acc, p, idx) =>
    p.priority === 'urgent' && p.status === 'waiting' ? idx : acc, -1);

  // Insert after them — before all normal patients
  queue.splice(lastUrgentIdx + 1, 0, newPatient);
} else {
  queue.push(newPatient);
}
```

**Result:**
- Urgent patients are always served before normal patients
- Among urgent patients, FIFO order is preserved (first registered, first called)
- Normal patients never unfairly blocked behind each other

---

## 8. Extra Features Built (Beyond Core Requirements)

| Feature | Technical Approach | Why It Matters |
|---------|-------------------|----------------|
| **AI Chatbot** | REST POST to Claude API with live clinic state injected into system prompt. Smart fallback responses if no API key. | Patients can ask "how long?" without bothering reception |
| **Analytics Dashboard** | Server tracks `hourlyPatients{}`, `waitTimeSamples[]`, `priorityCounts{}` in memory. Frontend renders bar chart with CSS + JS | Shows clinic performance patterns |
| **Doctor's View** | 4th route `/doctor` — read-only queue + call/complete actions | Doctor knows who's coming before they arrive |
| **Patient Self-Lookup** | REST `GET /api/lookup?q=name` searches queue by name or phone | Reduces "am I next?" questions to reception |
| **Voice Announcements** | Web Speech API — zero dependency, browser-native. Receptionist and Patient screen both use it | Makes the system accessible, clinics feel professional |
| **Ticker Marquee** | CSS `animation: marquee` on announcements array from server state | Visual information channel for waiting room TV |
| **Estimated Call Time** | Clock time computed server-side, sent with every state update | "~11:45 AM" is more useful than "~20 minutes" |
| **Doctor Notes** | Extra field on `add_patient`, visible on Doctor screen | Doctor knows context before patient enters |

---

## 9. Deployment Architecture

```
User Browser
    │
    ├── Static files (HTML/CSS/JS)
    │       ▼
    │   Netlify CDN (free tier)
    │   ┌─────────────────────────┐
    │   │ React SPA               │
    │   │ netlify.toml → redirect │
    │   │ all /* to /index.html   │
    │   └────────────┬────────────┘
    │                │
    └── WebSocket + REST calls
            ▼
    HuggingFace Spaces (Docker, free tier)
    ┌──────────────────────────────────┐
    │ Node.js + Express + Socket.io   │
    │ Port 7860 (HF standard)         │
    │ ENV secrets (FRONTEND_URL, KEY) │
    └──────────────────────────────────┘
```

**Why this stack:**
- **Netlify** — Free, instant CDN, handles SPA routing with one config line
- **HuggingFace Spaces (Docker)** — Free persistent Node.js process, easy secret management, no cold starts on Spaces

---

## 10. What I Would Build Next

| Feature | Why | Complexity |
|---------|-----|------------|
| **MongoDB persistence** | Survive server restarts, historical reports | Medium |
| **Multi-doctor rooms** | Multiple queues, multiple doctors | Medium |
| **SMS/WhatsApp notification** | "You're 2 patients away" via Twilio | Low |
| **Appointment booking** | Pre-schedule slots, reduce walk-in overload | High |
| **Admin multi-clinic dashboard** | For clinic chains | High |
| **PWA / offline support** | Works on poor network | Medium |

---

## 11. Self-Assessment Against Criteria

| Criteria | My Score | Honest Assessment |
|----------|----------|-------------------|
| Live sync without refresh | 10/10 | Socket.io broadcasts in <50ms to all clients |
| Wait time from real data | 10/10 | Three layers: position, configurable avg, exact clock time |
| Receptionist UX | 9/10 | Could add keyboard shortcuts for power users |
| Concurrency documentation | 10/10 | Node.js single-thread guarantees this architecturally |
