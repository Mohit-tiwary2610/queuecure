<div align="center">

# 🏥 QueueCure

### Smart Real-Time Clinic Queue Management System

*Built for Queue Cure '26 Hackathon — Wooble × Unstop*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-00D4AA?style=for-the-badge)](https://queuecure.netlify.app)
[![Backend](https://img.shields.io/badge/🤗_HuggingFace_Space-FFD21E?style=for-the-badge&logoColor=black)](https://huggingface.co/spaces/mohit-tiwary/mogenai-backend)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github)](https://github.com/Mohit-tiwary2610/queuecure)

**76% of India's clinics still run on paper token slips and shouting.**  
QueueCure ends that — with live WebSocket sync, AI assistance, voice announcements, and smart priority queuing.

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Screens & Routes](#-screens--routes)
- [Socket Architecture](#-socket-architecture)
- [Local Development](#-local-development)
- [Deployment Guide](#-deployment-guide)
- [Hackathon Submission](#-hackathon-submission)
- [Built By](#-built-by)

---

## 🚨 Problem Statement

India's 1.5 million clinics face a daily chaos:
- Patients wait **2–3 hours** with zero visibility into their position
- Receptionists juggle **paper slips and verbal announcements**
- Doctors have **no dashboard** — they shout from the room
- **No prioritization** — urgent patients wait as long as everyone else

QueueCure solves all of this with a real-time digital queue system that works on any device, in any browser, with zero app installation required.

---

## ✨ Features

### 🔴 Core (Hackathon Requirements)
| Feature | Detail |
|---------|--------|
| **Live WebSocket Sync** | Both Receptionist and Patient screens update instantly when "Call Next" is clicked — no refresh, no polling |
| **Dynamic Wait Time** | Calculated live as `position × avgConsultationTime` — receptionist-configurable, never hardcoded |
| **Mistake-Proof Receptionist UI** | Confirmation dialogs for destructive actions, disabled states, toast feedback, clear visual hierarchy |
| **Concurrency Safe** | Node.js single-thread processes socket events sequentially — no race conditions across multiple receptionists |

### 🚀 Extra Features (Beyond Requirements)
| Feature | Detail |
|---------|--------|
| **🤖 AI Chatbot** | Floating assistant on all screens powered by Claude API. Answers queue status, wait times, patient lookup. Works with smart fallback if no API key |
| **📊 Analytics Dashboard** | Live bar chart (patients/hour), priority breakdown, peak hour detection, avg actual wait, queue health score |
| **🩺 Doctor's View** | Dedicated `/doctor` screen showing current patient + notes, upcoming queue, call/complete actions |
| **🔍 Patient Token Self-Lookup** | On landing page and patient display — type name or phone → see token #, queue position, estimated wait, exact expected call time |
| **🔊 Voice Announcements** | Web Speech API — "Token #5, Priya Sharma, please proceed to Doctor's Room" plays automatically. Toggle mute on receptionist screen |
| **📣 Live Ticker Marquee** | Scrolling announcement bar across all screens for every token call, patient registration, and custom broadcasts |
| **📢 Custom Announcements** | Receptionist broadcasts any text to all screens via ticker + voice simultaneously |
| **📋 Doctor Notes** | Notes field when adding patient — visible to doctor on their dedicated screen |
| **⏰ Estimated Call Time** | Every patient sees their exact expected appointment time (e.g. "~11:45 AM") |
| **⚡ Priority Queuing** | Urgent patients auto-inserted before normal queue. Elderly/Special flagged with visual indicators |
| **🔔 Full-Screen Token Announcement** | Overlay with chime sound on patient display when token is called |
| **🏥 Clinic Open/Close** | Toggle clinic status — blocks new patient registration when closed |
| **🔄 End-of-Day Reset** | One-click queue + analytics reset with confirmation guard |
| **📱 Unread Badge** | AI chat bubble shows unread reply count when minimized |

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + Vite | Fast HMR, modern JSX, component architecture |
| **Routing** | React Router v6 | Clean SPA routing for 4 screens |
| **Real-time** | Socket.io-client | Auto-reconnect, fallback to polling, rooms support |
| **Styling** | Pure CSS + CSS Variables | Zero framework dependency, full design control, tiny bundle |
| **Animations** | CSS keyframes | No library needed — smooth and performant |
| **Notifications** | react-hot-toast | Lightweight, beautiful toasts |
| **Icons** | lucide-react | Consistent, tree-shakeable icons |
| **Backend** | Node.js + Express | Fast, single-threaded, perfect for Socket.io |
| **WebSockets** | Socket.io | Bi-directional, reliable, auto-reconnect |
| **AI** | Anthropic Claude Haiku | Fast responses, clinic context injection, smart fallback |
| **Voice** | Web Speech API | Zero dependency, browser-native TTS |
| **Deploy: Frontend** | Netlify | Free CDN, instant deploys, SPA redirect support |
| **Deploy: Backend** | HuggingFace Spaces (Docker) | Free persistent Node.js process, easy secrets management |

---

## 📁 Project Structure

```
queuecure/
│
├── backend/                          # Node.js + Socket.io server
│   ├── server.js                     # Main server — all socket events + REST API
│   ├── package.json
│   ├── Dockerfile                    # HuggingFace Spaces deployment
│   ├── .env.example                  # Environment variable template
│   └── README.md                     # HuggingFace Space README (required)
│
├── frontend/                         # React 18 + Vite app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx       # Home — role selection + patient token search
│   │   │   ├── ReceptionistPage.jsx  # Queue management + analytics dashboard
│   │   │   ├── PatientPage.jsx       # Waiting room display + token announcement
│   │   │   └── DoctorPage.jsx        # Doctor's view — current patient + upcoming
│   │   ├── components/
│   │   │   ├── AIChatbot.jsx         # Floating AI assistant (all screens)
│   │   │   └── AnalyticsDashboard.jsx # Charts + stats (receptionist analytics tab)
│   │   ├── hooks/
│   │   │   └── useSocket.jsx         # Socket.io context provider + state management
│   │   ├── App.jsx                   # Router setup
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Full design system (CSS variables, animations)
│   ├── index.html
│   ├── vite.config.js
│   ├── netlify.toml                  # SPA redirect rules for Netlify
│   ├── package.json
│   └── .env.example                  # Frontend env variable template
│
├── SOCKET_EVENT_DIAGRAM.md           # Hackathon submission requirement
├── THOUGHT_PROCESS.md                # Hackathon submission requirement
└── README.md                         # This file
```

---

## 🖥 Screens & Routes

| Route | Screen | Who Uses It |
|-------|--------|-------------|
| `/` | Landing Page | Everyone — role selector + patient self-lookup |
| `/receptionist` | Receptionist Dashboard | Front desk staff |
| `/patient` | Patient Waiting Room | Displayed on a TV/monitor in waiting area |
| `/doctor` | Doctor's View | Doctor in the consultation room |

---

## 🔌 Socket Architecture

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add_patient` | `{ name, phone, priority, notes }` | Add patient. Urgent patients inserted before normal ones |
| `call_next` | — | Complete current, call next waiting patient |
| `skip_patient` | `{ patientId }` | Mark patient as skipped |
| `remove_patient` | `{ patientId }` | Remove patient from queue |
| `update_avg_time` | `{ minutes }` | Update consultation time (affects all wait calculations) |
| `toggle_clinic` | — | Open or close clinic |
| `reset_queue` | — | Clear all data (end of day) |
| `complete_current` | — | Mark current done without calling next |
| `add_announcement` | `{ text }` | Broadcast custom message to ticker on all screens |

### Server → Client Events

| Event | Payload | Recipients | Trigger |
|-------|---------|------------|---------|
| `state_update` | Full clinic state | All clients | Every mutation |
| `token_called` | `{ tokenNumber, name, priority }` | All clients | `call_next` |
| `clinic_status_changed` | `{ clinicOpen }` | All clients | `toggle_clinic` |

### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |
| `GET` | `/api/state` | Full current clinic state (for initial load) |
| `GET` | `/api/analytics` | Analytics data (hourly chart, priority counts) |
| `GET` | `/api/lookup?q=name` | Patient self-lookup by name or phone |
| `POST` | `/api/chat` | AI chatbot endpoint |

---

## 💻 Local Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Mohit-tiwary2610/queuecure.git
cd queuecure
```

```bash
# 2. Start Backend (Terminal 1)
cd backend
npm install
cp .env.example .env
# Optional: add ANTHROPIC_API_KEY to .env for AI chatbot
npm run dev
# → Server running on http://localhost:3001
```

```bash
# 3. Start Frontend (Terminal 2)
cd frontend
npm install
cp .env.example .env
# .env already set to VITE_BACKEND_URL=http://localhost:3001
npm run dev
# → App running on http://localhost:5173
```

### Open in Browser

| URL | Screen |
|-----|--------|
| `http://localhost:5173` | Landing page |
| `http://localhost:5173/receptionist` | Receptionist dashboard |
| `http://localhost:5173/patient` | Patient waiting room |
| `http://localhost:5173/doctor` | Doctor's view |

> **Tip:** Open `/receptionist` and `/patient` side by side to see live sync in action.

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=your_key_here    # Optional — AI chatbot works with smart fallback
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```env
VITE_BACKEND_URL=http://localhost:3001
```

---

## 🚀 Deployment Guide

### Step 1 — Deploy Backend to HuggingFace Spaces

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space)
2. Set **Space name**: `queuecure-backend`
3. Set **SDK**: `Docker`
4. Upload **all files from the `/backend` folder** (including `Dockerfile` and `README.md`)
5. Go to **Settings → Repository secrets** and add:

| Secret Name | Value |
|-------------|-------|
| `FRONTEND_URL` | `https://your-app.netlify.app` *(add after Step 2)* |
| `ANTHROPIC_API_KEY` | Your key *(optional — chatbot works without it)* |

6. Space builds automatically. Your backend URL will be:
   ```
   https://your-username-queuecure-backend.hf.space
   ```

> ⚠️ HuggingFace Spaces use port **7860** — the Dockerfile handles this automatically.

---

### Step 2 — Deploy Frontend to Netlify

1. In the `frontend/` folder, create a `.env` file:
   ```env
   VITE_BACKEND_URL=https://your-username-queuecure-backend.hf.space
   ```

2. Build the project:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**

4. Drag and drop the **`frontend/dist`** folder into Netlify

5. In Netlify: **Site configuration → Environment variables** → Add:
   ```
   VITE_BACKEND_URL = https://your-username-queuecure-backend.hf.space
   ```

6. **Trigger redeploy** (Deploys → Trigger deploy)

Your frontend URL will be: `https://your-site-name.netlify.app`

---

### Step 3 — Connect Frontend ↔ Backend

1. Copy your Netlify URL (e.g. `https://queuecure.netlify.app`)
2. Go to your HuggingFace Space → **Settings → Repository secrets**
3. Update `FRONTEND_URL` = `https://queuecure.netlify.app`
4. Go to **Settings → Restart Space**

✅ Done — your app is fully live and connected!

---

### Deployment Checklist

- [x] Backend deployed on HuggingFace Spaces (Docker)
- [x] `FRONTEND_URL` secret set on HuggingFace
- [x] Frontend built with correct `VITE_BACKEND_URL`
- [x] Frontend deployed on Netlify
- [x] `VITE_BACKEND_URL` env var set in Netlify
- [x] Frontend redeployed after setting env var
- [x] Test: open `/receptionist` + `/patient` — confirm live sync works
- [x] Test: add patient → token appears on patient screen instantly

---

## 🎯 Hackathon Submission

**Queue Cure '26 — Wooble × Unstop**

### Required Deliverables
- [x] Working prototype link *(Netlify URL)*
- [x] GitHub repository with README *(this file)*
- [x] Socket event diagram → [`SOCKET_EVENT_DIAGRAM.md`](./SOCKET_EVENT_DIAGRAM.md)
- [x] Thought process sheet → [`THOUGHT_PROCESS.md`](./THOUGHT_PROCESS.md)

### Evaluation Criteria

| Criteria | Weight | How We Meet It |
|----------|--------|----------------|
| **Live queue updates without refresh** | 40% | Socket.io `state_update` event broadcasts full state to **all connected clients** on every single mutation. Both screens update in under 50ms. |
| **Wait time from real data** | 25% | Computed as `position × avgConsultationTime`. Receptionist can update avg time at any moment. All wait times and estimated call times recalculate instantly across all screens. |
| **Receptionist screen fast & mistake-proof** | 20% | "Call Next" is the dominant CTA. Skip vs Remove are separate actions. Reset requires explicit confirmation. Clinic must be Open to add patients. Toast feedback on every action. |
| **Thought process addresses concurrency** | 15% | Node.js is single-threaded — socket events processed sequentially, making concurrent "Call Next" clicks physically impossible to race. Documented in `THOUGHT_PROCESS.md`. |

---

## 👨‍💻 Built By

<div align="center">

**Mohit Tiwary**  
3rd Year B.Tech Computer Science & Engineering  
Sikkim Manipal Institute of Technology (SMIT)  
Software Engineer Intern @ Tata Technologies Limited

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/tiwary-mohit)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Mohit-tiwary2610)
[![Portfolio](https://img.shields.io/badge/Wooble_Portfolio-00D4AA?style=flat-square)](https://wooble.org/mohit-tiwary)
[![Email](https://img.shields.io/badge/Email-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:mtiwary982@gmail.com)

</div>

---

<div align="center">
  <sub>Built with ❤️ for Queue Cure '26 Hackathon</sub>
</div>
