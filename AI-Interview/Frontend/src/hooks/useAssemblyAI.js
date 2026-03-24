import axios from 'axios';

// ── AssemblyAI pre-configured axios instance ───────────────────
// Exported so both useInterview and any future hooks can share it.
// The API key is read from .env (REACT_APP_ prefix required by CRA).
export const assemblyApi = axios.create({
  baseURL: 'https://api.assemblyai.com/v2',
  headers: {
    authorization: process.env.REACT_APP_ASSEMBLY_API_KEY,
    'content-type': 'application/json',
  },
});