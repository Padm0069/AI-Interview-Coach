# Running the Backend

## Prerequisites
- Java 17+
- Maven 3.8+

## Step 1 — Set your API keys as environment variables

**Mac/Linux:**
```bash
export GROQ_API_KEY=gsk_your_new_key_here
export ASSEMBLYAI_API_KEY=your_assemblyai_key_here
```

**Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY="gsk_your_new_key_here"
$env:ASSEMBLYAI_API_KEY="your_assemblyai_key_here"
```

> ⚠️ Never put real keys in application.properties — they get committed to git.

## Step 2 — Run the backend
```bash
cd AI-Interview/Backend
mvn spring-boot:run
```

Server starts on http://localhost:8080

## Step 3 — Run the frontend (separate terminal)
```bash
cd AI-Interview/Frontend
npm install
npm start
```

Frontend starts on http://localhost:3000

## Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/generate-questions | Generate 5 interview questions |
| POST | /api/evaluate-answer | Per-question mini scorecard |
| POST | /api/upload | Full interview evaluation |
| POST | /api/assembly/upload | Upload audio to AssemblyAI |
| POST | /api/assembly/transcript | Submit transcription job |
| GET  | /api/assembly/transcript/{id} | Poll transcription status |

## Verify it's running
```bash
curl -X POST http://localhost:8080/api/generate-questions \
  -H "Content-Type: application/json" \
  -d '{"role":"Backend Engineer","difficulty":"Mid-level"}'
```
