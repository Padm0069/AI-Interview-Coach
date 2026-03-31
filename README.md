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
                               │ audio blob (multipart/form-data)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Spring Boot Backend (:8080)                         │
│                                                                  │
│  POST /api/assembly/upload       → proxies audio to AssemblyAI  │
│  POST /api/assembly/transcript   → submits transcription job     │
│  GET  /api/assembly/transcript/{id} → polls job status          │
│                                                                  │
│  POST /api/generate-questions    → 5 role-specific questions     │
│  POST /api/evaluate-answer       → per-question mini scorecard   │
│  POST /api/upload                → full interview evaluation     │
│                                                                  │
│  ┌─────────────────┐    ┌──────────────────────────────────┐    │
│  │ AssemblyController│   │      InterviewController         │    │
│  └────────┬────────┘    └──────────────┬───────────────────┘    │
│           │                            │                         │
│           ▼                            ▼                         │
│  ┌──────────────────┐        ┌─────────────────┐                │
│  │ AssemblyAIService│        │   GroqService    │                │
│  └────────┬─────────┘        └────────┬────────┘                │
│           │                           │                          │
└───────────┼───────────────────────────┼──────────────────────────┘
            │                           │
            ▼                           ▼
    AssemblyAI API              Groq API (LLaMA 3.3-70b)
  (Speech-to-Text)            (Structured JSON evaluation)
