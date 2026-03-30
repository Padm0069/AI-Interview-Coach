import React, { useEffect } from 'react';
import { Text } from '@chakra-ui/react';
import Highlighted from './Highlighted';

// ── Result ─────────────────────────────────────────────────────
// Renders the transcript with entity highlighting.
// Computes a confidence score from AssemblyAI sentiment data
// (% of POSITIVE sentences) — no extra API call needed.
// Passes both fullText and confidenceScore up to the parent.
export default function Result({ setTextData, setConfidenceScore, transcript }) {

  const fullText = transcript.sentiment_analysis_results?.length
    ? transcript.sentiment_analysis_results.map(r => r.text).join(' ')
    : transcript.text ?? '';

  // POSITIVE sentences / total sentences × 100
  const computeConfidence = () => {
    const results = transcript.sentiment_analysis_results;
    if (!results?.length) return null;
    const positive = results.filter(r => r.sentiment === 'POSITIVE').length;
    return Math.round((positive / results.length) * 100);
  };

  useEffect(() => {
    if (!fullText) return;
    setTextData(fullText);
    const score = computeConfidence();
    if (score !== null && setConfidenceScore) {
      setConfidenceScore(score);
    }
  }, [fullText]); // re-run when transcript text is ready

  return (
    <div>
      <Text>
        <Highlighted
          text={fullText}
          sentiment="FULL_TEXT"
          entities={transcript.entities ?? []}
        />
      </Text>
    </div>
  );
}
