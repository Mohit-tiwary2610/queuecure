---
title: QueueCure Backend
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

# QueueCure Backend

Real-time clinic queue management backend — **[Full documentation on GitHub](https://github.com/Mohit-tiwary2610/queuecure)**

## Required Secrets (Settings → Repository secrets)

| Name | Value |
|------|-------|
| `FRONTEND_URL` | Your Netlify frontend URL |
| `ANTHROPIC_API_KEY` | Anthropic API key *(optional — chatbot works without it)* |

## Socket Events
`add_patient` · `call_next` · `skip_patient` · `remove_patient` · `update_avg_time` · `toggle_clinic` · `reset_queue` · `complete_current` · `add_announcement`

## REST Endpoints
`GET /health` · `GET /api/state` · `GET /api/analytics` · `GET /api/lookup?q=` · `POST /api/chat`
