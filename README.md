# 🎙️ AI Interview Evaluator

> A full-stack AI-powered interview coach that records your spoken answers, transcribes them in real-time, and delivers a structured evaluation with scores, strengths, and actionable feedback — powered by LLaMA 3.3 via Groq.

---


## 🧠 What It Does

Most interview prep is passive — reading articles, watching videos. This app makes it **active and measurable**.

You speak your answers into the microphone. The app transcribes them, detects filler words, measures your confidence from vocal sentiment, and sends everything to an AI model that returns a structured evaluation: an overall score, skill breakdown, verdict, strengths, improvements, and coaching tips.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│   SetupScreen ──► InterviewScreen ──► ResultsScreen             │
│   (role, difficulty,   (recorder, timer,    (radar chart,        │
│    AI questions,        silence detect,      scores, verdict,    │
│    practice mode,       filler counter)      tips, history)      │
│    demo scenarios)                                               │
│                              │                                   │
│                       useInterview()  ◄── useHistory()           │
│                    (all state & logic)   (localStorage)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ audio blob
                               ▼
┌──────────────────────────────────────────┐
│           AssemblyAI  (Speech-to-Text)   │
│                                          │
│  1. POST /upload   → upload_url          │
│  2. POST /transcript → job id            │
│  3. GET  /transcript/:id  (poll 1s)      │
│     until status === "completed"         │
│     returns: text, sentiment, entities   │
└──────────────────────────────┬───────────┘
                               │ transcript text
                               ▼
┌──────────────────────────────────────────┐
│        Express Backend  (:4000)          │
│                                          │
│  POST /upload           → full eval      │
│  POST /evaluate-answer  → per-question   │
│  POST /generate-questions → 5 questions  │
│           │                              │
│           ▼                              │
│     Groq  (LLaMA 3.3-70b)               │
│     Structured JSON response             │
└──────────────────────────────────────────┘
```

---

## 🔄 Request Flow (Step by Step)

1. **User configures** role, difficulty, and generates AI questions via Groq
2. **User records** their spoken answer using the browser microphone
3. **Audio blob** is uploaded to AssemblyAI → returns a hosted `upload_url`
4. **Transcription job** is submitted with sentiment analysis + entity detection enabled
5. **Frontend polls** AssemblyAI every 1 second until `status === 'completed'`
6. **Transcript text** is passed to `useInterview` hook via `setTextData()`
7. **Filler words** are counted, **confidence score** is computed from sentiment data
8. **Per-question evaluation** fires a background Groq call for a mini scorecard
9. After all questions: **full evaluation** is sent to Express → Groq → structured JSON
10. **Results dashboard** renders: overall score, radar chart, per-question cards, tips
11. **Session saved** to `localStorage` for history and trend tracking

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎙️ Voice Recording | Browser microphone capture via `react-voice-recorder` |
| 📝 Speech-to-Text | AssemblyAI async transcription with 1s polling |
| 🤖 AI Evaluation | LLaMA 3.3 via Groq — returns structured JSON scoring |
| 📊 Radar Chart | Technical Accuracy, Communication, Problem Solving breakdown |
| 🃏 Per-Question Cards | Individual score, label, and one-line feedback per answer |
| 📈 Confidence Score | Computed from AssemblyAI sentiment — no extra API call |
| 🎯 Practice Mode | Coaching tips only — no scores or verdict |
| 📋 Session History | Last 20 sessions in localStorage with score trend chart |
| 🎬 Demo Scenarios | Pre-loaded strong / weak / edge case question sets |
| ⚠️ Silence Detection | Nudges user after 10 seconds of inactivity |
| 🔁 Retry Logic | Auto-retries on Groq rate limit (429) with toast feedback |
| 🎞️ Animations | Framer Motion screen transitions |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Chakra UI | Component library with dark theme support |
| Animations | Framer Motion | Smooth screen transitions |
| Charts | Recharts | Radar chart + line chart for history |
| Speech-to-Text | AssemblyAI | Async transcription with sentiment + entity data |
| AI Evaluation | Groq — LLaMA 3.3-70b-versatile | Fast inference, free tier, structured output |
| Backend | Node.js + Express | Secure API key proxy, CORS handling |
| Persistence | localStorage | Session history without a database |

---

## 📁 Project Structure

```
├── backend/
│   └── server.js              ← Express API — Groq calls, prompt engineering
│
└── src/
    ├── App.js                 ← Entry point, screen routing, AnimatePresence
    ├── theme.js               ← Chakra UI custom dark theme
    ├── constants.js           ← Shared enums, filler words, demo scenarios
    ├── Result.js              ← Transcript renderer + confidence score logic
    ├── Status.js              ← Loading indicator during transcription
    │
    ├── hooks/
    │   ├── useInterview.js    ← ALL state, effects, handlers (core logic)
    │   ├── useAssemblyAI.js   ← Pre-configured AssemblyAI axios instance
    │   └── useHistory.js      ← localStorage read/write for past sessions
    │
    └── screens/
        ├── SetupScreen.jsx    ← Role, difficulty, practice mode, demo loader
        ├── InterviewScreen.jsx← Recorder, question card, live stats
        ├── ResultsScreen.jsx  ← Scores, radar chart, per-question breakdown
        └── HistoryScreen.jsx  ← Trend line chart + past attempt cards
