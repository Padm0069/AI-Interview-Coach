// ============================================================
// AI-POWERED INTERVIEW EVALUATOR - Backend Server
// - Structured JSON evaluation with scores, strengths, tips, verdict
// - Practice Mode: coaching-only prompt (no scores/verdict)
// - /generate-questions endpoint for dynamic AI question generation
// - Uses Groq + LLaMA 3.3

import Groq from "groq-sdk";
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const KEY = process.env.API_KEY;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// ── Route: Evaluate Interview Answers ────────────────────────
app.post("/upload", async (req, res) => {
  const { textData, questions, practiceMode = false } = req.body;

  console.log(`Received interview answers (practiceMode=${practiceMode}):`, textData);

  try {
    const evaluation = await evaluateAnswers(textData, questions, practiceMode);
    console.log('AI Evaluation:', evaluation);
    res.json(evaluation);
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: 'Failed to evaluate answers. Is Groq reachable?' });
  }
});

// ── Route: Evaluate a Single Answer (per-question feedback) ──
// Called after each answer is transcribed — returns a mini scorecard.
// Non-blocking on the frontend; results accumulate in perQuestionFeedback.
app.post("/evaluate-answer", async (req, res) => {
  const { answer, question, questionIdx } = req.body;
  try {
    const feedback = await evaluateSingleAnswer(answer, question, questionIdx);
    res.json(feedback);
  } catch (err) {
    console.error('Single answer evaluation error:', err);
    res.status(500).json({ error: 'Failed to evaluate answer.' });
  }
});

// ── Route: Generate Interview Questions ──────────────────────
app.post("/generate-questions", async (req, res) => {
  const { role = 'Software Engineer', difficulty = 'Mid-level' } = req.body;

  console.log(`Generating questions for: ${role} (${difficulty})`);

  try {
    const questions = await generateQuestions(role, difficulty);
    res.json({ questions });
  } catch (err) {
    console.error('Question generation error:', err);
    res.status(500).json({ error: 'Failed to generate questions.' });
  }
});

// ── Core: Evaluate a Single Answer ───────────────────────────
// Returns a compact scorecard for one question/answer pair.
// Kept separate from the full evaluation so it can run per-question
// without inflating token usage on the main evaluation call.
async function evaluateSingleAnswer(answer, question, questionIdx) {
  const groq = new Groq({ apiKey: KEY });

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: 'system',
        content: `You are a technical interviewer. Evaluate this single interview answer and respond ONLY with this exact JSON — no markdown, no extra text:
{
  "questionIdx": ${questionIdx},
  "score": <integer 0-100>,
  "label": "<one of: Excellent | Good | Fair | Needs Work>",
  "oneLineFeedback": "<one sentence of feedback, max 15 words>"
}`,
      },
      { role: 'user', content: `Question: ${question}` },
      { role: 'assistant', content: answer },
    ],
    max_tokens: 120,
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const clean = jsonMatch ? jsonMatch[0] : '';

  try {
    return JSON.parse(clean);
  } catch {
    return { questionIdx, score: 0, label: 'Fair', oneLineFeedback: 'Could not evaluate this answer.' };
  }
}

// ── Core: Evaluate Answers ────────────────────────────────────
// practiceMode=true → coaching prompt (no scores/verdict)
// practiceMode=false → full scored evaluation
async function evaluateAnswers(interviewAnswers, interviewQuestions, practiceMode) {
  const groq = new Groq({ apiKey: KEY });

  const systemPrompt = practiceMode
    ? `You are a supportive interview coach. Give coaching feedback on the candidate's answers.
Respond ONLY with this exact JSON — no markdown, no extra text:
{
  "strengths": ["<what they did well 1>", "<what they did well 2>"],
  "improvements": ["<area to improve 1>", "<area to improve 2>"],
  "tips": ["<specific coaching tip 1>", "<specific coaching tip 2>", "<specific coaching tip 3>"],
  "overallScore": 0,
  "breakdown": { "technicalAccuracy": 0, "communication": 0, "problemSolving": 0 },
  "verdict": "Practice"
}`
    : `You are a senior software engineer conducting a technical interview.
Evaluate the candidate's answers and respond ONLY with this exact JSON — no markdown, no extra text:
{
  "overallScore": <integer 0-100>,
  "breakdown": {
    "technicalAccuracy": <integer 0-100>,
    "communication": <integer 0-100>,
    "problemSolving": <integer 0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area 1>", "<area 2>"],
  "tips": ["<actionable tip 1>", "<actionable tip 2>"],
  "verdict": "<one of: Strong Hire | Hire | No Hire>"
}`;

  const conversation = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: interviewQuestions || 'What are your strengths?|How do you handle stress?|Tell me about a challenging situation.',
    },
    { role: 'assistant', content: interviewAnswers },
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: conversation,
    max_tokens: 500,
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content;

  // Extract JSON object even if LLaMA prepends/appends stray text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const clean = jsonMatch ? jsonMatch[0] : '';

  try {
    return JSON.parse(clean);
  } catch {
    console.error('Failed to parse LLaMA JSON response:', raw);
    return {
      overallScore: 0,
      breakdown: { technicalAccuracy: 0, communication: 0, problemSolving: 0 },
      strengths: [],
      improvements: ['The AI response was malformed. Please try again.'],
      tips: [],
      verdict: 'No Hire',
      rawResponse: raw,
    };
  }
}

// ── Core: Generate Role-Specific Questions ────────────────────
async function generateQuestions(role, difficulty) {
  const groq = new Groq({ apiKey: KEY });

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: 'system',
        content: `You are an expert technical interviewer. Respond ONLY with a JSON array of exactly 5 strings — no markdown, no explanation:
["<question 1>", "<question 2>", "<question 3>", "<question 4>", "<question 5>"]`,
      },
      {
        role: 'user',
        content: `Generate 5 ${difficulty} interview questions for a ${role} position.`,
      },
    ],
    max_tokens: 400,
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content;
  const jsonMatch = raw.match(/\[[\s\S]*\]/); // extract array even if text surrounds it
  const clean = jsonMatch ? jsonMatch[0] : '';

  try {
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('Failed to parse questions JSON:', raw);
    return [
      'What are your strengths as a software engineer?',
      'How do you handle tight deadlines and pressure?',
      'Describe a challenging bug you fixed and how you diagnosed it.',
      'How do you approach learning a new technology or framework?',
      'Tell me about a time you disagreed with a teammate and how you resolved it.',
    ];
  }
}

// ── Start Server ──────────────────────────────────────────────
const port = 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`  POST /upload              — evaluate interview answers`);
  console.log(`  POST /generate-questions  — generate role-specific questions`);
});