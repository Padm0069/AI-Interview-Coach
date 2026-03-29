export const SCREEN = {
  SETUP:     'setup',
  INTERVIEW: 'interview',
  RESULTS:   'results',
  HISTORY:   'history',
};

export const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'right',
];

export const VERDICT_COLOR = {
  'Strong Hire': 'green',
  'Hire':        'blue',
  'No Hire':     'red',
};

export const VERDICT_EMOJI = {
  'Strong Hire': '🟢',
  'Hire':        '🔵',
  'No Hire':     '🔴',
};

export const INITIAL_AUDIO_STATE = {
  url: null, blob: null, chunks: null,
  duration: { h: 0, m: 0, s: 0 },
};

export const FALLBACK_QUESTIONS = [
  'What are your strengths as a software engineer?',
  'How do you handle tight deadlines and pressure?',
  'Describe a challenging bug you fixed and how you diagnosed it.',
  'How do you approach learning a new technology?',
  'Tell me about a time you disagreed with a teammate.',
];

// ── Demo scenarios for live presentation ─────────────────────
// Load any of these on the Setup screen to show a controlled demo.
export const DEMO_SCENARIOS = [
  {
    label: '💪 Strong Answer',
    description: 'Candidate gives detailed, structured responses',
    role: 'Software Engineer',
    difficulty: 'Mid-level',
    questions: [
      'Explain the difference between monolithic and microservices architecture.',
      'How do you ensure code quality in a team environment?',
      'Describe a time you optimised a slow system.',
      'How do you handle disagreements with senior engineers?',
      'Walk me through how you would design a URL shortener.',
    ],
  },
  {
    label: '😬 Weak Answer',
    description: 'Short, vague answers — good for showing "No Hire" verdict',
    role: 'Software Engineer',
    difficulty: 'Junior',
    questions: [
      'What is a REST API?',
      'What is the difference between a stack and a queue?',
      'What does Big O notation mean?',
      'How do you debug a bug you cannot reproduce?',
      'What version control system have you used?',
    ],
  },
  {
    label: '⚠️ Edge Case',
    description: 'Very short / silent answer — shows graceful error handling',
    role: 'Backend Engineer',
    difficulty: 'Senior',
    questions: [
      'Design a distributed rate limiter.',
      'How would you handle a database with 10 billion rows?',
      'Explain CAP theorem with a real example.',
      'How do you approach zero-downtime deployments?',
      'What is your strategy for debugging a production incident?',
    ],
  },
];