```

---

## 🧩 Key Engineering Decisions

### Why a backend instead of calling Groq directly from React?
API keys exposed in the browser are a security risk — anyone can open DevTools and steal them. The Express server acts as a secure proxy. It also handles CORS, which blocks direct browser-to-Groq requests.

### Why `useRef` instead of `useState` for accumulated answers?
`useState` triggers a re-render on every update. If the answers array were state, adding an answer would re-trigger the `useEffect`, which would add the answer again — infinite loop. `useRef` stores the value without causing a re-render.

### Why poll AssemblyAI instead of using webhooks?
Webhooks require a publicly accessible URL to receive callbacks, which means a deployed server or ngrok tunnel. Polling every 1 second works perfectly for a frontend app with negligible latency difference for 10–30 second recordings.

### How is the confidence score computed?
AssemblyAI returns `sentiment_analysis_results` — an array of sentences each labelled `POSITIVE`, `NEUTRAL`, or `NEGATIVE`. We calculate `POSITIVE sentences / total sentences × 100`. No extra API call — the data comes back with the transcript when `sentiment_analysis: true` is set.

### How is LLaMA prompted to return valid JSON?
The system prompt instructs the model to return ONLY the JSON structure — no markdown, no explanation. We also use `temperature: 0.3` (lower = more deterministic output). Even then, LLaMA sometimes prepends a sentence before the JSON. We handle this with `raw.match(/\{[\s\S]*\}/)` which extracts the JSON block regardless of surrounding text.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- AssemblyAI API key → [assemblyai.com](https://www.assemblyai.com)
- Groq API key → [console.groq.com](https://console.groq.com)

### Setup

**Backend:**
```bash
cd backend
npm install
```

Create `backend/.env`:
```
API_KEY=your_groq_api_key
```

**Frontend:**
```bash
npm install
```

Create `.env` in root:
```
REACT_APP_ASSEMBLY_API_KEY=your_assemblyai_key
```

### Run

```bash
# Terminal 1 — backend
cd backend && node server.js

# Terminal 2 — frontend
npm start
```

App runs at `http://localhost:3000`, backend at `http://localhost:4000`.

---

## 🎬 Demo Scenarios

Load pre-built scenarios from the Setup screen without waiting for question generation:

| Scenario | Purpose |
|---|---|
| 💪 Strong Answer | Mid-level SWE questions — expect `Hire` or `Strong Hire` |
| 😬 Weak Answer | Junior basics — expect `No Hire`, good contrast demo |
| ⚠️ Edge Case | Senior system design — shows silence warning + error handling |

---

## 🔮 Future Scope

- **Database + Auth** — replace localStorage with a real DB and user accounts so history persists across devices
- **Follow-up questions** — after each answer, Groq generates a contextual follow-up, making it feel like a real dynamic interview
- **Groq structured outputs** — use the native JSON mode API instead of prompt-based enforcement for higher reliability
- **Batch per-question evaluation** — instead of 5 separate Groq calls, send all Q&A pairs in one request for efficiency
- **Real-time transcription** — AssemblyAI streaming for live word-by-word display as the user speaks

---

## 📄 License

