import axios from 'axios';

// ── Backend API axios instance ─────────────────────────────────
// All audio transcription calls now go through the Spring Boot backend
// (http://localhost:8080/api/assembly/*) instead of hitting AssemblyAI
// directly from the browser.
//
// Why? The AssemblyAI API key must never be in frontend code — it would
// be visible in browser DevTools. The Java backend holds the key securely
// in an environment variable (ASSEMBLYAI_API_KEY).
export const assemblyApi = axios.create({
  baseURL: 'http://localhost:8080/api/assembly',
  headers: {
    'content-type': 'application/json',
  },
});
