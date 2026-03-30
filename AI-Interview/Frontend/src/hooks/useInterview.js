import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import axios from 'axios';
import { SCREEN, FILLER_WORDS, INITIAL_AUDIO_STATE, FALLBACK_QUESTIONS } from '../constants';
import { assemblyApi } from './useAssemblyAI';

// ── useInterview ───────────────────────────────────────────────
// Central hook that owns ALL app state and business logic.
// Day 3: saves attempts to history. Day 4: mic check, silence detection, retry.
// Day 5: practiceMode changes the evaluation prompt to coaching-only.
export function useInterview({ saveAttempt, practiceMode = false }) {
  // ── Screen routing ────────────────────────────────────────────
  const [screen, setScreen] = useState(SCREEN.SETUP);

  // ── Setup state ───────────────────────────────────────────────
  const [role, setRole] = useState('Software Engineer');
  const [difficulty, setDifficulty] = useState('Mid-level');
  const [questions, setQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Interview state ───────────────────────────────────────────
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [audioDetails, setAudioDetails] = useState(INITIAL_AUDIO_STATE);
  const [transcript, setTranscript] = useState({ id: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [textData, setTextData] = useState('');
  const [fillerCount, setFillerCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [recorderKey, setRecorderKey] = useState(0); // Force recorder remount when needed

  // ── Per-question feedback & confidence ────────────────────────
  // perQuestionFeedback: array of { questionIdx, score, label, oneLineFeedback }
  // confidenceScores: array of numbers (0-100) per answer, from AssemblyAI sentiment
  const [perQuestionFeedback, setPerQuestionFeedback] = useState([]);
  const [confidenceScores, setConfidenceScores] = useState([]);

  // ── Day 4: silence detection state ───────────────────────────
  // Tracks seconds of no-recording to warn the user if they go quiet
  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const [showSilenceWarning, setShowSilenceWarning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // ── Evaluation state ──────────────────────────────────────────
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────
  const allAnswersRef = useRef([]);
  const processedTextRef = useRef('');
  const currentQuestionIdxRef = useRef(0);
  const questionsRef = useRef([]);
  const roleRef = useRef('Software Engineer');
  const difficultyRef = useRef('Mid-level');
  const timerRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const toast = useToast();

  // Keep refs in sync with state
  useEffect(() => { currentQuestionIdxRef.current = currentQuestionIdx; }, [currentQuestionIdx]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // ── Day 4: Silence detection ──────────────────────────────────
  // Shows a nudge after 10s of inactivity on the interview screen.
  // Clears if: recording is active, audio is loading/transcribing,
  // OR the user has already recorded something (blob exists).
  useEffect(() => {
    if (screen !== SCREEN.INTERVIEW) {
      clearInterval(silenceTimerRef.current);
      setSilenceSeconds(0);
      setShowSilenceWarning(false);
      return;
    }

    // If they're recording, uploading, or have already recorded — no warning
    if (isRecording || isLoading || audioDetails.blob) {
      clearInterval(silenceTimerRef.current);
      setSilenceSeconds(0);
      setShowSilenceWarning(false);
      return;
    }

    silenceTimerRef.current = setInterval(() => {
      setSilenceSeconds(s => {
        const next = s + 1;
        if (next >= 10) setShowSilenceWarning(true);
        return next;
      });
    }, 1000);

    return () => clearInterval(silenceTimerRef.current);
  }, [screen, isRecording, isLoading, audioDetails]);

  // ── AssemblyAI polling ────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      if (transcript.id && transcript.status !== 'completed' && isLoading) {
        try {
          const { data } = await assemblyApi.get(`/transcript/${transcript.id}`);
          setTranscript(t => ({ ...t, ...data }));
        } catch (err) {
          console.error('Polling error:', err);
          toast({ title: 'Transcription polling failed', status: 'error', duration: 3000 });
        }
      } else {
        setIsLoading(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading, transcript]);

  // ── Process transcript once per answer ────────────────────────
  useEffect(() => {
    if (!textData) return;
    if (textData === processedTextRef.current) return;
    processedTextRef.current = textData;

    const lower = textData.toLowerCase();
    setFillerCount(fc => fc + FILLER_WORDS.filter(w => lower.includes(w)).length);
    setWordCount(wc => wc + textData.trim().split(/\s+/).filter(Boolean).length);

    const updatedAnswers = [...allAnswersRef.current, textData];
    allAnswersRef.current = updatedAnswers;

    const isLast = currentQuestionIdxRef.current >= questionsRef.current.length - 1;

    // ── Fire per-question evaluation (non-blocking, staggered) ──
    // Each call is delayed by questionIdx * 1500ms to avoid all 5
    // hitting Groq simultaneously and triggering rate limit errors.
    // Last question gets extra delay since main /upload fires at the same time.
    const qIdx = currentQuestionIdxRef.current;
    const currentQ = questionsRef.current[qIdx];
    const isLastQ = qIdx >= questionsRef.current.length - 1;
    const delay = isLastQ ? 8000 : qIdx * 1500; // last Q waits for main eval to finish
    setTimeout(() => {
      axios.post('http://localhost:8080/api/evaluate-answer', {
        answer: textData,
        question: currentQ,
        questionIdx: qIdx,
      }).then(({ data }) => {
        setPerQuestionFeedback(prev => [...prev, data]);
      }).catch(err => console.warn('Per-question eval failed:', err));
    }, delay);

    if (isLast) {
      runEvaluation(updatedAnswers);
    } else {
      setCurrentQuestionIdx(i => i + 1);
      setAudioDetails(INITIAL_AUDIO_STATE);
      setTranscript({ id: '' });
      setTextData('');
      setIsRecording(false);
      setSilenceSeconds(0);
      setShowSilenceWarning(false);
      setRecorderKey(k => k + 1); // Force recorder remount for clean state
    }
  }, [textData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────

  // ── Called by Result.js after each transcription ─────────────
  // Appends the confidence score for the current question to the array.
  const handleSetConfidenceScore = (score) => {
    setConfidenceScores(prev => [...prev, score]);
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    try {
      const { data } = await axios.post('http://localhost:8080/api/generate-questions', { role, difficulty });
      setQuestions(data.questions);
      toast({ title: '5 questions generated!', status: 'success', duration: 2000 });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Failed to generate questions',
        description: 'Is the backend running? Using fallback questions.',
        status: 'warning',
        duration: 4000,
      });
      setQuestions(FALLBACK_QUESTIONS);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartInterview = async () => {
    if (questions.length === 0) {
      toast({ title: 'Please generate questions first', status: 'warning', duration: 2000 });
      return;
    }

    // ── Day 4: mic permission check before starting ───────────
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access in your browser settings and try again.',
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
      return;
    }

    allAnswersRef.current = [];
    processedTextRef.current = '';
    currentQuestionIdxRef.current = 0;
    setCurrentQuestionIdx(0);
    setFillerCount(0);
    setWordCount(0);
    setTimer(0);
    setTextData('');
    setTranscript({ id: '' });
    setAudioDetails(INITIAL_AUDIO_STATE);
    setIsRecording(false);
    setSilenceSeconds(0);
    setShowSilenceWarning(false);
    setPerQuestionFeedback([]);
    setConfidenceScores([]);
    setScreen(SCREEN.INTERVIEW);
  };

  const handleAudioStop = (data) => {
    setAudioDetails(data);
    setTimerRunning(false);
    setIsRecording(false);
    // Recording stopped means they spoke — dismiss the silence warning
    setSilenceSeconds(0);
    setShowSilenceWarning(false);
  };

  const handleAudioUpload = async () => {
    // Prevent multiple simultaneous uploads
    if (isLoading) {
      console.log('Upload already in progress, ignoring duplicate click');
      return;
    }

    // Check if there's actually audio to upload
    if (!audioDetails.blob) {
      toast({ 
        title: 'No audio recorded', 
        description: 'Please record your answer first.',
        status: 'warning', 
        duration: 2000 
      });
      return;
    }

    setIsLoading(true);
    setTimerRunning(false);
    setIsRecording(false);
    setShowSilenceWarning(false);

    try {
      // Send audio as multipart/form-data — the Spring Boot backend
      // receives it as MultipartFile and proxies it to AssemblyAI.
      const formData = new FormData();
      formData.append('audio', audioDetails.blob, 'recording.webm');
      const { data: uploadResponse } = await assemblyApi.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { data } = await assemblyApi.post('/transcript', {
        upload_url: uploadResponse.upload_url,
      });
      setTranscript({ id: data.id });
    } catch (err) {
      console.error(err);
      setIsLoading(false);

      // ── Day 4: differentiate error types for better UX ────────
      if (err.response?.status === 401) {
        toast({ title: 'Invalid AssemblyAI key', description: 'Check REACT_APP_ASSEMBLY_API_KEY in your .env file.', status: 'error', duration: 6000 });
      } else if (err.response?.status === 429) {
        toast({ title: 'AssemblyAI rate limit hit', description: 'Please wait a moment and try again.', status: 'warning', duration: 5000 });
      } else {
        toast({ title: 'Audio upload failed', description: 'Check your AssemblyAI key and internet connection.', status: 'error', duration: 4000 });
      }
    }
  };

  const handleReset = () => {
    setAudioDetails(INITIAL_AUDIO_STATE);
    setTranscript({ id: '' });
    setTextData('');
    processedTextRef.current = '';
    setTimer(0);
    setIsRecording(false);
    setSilenceSeconds(0);
    setShowSilenceWarning(false);
  };

  const handleRecordingStart = () => {
    setIsRecording(true);
    setShowSilenceWarning(false);
    setSilenceSeconds(0);
  };

  const handleRestartInterview = () => {
    setScreen(SCREEN.SETUP);
    setEvaluation(null);
    setQuestions([]);
    allAnswersRef.current = [];
    processedTextRef.current = '';
    setFillerCount(0);
    setWordCount(0);
    setIsRecording(false);
    setSilenceSeconds(0);
    setShowSilenceWarning(false);
    setPerQuestionFeedback([]);
    setConfidenceScores([]);
  };

  // ── Day 4: retry logic for Groq rate limits ───────────────────
  const callWithRetry = async (fn, retries = 3, delayMs = 6000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        const isRateLimit = err.response?.status === 429 || err.message?.includes('rate_limit');
        if (isRateLimit && i < retries - 1) {
          toast({
            title: `Groq rate limit — retrying in ${delayMs / 1000}s... (attempt ${i + 2}/${retries})`,
            status: 'warning',
            duration: delayMs - 500,
          });
          await new Promise(res => setTimeout(res, delayMs));
        } else {
          throw err;
        }
      }
    }
  };

  const runEvaluation = async (answers) => {
    setIsEvaluating(true);
    setScreen(SCREEN.RESULTS);
    try {
      const trimmed = answers.slice(0, 5);

      // Wrap the axios call in retry logic for 429s
      // practiceMode flag tells the backend to use a coaching prompt instead of scoring
      const { data } = await callWithRetry(() =>
        axios.post('http://localhost:8080/api/upload', {
          textData: trimmed.join(' | '),
          questions: questionsRef.current.slice(0, 5).join('|'),
          practiceMode,
        })
      );

      setEvaluation(data);

      // ── Day 3: save to history after successful evaluation ────
      saveAttempt({
        role: roleRef.current,
        difficulty: difficultyRef.current,
        evaluation: data,
        fillerCount,
        wordCount,
      });

    } catch (err) {
      console.error(err);
      if (err.response?.status === 429) {
        toast({
          title: 'Groq rate limit exceeded',
          description: 'Too many requests. Please wait ~1 minute and try again.',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      } else {
        toast({ title: 'Evaluation failed', description: 'Check the backend server.', status: 'error', duration: 4000 });
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatTimer = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return {
    // Screen
    screen,
    // Setup
    role, setRole,
    difficulty, setDifficulty,
    questions, setQuestions,   // setQuestions exposed for demo scenario loader
    isGenerating,
    handleGenerateQuestions,
    handleStartInterview,
    // Interview
    currentQuestionIdx,
    audioDetails,
    transcript,
    isLoading,
    textData, setTextData,
    fillerCount,
    wordCount,
    timer,
    timerRunning,
    formatTimer,
    handleAudioStop,
    handleAudioUpload,
    handleReset,
    handleRecordingStart,
    showSilenceWarning,
    setConfidenceScore: handleSetConfidenceScore,
    recorderKey, // Key to force recorder remount
    // Results
    evaluation,
    isEvaluating,
    perQuestionFeedback,
    confidenceScores,
    handleRestartInterview,
  };
}