This project is for educational and portfolio purposes.# 🎙️ AI Interview Evaluator

> A full-stack AI-powered interview coach that records your spoken answers, transcribes them in real-time, and delivers a structured evaluation with scores, strengths, and actionable feedback — powered by LLaMA 3.3 via Groq.

---

## 📸 Demo

![Site Demo](https://github.com/saptarsheemitra/Mercor-hackathon/blob/main/video1685536984.gif)

---

## 🧠 What It Does

Most interview prep is passive — reading articles, watching videos. This app makes it **active and measurable**.

You speak your answers into the microphone. The app transcribes them, detects filler words, measures your confidence from vocal sentiment, and sends everything to an AI model that returns a structured evaluation: an overall score, skill breakdown, verdict, strengths, improvements, and coaching tips.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│   SetupScreen ──► InterviewScreen ──► ResultsScreen             │
│   (role, difficulty,   (recorder, timer,    (radar chart,        │
│    AI questions,        silence detect,      scores, verdict,    │
│    practice mode,       filler counter)      tips, history)      │
│    demo scenarios)                                               │
│                              │                                   │
│                       useInterview()  ◄── useHistory()           │
│                    (all state & logic)   (localStorage)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ audio blob
                               ▼
┌──────────────────────────────────────────┐
│           AssemblyAI  (Speech-to-Text)   │
│                                          │
│  1. POST /upload   → upload_url          │
│  2. POST /transcript → job id            │
│  3. GET  /transcript/:id  (poll 1s)      │
│     until status === "completed"         │
│     returns: text, sentiment, entities   │
└──────────────────────────────┬───────────┘
                               │ transcript text
                               ▼
┌──────────────────────────────────────────┐
│        Express Backend  (:4000)          │
│                                          │
│  POST /upload           → full eval      │
│  POST /evaluate-answer  → per-question   │
│  POST /generate-questions → 5 questions  │
│           │                              │
│           ▼                              │
│     Groq  (LLaMA 3.3-70b)               │
│     Structured JSON response             │
└──────────────────────────────────────────┘
```

---

## 🔄 Request Flow (Step by Step)

1. **User configures** role, difficulty, and generates AI questions via Groq
2. **User records** their spoken answer using the browser microphone
3. **Audio blob** is uploaded to AssemblyAI → returns a hosted `upload_url`
4. **Transcription job** is submitted with sentiment analysis + entity detection enabled
5. **Frontend polls** AssemblyAI every 1 second until `status === 'completed'`
6. **Transcript text** is passed to `useInterview` hook via `setTextData()`
7. **Filler words** are counted, **confidence score** is computed from sentiment data
8. **Per-question evaluation** fires a background Groq call for a mini scorecard
9. After all questions: **full evaluation** is sent to Express → Groq → structured JSON
10. **Results dashboard** renders: overall score, radar chart, per-question cards, tips
11. **Session saved** to `localStorage` for history and trend tracking

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎙️ Voice Recording | Browser microphone capture via `react-voice-recorder` |
| 📝 Speech-to-Text | AssemblyAI async transcription with 1s polling |
| 🤖 AI Evaluation | LLaMA 3.3 via Groq — returns structured JSON scoring |
| 📊 Radar Chart | Technical Accuracy, Communication, Problem Solving breakdown |
| 🃏 Per-Question Cards | Individual score, label, and one-line feedback per answer |
| 📈 Confidence Score | Computed from AssemblyAI sentiment — no extra API call |
| 🎯 Practice Mode | Coaching tips only — no scores or verdict |
| 📋 Session History | Last 20 sessions in localStorage with score trend chart |
| 🎬 Demo Scenarios | Pre-loaded strong / weak / edge case question sets |
| ⚠️ Silence Detection | Nudges user after 10 seconds of inactivity |
| 🔁 Retry Logic | Auto-retries on Groq rate limit (429) with toast feedback |
| 🎞️ Animations | Framer Motion screen transitions |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Chakra UI | Component library with dark theme support |
| Animations | Framer Motion | Smooth screen transitions |
| Charts | Recharts | Radar chart + line chart for history |
| Speech-to-Text | AssemblyAI | Async transcription with sentiment + entity data |
| AI Evaluation | Groq — LLaMA 3.3-70b-versatile | Fast inference, free tier, structured output |
| Backend | Node.js + Express | Secure API key proxy, CORS handling |
| Persistence | localStorage | Session history without a database |

---

## 📁 Project Structure

```
├── backend/
│   └── server.js              ← Express API — Groq calls, prompt engineering
│
└── src/
    ├── App.js                 ← Entry point, screen routing, AnimatePresence
    ├── theme.js               ← Chakra UI custom dark theme
    ├── constants.js           ← Shared enums, filler words, demo scenarios
    ├── Result.js              ← Transcript renderer + confidence score logic
    ├── Status.js              ← Loading indicator during transcription
    │
    ├── hooks/
    │   ├── useInterview.js    ← ALL state, effects, handlers (core logic)
    │   ├── useAssemblyAI.js   ← Pre-configured AssemblyAI axios instance
    │   └── useHistory.js      ← localStorage read/write for past sessions
    │
    └── screens/
        ├── SetupScreen.jsx    ← Role, difficulty, practice mode, demo loader
        ├── InterviewScreen.jsx← Recorder, question card, live stats
        ├── ResultsScreen.jsx  ← Scores, radar chart, per-question breakdown
        └── HistoryScreen.jsx  ← Trend line chart + past attempt cards
```

---

## 🧩 Key Engineering Decisions

### Why a backend instead of calling Groq directly from React?
API keys exposed in the browser are a security risk — anyone can open DevTools and steal them. The Express server acts as a secure proxy. It also handles CORS, which blocks direct browser-to-Groq requests.

### Why `useRef` instead of `useState` for accumulated answers?
`useState` triggers a re-render on every update. If the answers array were state, adding an answer would re-trigger the `useEffect`, which would add the answer again — infinite loop. `useRef` stores the value without causing a re-render.

### Why poll AssemblyAI instead of using webhooks?
Webhooks require a publicly accessible URL to receive callbacks, which means a deployed server or ngrok tunnel. Polling every 1 second works perfectly for a frontend app with negligible latency difference for 10–30 second recordings.

### How is the confidence score computed?
AssemblyAI returns `sentiment_analysis_results` — an array of sentences each labelled `POSITIVE`, `NEUTRAL`, or `NEGATIVE`. We calculate `POSITIVE sentences / total sentences × 100`. No extra API call — the data comes back with the transcript when `sentiment_analysis: true` is set.

### How is LLaMA prompted to return valid JSON?
The system prompt instructs the model to return ONLY the JSON structure — no markdown, no explanation. We also use `temperature: 0.3` (lower = more deterministic output). Even then, LLaMA sometimes prepends a sentence before the JSON. We handle this with `raw.match(/\{[\s\S]*\}/)` which extracts the JSON block regardless of surrounding text.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- AssemblyAI API key → [assemblyai.com](https://www.assemblyai.com)
- Groq API key → [console.groq.com](https://console.groq.com)

### Setup

**Backend:**
```bash
cd backend
npm install
```

Create `backend/.env`:
```
API_KEY=your_groq_api_key
```

**Frontend:**
```bash
npm install
```

Create `.env` in root:
```
REACT_APP_ASSEMBLY_API_KEY=your_assemblyai_key
```

### Run

```bash
# Terminal 1 — backend
cd backend && node server.js

# Terminal 2 — frontend
npm start
```

App runs at `http://localhost:3000`, backend at `http://localhost:4000`.

---

## 🎬 Demo Scenarios

Load pre-built scenarios from the Setup screen without waiting for question generation:

| Scenario | Purpose |
|---|---|
| 💪 Strong Answer | Mid-level SWE questions — expect `Hire` or `Strong Hire` |
| 😬 Weak Answer | Junior basics — expect `No Hire`, good contrast demo |
| ⚠️ Edge Case | Senior system design — shows silence warning + error handling |

---

## 🔮 Future Scope

- **Database + Auth** — replace localStorage with a real DB and user accounts so history persists across devices
- **Follow-up questions** — after each answer, Groq generates a contextual follow-up, making it feel like a real dynamic interview
- **Groq structured outputs** — use the native JSON mode API instead of prompt-based enforcement for higher reliability
- **Batch per-question evaluation** — instead of 5 separate Groq calls, send all Q&A pairs in one request for efficiency
- **Real-time transcription** — AssemblyAI streaming for live word-by-word display as the user speaks

---# 🎙️ AI Interview Evaluator

> A full-stack AI-powered interview coach that records your spoken answers, transcribes them in real-time, and delivers a structured evaluation with scores, strengths, and actionable feedback — powered by LLaMA 3.3 via Groq.

---


## 🧠 What It Does

Most interview prep is passive — reading articles, watching videos. This app makes it **active and measurable**.

You speak your answers into the microphone. The app transcribes them, detects filler words, measures your confidence from vocal sentiment, and sends everything to an AI model that returns a structured evaluation: an overall score, skill breakdown, verdict, strengths, improvements, and coaching tips.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│   SetupScreen ──► InterviewScreen ──► ResultsScreen             │
│   (role, difficulty,   (recorder, timer,    (radar chart,        │
│    AI questions,        silence detect,      scores, verdict,    │
│    practice mode,       filler counter)      tips, history)      │
│    demo scenarios)                                               │
│                              │                                   │
│                       useInterview()  ◄── useHistory()           │
│                    (all state & logic)   (localStorage)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ audio blob
                               ▼
┌──────────────────────────────────────────┐
│           AssemblyAI  (Speech-to-Text)   │
│                                          │
│  1. POST /upload   → upload_url          │
│  2. POST /transcript → job id            │
│  3. GET  /transcript/:id  (poll 1s)      │
│     until status === "completed"         │
│     returns: text, sentiment, entities   │
└──────────────────────────────┬───────────┘
                               │ transcript text
                               ▼
┌──────────────────────────────────────────┐
│        Express Backend  (:4000)          │
│                                          │
│  POST /upload           → full eval      │
│  POST /evaluate-answer  → per-question   │
│  POST /generate-questions → 5 questions  │
│           │                              │
│           ▼                              │
│     Groq  (LLaMA 3.3-70b)               │
│     Structured JSON response             │
└──────────────────────────────────────────┘
```

---

## 🔄 Request Flow (Step by Step)

1. **User configures** role, difficulty, and generates AI questions via Groq
2. **User records** their spoken answer using the browser microphone
3. **Audio blob** is uploaded to AssemblyAI → returns a hosted `upload_url`
4. **Transcription job** is submitted with sentiment analysis + entity detection enabled
5. **Frontend polls** AssemblyAI every 1 second until `status === 'completed'`
6. **Transcript text** is passed to `useInterview` hook via `setTextData()`
7. **Filler words** are counted, **confidence score** is computed from sentiment data
8. **Per-question evaluation** fires a background Groq call for a mini scorecard
9. After all questions: **full evaluation** is sent to Express → Groq → structured JSON
10. **Results dashboard** renders: overall score, radar chart, per-question cards, tips
11. **Session saved** to `localStorage` for history and trend tracking

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎙️ Voice Recording | Browser microphone capture via `react-voice-recorder` |
| 📝 Speech-to-Text | AssemblyAI async transcription with 1s polling |
| 🤖 AI Evaluation | LLaMA 3.3 via Groq — returns structured JSON scoring |
| 📊 Radar Chart | Technical Accuracy, Communication, Problem Solving breakdown |
| 🃏 Per-Question Cards | Individual score, label, and one-line feedback per answer |
| 📈 Confidence Score | Computed from AssemblyAI sentiment — no extra API call |
| 🎯 Practice Mode | Coaching tips only — no scores or verdict |
| 📋 Session History | Last 20 sessions in localStorage with score trend chart |
| 🎬 Demo Scenarios | Pre-loaded strong / weak / edge case question sets |
| ⚠️ Silence Detection | Nudges user after 10 seconds of inactivity |
| 🔁 Retry Logic | Auto-retries on Groq rate limit (429) with toast feedback |
| 🎞️ Animations | Framer Motion screen transitions |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Chakra UI | Component library with dark theme support |
| Animations | Framer Motion | Smooth screen transitions |
| Charts | Recharts | Radar chart + line chart for history |
| Speech-to-Text | AssemblyAI | Async transcription with sentiment + entity data |
| AI Evaluation | Groq — LLaMA 3.3-70b-versatile | Fast inference, free tier, structured output |
| Backend | Node.js + Express | Secure API key proxy, CORS handling |
| Persistence | localStorage | Session history without a database |

---

## 📁 Project Structure

```
├── backend/
│   └── server.js              ← Express API — Groq calls, prompt engineering
│
└── src/
    ├── App.js                 ← Entry point, screen routing, AnimatePresence
    ├── theme.js               ← Chakra UI custom dark theme
    ├── constants.js           ← Shared enums, filler words, demo scenarios
    ├── Result.js              ← Transcript renderer + confidence score logic
    ├── Status.js              ← Loading indicator during transcription
    │
    ├── hooks/
    │   ├── useInterview.js    ← ALL state, effects, handlers (core logic)
    │   ├── useAssemblyAI.js   ← Pre-configured AssemblyAI axios instance
    │   └── useHistory.js      ← localStorage read/write for past sessions
    │
    └── screens/
        ├── SetupScreen.jsx    ← Role, difficulty, practice mode, demo loader
        ├── InterviewScreen.jsx← Recorder, question card, live stats
        ├── ResultsScreen.jsx  ← Scores, radar chart, per-question breakdown
        └── HistoryScreen.jsx  ← Trend line chart + past attempt cards
```

---

## 🧩 Key Engineering Decisions

### Why a backend instead of calling Groq directly from React?
API keys exposed in the browser are a security risk — anyone can open DevTools and steal them. The Express server acts as a secure proxy. It also handles CORS, which blocks direct browser-to-Groq requests.

### Why `useRef` instead of `useState` for accumulated answers?
`useState` triggers a re-render on every update. If the answers array were state, adding an answer would re-trigger the `useEffect`, which would add the answer again — infinite loop. `useRef` stores the value without causing a re-render.

### Why poll AssemblyAI instead of using webhooks?
Webhooks require a publicly accessible URL to receive callbacks, which means a deployed server or ngrok tunnel. Polling every 1 second works perfectly for a frontend app with negligible latency difference for 10–30 second recordings.

### How is the confidence score computed?
AssemblyAI returns `sentiment_analysis_results` — an array of sentences each labelled `POSITIVE`, `NEUTRAL`, or `NEGATIVE`. We calculate `POSITIVE sentences / total sentences × 100`. No extra API call — the data comes back with the transcript when `sentiment_analysis: true` is set.

### How is LLaMA prompted to return valid JSON?
The system prompt instructs the model to return ONLY the JSON structure — no markdown, no explanation. We also use `temperature: 0.3` (lower = more deterministic output). Even then, LLaMA sometimes prepends a sentence before the JSON. We handle this with `raw.match(/\{[\s\S]*\}/)` which extracts the JSON block regardless of surrounding text.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- AssemblyAI API key → [assemblyai.com](https://www.assemblyai.com)
- Groq API key → [console.groq.com](https://console.groq.com)

### Setup

**Backend:**
```bash
cd backend
npm install
```

Create `backend/.env`:
```
API_KEY=your_groq_api_key
```

**Frontend:**
```bash
npm install
```

Create `.env` in root:
```
REACT_APP_ASSEMBLY_API_KEY=your_assemblyai_key
```

### Run

```bash
# Terminal 1 — backend
cd backend && node server.js

# Terminal 2 — frontend
npm start
```

App runs at `http://localhost:3000`, backend at `http://localhost:4000`.

---

## 🎬 Demo Scenarios

Load pre-built scenarios from the Setup screen without waiting for question generation:

| Scenario | Purpose |
|---|---|
| 💪 Strong Answer | Mid-level SWE questions — expect `Hire` or `Strong Hire` |
| 😬 Weak Answer | Junior basics — expect `No Hire`, good contrast demo |
| ⚠️ Edge Case | Senior system design — shows silence warning + error handling |

---

## 🔮 Future Scope

- **Database + Auth** — replace localStorage with a real DB and user accounts so history persists across devices
- **Follow-up questions** — after each answer, Groq generates a contextual follow-up, making it feel like a real dynamic interview
- **Groq structured outputs** — use the native JSON mode API instead of prompt-based enforcement for higher reliability
- **Batch per-question evaluation** — instead of 5 separate Groq calls, send all Q&A pairs in one request for efficiency
- **Real-time transcription** — AssemblyAI streaming for live word-by-word display as the user speaks

---