```

---

## 🔄 Request Flow (Step by Step)

1. **User configures** role, difficulty → frontend calls `POST /api/generate-questions` → Spring Boot calls Groq → returns 5 questions
2. **User records** spoken answer using the browser microphone
3. **Audio blob** is sent as `multipart/form-data` to `POST /api/assembly/upload` → Spring Boot proxies raw bytes to AssemblyAI → returns `upload_url`
4. **Transcription job** submitted via `POST /api/assembly/transcript` with sentiment analysis + entity detection enabled
5. **Frontend polls** `GET /api/assembly/transcript/{id}` every 1 second (proxied through Spring Boot) until `status === 'completed'`
6. **Transcript text** passed to `useInterview` hook via `setTextData()`
7. **Filler words** counted client-side, **confidence score** computed from AssemblyAI sentiment data
8. **Per-question evaluation** fires `POST /api/evaluate-answer` in the background — staggered by `questionIdx × 1500ms` to avoid Groq rate limits
9. After all 5 questions: **full evaluation** sent to `POST /api/upload` → `GroqService` builds prompt → LLaMA returns structured JSON
10. **Results dashboard** renders: overall score, radar chart, per-question cards, verdict, tips
11. **Session saved** to `localStorage` for history and trend tracking

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎙️ Voice Recording | Browser microphone capture via `react-voice-recorder` |
| 📝 Speech-to-Text | AssemblyAI async transcription proxied through Spring Boot |
| 🔐 API Key Security | Both Groq and AssemblyAI keys stay server-side — never exposed to browser |
| 🤖 AI Evaluation | LLaMA 3.3 via Groq — returns structured JSON scoring |
| 📊 Radar Chart | Technical Accuracy, Communication, Problem Solving breakdown |
| 🃏 Per-Question Cards | Individual score, label, and one-line feedback per answer |
| 📈 Confidence Score | Computed from AssemblyAI sentiment — no extra API call |
| 🎯 Practice Mode | Coaching tips only — no scores or verdict |
| 📋 Session History | Last 20 sessions in localStorage with score trend chart |
| 🎬 Demo Scenarios | Pre-loaded strong / weak / edge case question sets |
| ⚠️ Silence Detection | Nudges user after 10 seconds of inactivity |
| 🔁 Retry Logic | Auto-retries on Groq rate limit (429) with toast feedback |
| 🛡️ Upload Protection | Prevents duplicate uploads with visual feedback and state guards |
| 🔄 Smart Recorder Reset | Clean state transitions between questions without losing functionality |
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
| Backend | Java 17 + Spring Boot 3.2 | Layered architecture, DI, centralised exception handling |
| HTTP Client | RestTemplate (Spring) | Configured with connect/read timeouts for external API calls |
| JSON | Jackson (ObjectMapper) | Auto serialization/deserialization, ignores unknown fields |
| Persistence | localStorage | Session history without a database |

---

## 📁 Project Structure

```
├── Backend/                               ← Spring Boot (Java 17, Maven)
│   └── src/main/java/com/interview/coach/
│       ├── InterviewCoachApplication.java ← Entry point (@SpringBootApplication)
│       │
│       ├── config/
│       │   ├── AppConfig.java             ← RestTemplate + ObjectMapper beans
│       │   └── WebConfig.java             ← CORS configuration
│       │
│       ├── controller/
│       │   ├── InterviewController.java   ← /api/generate-questions, /api/evaluate-answer, /api/upload
│       │   └── AssemblyAIController.java  ← /api/assembly/* (audio proxy)
│       │
│       ├── service/
│       │   ├── GroqService.java           ← All LLaMA API calls, prompt building, JSON parsing
│       │   └── AssemblyAIService.java     ← Audio upload + transcription polling proxy
│       │
│       ├── model/
│       │   ├── EvaluationRequest/Response ← Full interview eval DTOs
│       │   ├── AnswerEvaluation Request/Response ← Per-question DTOs
│       │   ├── QuestionRequest/Response   ← Question generation DTOs
│       │   ├── ScoreBreakdown.java        ← Nested breakdown object
│       │   └── groq/                      ← GroqRequest, GroqResponse, GroqMessage
│       │
│       └── exception/
│           ├── GlobalExceptionHandler.java ← @RestControllerAdvice — centralised error handling
│           ├── GroqException.java          ← Thrown on Groq API failures (502)
│           └── AssemblyAIException.java    ← Thrown on AssemblyAI failures (502)
│
└── Frontend/                              ← React 18
    ├── src/
    │   ├── App.js                         ← Root component, screen routing
    │   ├── constants.js                   ← Shared enums, filler words, demo scenarios
    │   ├── Result.js                      ← Transcript renderer + confidence score logic
    │   ├── Status.js                      ← Loading state indicator during transcription
    │   │
    │   ├── components/
    │   │   └── AudioRecorder.jsx          ← Wrapper for react-voice-recorder with upload protection
    │   │
    │   ├── hooks/
    │   │   ├── useInterview.js            ← ALL state, API calls, handlers (core logic)
    │   │   ├── useAssemblyAI.js           ← Pre-configured axios instance (baseURL: :8080/api/assembly)
    │   │   └── useHistory.js              ← localStorage read/write for past sessions
    │   │
    │   └── screens/
    │       ├── SetupScreen.jsx            ← Role, difficulty, practice mode, demo loader
    │       ├── InterviewScreen.jsx        ← Recorder, question card, live stats
    │       ├── ResultsScreen.jsx          ← Scores, radar chart, per-question breakdown
    │       └── HistoryScreen.jsx          ← Trend chart + past attempt cards
```

---

## 🧩 Key Engineering Decisions

### Why Spring Boot instead of Node/Express?
Production Java/Spring experience drove this choice — the backend mirrors the stack used in my day job (Spring Security, GCP integrations, CI/CD via GitHub Actions). Spring Boot also provides layered architecture, constructor-based dependency injection, centralised exception handling via `@ControllerAdvice`, and bean validation out of the box — things you wire manually in Express.

### Why proxy AssemblyAI through the backend?
API keys in `REACT_APP_*` environment variables are bundled into the JavaScript build and visible in browser DevTools — anyone can steal them. Routing all AssemblyAI and Groq calls through the Spring Boot server keeps both keys in server-side environment variables only.

### Why separate Controller and Service layers?
Single Responsibility Principle. Controllers only handle HTTP concerns — parse the request, validate input with `@Valid`, return a `ResponseEntity`. All business logic (prompt building, HTTP calls to Groq, JSON parsing) lives in `GroqService`. This makes both layers independently testable and easier to change without touching the other.

### Why `@RestControllerAdvice` for exception handling?
The original Node.js version had `try/catch` in every route handler — repeated error handling. `GlobalExceptionHandler` with `@RestControllerAdvice` catches exceptions from anywhere in the app centrally. Controllers have zero try/catch — they only run on the success path.

### Why use `useRef` instead of `useState` for accumulated answers?
Inside async callbacks and `setInterval`, React state is stale — you read the value from when the closure was created. `useRef` always gives the current value without causing re-renders. The answers array uses a ref so the polling effect always reads the latest state.

### Why use a key prop to reset the recorder between questions?
Third-party libraries with internal state (like `react-voice-recorder`) don't always respond correctly to prop changes. Setting `audioDetails` to `INITIAL_AUDIO_STATE` should reset the UI, but the library's internal recorder instance persists. Using a key prop (`key={recorderKey}`) that increments on each question transition forces React to unmount and remount the component entirely, giving the library a clean slate. This is the React-recommended pattern for resetting component state that you don't control.

### Why poll AssemblyAI instead of using webhooks?
Webhooks require a publicly accessible URL. Polling `GET /api/assembly/transcript/{id}` every 1 second through the backend works for a local app with negligible latency difference on 10-30 second recordings. The server just proxies a lightweight GET — no thread is blocked waiting.

### How is LLaMA prompted to return valid JSON?
The system prompt instructs the model to return ONLY the JSON — no markdown, no explanation. `temperature: 0.3` keeps output deterministic. Even then, LLaMA sometimes prepends text before the JSON. `GroqService` handles this with a regex `\{[\s\S]*\}` that extracts the JSON block regardless of surrounding text.

---

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Maven 3.8+
- Node.js 18+
- AssemblyAI API key → [assemblyai.com](https://www.assemblyai.com)
- Groq API key → [console.groq.com](https://console.groq.com)

### Backend Setup

```bash
cd AI-Interview/Backend
```

Set environment variables (never hardcode keys):

**Mac/Linux:**
```bash
export GROQ_API_KEY=your_groq_key
export ASSEMBLYAI_API_KEY=your_assemblyai_key
```

**Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY="your_groq_key"
$env:ASSEMBLYAI_API_KEY="your_assemblyai_key"
```

Run:
```bash
mvn spring-boot:run
```

Backend starts at `http://localhost:8080`

### Frontend Setup

```bash
cd AI-Interview/Frontend
npm install
npm start
```

Frontend starts at `http://localhost:3000`

> ⚠️ Start the backend first. The frontend calls `localhost:8080` on load.

---

## 🎬 Demo Scenarios

Load pre-built scenarios from the Setup screen without waiting for question generation:

| Scenario | Purpose |
|---|---|
| 💪 Strong Answer | Mid-level SWE questions — expect `Hire` or `Strong Hire` |
| 😬 Weak Answer | Junior basics — expect `No Hire`, good contrast demo |
| ⚠️ Edge Case | Senior system design — shows silence warning + error handling |

---

## ⚡ Technical Challenges & Solutions

### Challenge 1: Duplicate Upload Requests
**Problem:** Users could click the "Upload" button multiple times while audio was processing. This triggered simultaneous API calls to AssemblyAI, causing:
- Race conditions in transcript polling
- Conflicting state updates
- Upload failures or stuck UI states
- Backend logs showing multiple concurrent transcription jobs

**Root Cause:** The `handleAudioUpload` function had no guard against concurrent execution. When `isLoading` was true (transcription in progress), subsequent clicks would start new upload flows.

**Solution (3 Layers of Defense):**

1. **Logic Guard** — Added early return in `handleAudioUpload()`:
```javascript
if (isLoading) {
  console.log('Upload already in progress, ignoring duplicate click');
  return;
}
```

2. **Visual Feedback** — Created `AudioRecorder.jsx` wrapper component:
   - Dims recorder to 60% opacity when `isUploading={true}`
   - Disables pointer events (`pointerEvents: 'none'`)
   - Shows "Processing..." overlay text
   - Smooth opacity transition for better UX

3. **Validation Check** — Prevents empty uploads:
```javascript
if (!audioDetails.blob) {
  toast({ 
    title: 'No audio recorded', 
    description: 'Please record your answer first.',
    status: 'warning'
  });
  return;
}
```

**Files Changed:**
- `hooks/useInterview.js` — Added upload guards and validation
- `components/AudioRecorder.jsx` — New wrapper with disabled state
- `screens/InterviewScreen.jsx` — Replaced direct `Recorder` with `AudioRecorder`

---

### Challenge 2: Recorder State Corruption Between Questions
**Problem:** When moving from question 1 to question 2, the microphone button disappeared. Users saw:
- Missing record button
- "Give me audio!" text appearing incorrectly
- Broken recorder UI state
- No way to record the next answer

**Root Cause:** The `react-voice-recorder` library maintains internal state that wasn't properly resetting when:
1. Audio state was cleared (`setAudioDetails(INITIAL_AUDIO_STATE)`)
2. Component remained mounted across question transitions
3. Library's internal state became desynchronized with React props

**Solution:**

1. **Controlled Remount** — Added `recorderKey` state that increments when moving to next question:
```javascript
// In useInterview.js
const [recorderKey, setRecorderKey] = useState(0);

// When moving to next question:
setRecorderKey(k => k + 1); // Force recorder remount
```

2. **Key Prop Strategy** — Applied key to force clean remount:
```javascript
<AudioRecorder
  key={`recorder-${recorderKey}`}  // Changes on each question
  audioURL={audioDetails.url}
  isUploading={isLoading}
  {...handlers}
/>
```

This causes React to:
- Unmount the old recorder instance completely
- Mount a fresh recorder with clean internal state
- Restore the microphone button and functionality

3. **Status Component Cleanup** — Removed confusing "Give me audio!" message:
```javascript
// Status.js now returns null when not loading
if (!isLoading) return null;
```

**Files Changed:**
- `hooks/useInterview.js` — Added `recorderKey` state and increment logic
- `screens/InterviewScreen.jsx` — Applied key prop to AudioRecorder
- `components/AudioRecorder.jsx` — Added reset lifecycle handling
- `Status.js` — Simplified to only show during loading
- `App.js` — Passed `recorderKey` through component tree

**Why This Works:**
React's reconciliation algorithm uses the `key` prop to identify component instances. When the key changes, React knows it's a different component and performs a full unmount/mount cycle instead of updating props. This gives the third-party `react-voice-recorder` library a fresh start without carrying over stale internal state.

---

## 🔮 Future Scope

- **Database + Auth** — replace localStorage with PostgreSQL using Spring Data JPA, add Spring Security for user authentication so history persists across devices
- **GCP Deployment** — containerise with Docker, deploy to Cloud Run (aligns with existing GCP infrastructure experience)
- **Follow-up questions** — after each answer, Groq generates a contextual follow-up for a more dynamic interview feel
- **Groq structured outputs** — use native JSON mode instead of prompt-based enforcement for higher reliability
- **Batch per-question evaluation** — send all Q&A pairs in one Groq request instead of 5 separate calls
- **Real-time transcription** — AssemblyAI streaming for live word-by-word display as the user speaks
