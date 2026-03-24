import { ChakraProvider } from '@chakra-ui/react';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import theme from './theme';
import { SCREEN } from './constants';
import { useInterview } from './hooks/useInterview';
import { useHistory } from './hooks/useHistory';
import SetupScreen from './screens/SetupScreen';
import InterviewScreen from './screens/InterviewScreen';
import ResultsScreen from './screens/ResultsScreen';
import HistoryScreen from './screens/HistoryScreen';

// ── App ────────────────────────────────────────────────────────
// Entry point. All logic lives in useInterview() and useHistory().
// Day 5: practiceMode state lives here so it's accessible to both
// SetupScreen (toggle) and ResultsScreen (changes the display).
function App() {
  const { history, saveAttempt, clearHistory } = useHistory();
  const [practiceMode, setPracticeMode] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const interview = useInterview({ saveAttempt, practiceMode });

  // ── Load a demo scenario directly into setup state ────────────
  const handleLoadScenario = (scenario) => {
    interview.setRole(scenario.role);
    interview.setDifficulty(scenario.difficulty);
    interview.setQuestions(scenario.questions);
  };

  const screens = {
    [SCREEN.SETUP]: (
      <SetupScreen
        role={interview.role}
        setRole={interview.setRole}
        difficulty={interview.difficulty}
        setDifficulty={interview.setDifficulty}
        questions={interview.questions}
        isGenerating={interview.isGenerating}
        historyCount={history.length}
        practiceMode={practiceMode}
        setPracticeMode={setPracticeMode}
        onGenerateQuestions={interview.handleGenerateQuestions}
        onStartInterview={interview.handleStartInterview}
        onLoadScenario={handleLoadScenario}
        onViewHistory={() => setHistoryVisible(true)}
      />
    ),
    [SCREEN.INTERVIEW]: (
      <InterviewScreen
        questions={interview.questions}
        currentQuestionIdx={interview.currentQuestionIdx}
        audioDetails={interview.audioDetails}
        transcript={interview.transcript}
        isLoading={interview.isLoading}
        textData={interview.textData}
        setTextData={interview.setTextData}
        setConfidenceScore={interview.setConfidenceScore}
        fillerCount={interview.fillerCount}
        timer={interview.timer}
        timerRunning={interview.timerRunning}
        formatTimer={interview.formatTimer}
        showSilenceWarning={interview.showSilenceWarning}
        practiceMode={practiceMode}
        onAudioStop={interview.handleAudioStop}
        onAudioUpload={interview.handleAudioUpload}
        onReset={interview.handleReset}
      />
    ),
    [SCREEN.RESULTS]: (
      <ResultsScreen
        evaluation={interview.evaluation}
        isEvaluating={interview.isEvaluating}
        perQuestionFeedback={interview.perQuestionFeedback}
        confidenceScores={interview.confidenceScores}
        questions={interview.questions}
        fillerCount={interview.fillerCount}
        wordCount={interview.wordCount}
        practiceMode={practiceMode}
        onRestart={interview.handleRestartInterview}
        onViewHistory={() => setHistoryVisible(true)}
      />
    ),
  };

  return (
    <ChakraProvider theme={theme}>
      <AnimatePresence mode="wait">
        {historyVisible ? (
          <HistoryScreen
            key="history"
            history={history}
            onClear={clearHistory}
            onBack={() => setHistoryVisible(false)}
          />
        ) : (
          // AnimatePresence key change triggers exit/enter animations
          <div key={interview.screen}>
            {screens[interview.screen]}
          </div>
        )}
      </AnimatePresence>
    </ChakraProvider>
  );
}

export default App;