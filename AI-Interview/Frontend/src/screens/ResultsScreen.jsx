import {
  Box, VStack, HStack, Text, Button, Badge, Heading,
  Divider, SimpleGrid, CircularProgress, CircularProgressLabel,
  Spinner, Tag, TagLabel, Wrap, WrapItem, Progress,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { VERDICT_COLOR } from '../constants';

const MotionBox = motion(Box);

const LABEL_COLOR = {
  'Excellent': 'green',
  'Good':      'cyan',
  'Fair':      'yellow',
  'Needs Work':'red',
};

// ── ResultsScreen ──────────────────────────────────────────────
// Day 5: fade-up transition, Practice Mode shows coaching view.
// New: per-question feedback cards + confidence score from sentiment.
export default function ResultsScreen({
  evaluation,
  isEvaluating,
  perQuestionFeedback,
  confidenceScores,
  questions,
  fillerCount,
  wordCount,
  practiceMode,
  onRestart,
  onViewHistory,
}) {
  const radarData = evaluation ? [
    { subject: 'Technical',       value: evaluation.breakdown?.technicalAccuracy ?? 0 },
    { subject: 'Communication',   value: evaluation.breakdown?.communication ?? 0 },
    { subject: 'Problem Solving', value: evaluation.breakdown?.problemSolving ?? 0 },
  ] : [];

  // Average confidence across all answers
  const avgConfidence = confidenceScores?.length
    ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
    : null;

  // Sort per-question feedback by questionIdx so cards are in order
  const sortedFeedback = [...(perQuestionFeedback ?? [])].sort((a, b) => a.questionIdx - b.questionIdx);

  return (
    <MotionBox
      minH="100vh" bg="#0D1117" p={6}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <VStack spacing={6} maxW="800px" mx="auto">

        {/* Header */}
        <VStack spacing={1} textAlign="center" pt={4}>
          <Badge
            colorScheme={practiceMode ? 'cyan' : 'purple'}
            fontSize="xs" letterSpacing="widest" px={3} py={1}
          >
            {practiceMode ? 'PRACTICE FEEDBACK' : 'EVALUATION COMPLETE'}
          </Badge>
          <Heading fontSize="2xl" fontWeight="800">
            {practiceMode ? 'Your Coaching Report' : 'Your Interview Results'}
          </Heading>
        </VStack>

        {isEvaluating ? (
          <VStack spacing={4} py={16}>
            <Spinner size="xl" color="brand.500" thickness="3px" />
            <Text color="gray.400">
              {practiceMode ? 'Generating your coaching tips...' : 'LLaMA is evaluating your answers...'}
            </Text>
          </VStack>

        ) : evaluation ? (
          <>
            {/* ── PRACTICE MODE: coaching only, no scores ── */}
            {practiceMode ? (
              <>
                {/* Filler word summary */}
                <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="20px" p={6} w="100%">
                  <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest" mb={4}>SESSION SUMMARY</Text>
                  <HStack spacing={8} justify="center">
                    <VStack spacing={0}>
                      <Text fontSize="2xl" fontWeight="800" color={fillerCount > 5 ? 'orange.400' : 'green.400'}>
                        {fillerCount}
                      </Text>
                      <Text fontSize="xs" color="gray.400">Filler Words</Text>
                    </VStack>
                    <VStack spacing={0}>
                      <Text fontSize="2xl" fontWeight="800" color="brand.500">{wordCount}</Text>
                      <Text fontSize="xs" color="gray.400">Total Words</Text>
                    </VStack>
                    <VStack spacing={0}>
                      <Text fontSize="2xl" fontWeight="800" color="white">
                        {evaluation.tips?.length ?? 0}
                      </Text>
                      <Text fontSize="xs" color="gray.400">Tips for You</Text>
                    </VStack>
                  </HStack>
                </Box>

                {/* Strengths */}
                <Box bg="surface.100" border="1px solid" borderColor="green.900" borderRadius="20px" p={5} w="100%">
                  <Text fontSize="xs" fontWeight="700" color="green.400" letterSpacing="widest" mb={3}>✓ WHAT YOU DID WELL</Text>
                  <VStack align="stretch" spacing={2}>
                    {(evaluation.strengths ?? []).map((s, i) => (
                      <Text key={i} fontSize="sm" color="gray.300" lineHeight="1.6">• {s}</Text>
                    ))}
                  </VStack>
                </Box>

                {/* Areas to work on */}
                <Box bg="surface.100" border="1px solid" borderColor="orange.900" borderRadius="20px" p={5} w="100%">
                  <Text fontSize="xs" fontWeight="700" color="orange.400" letterSpacing="widest" mb={3}>↑ AREAS TO WORK ON</Text>
                  <VStack align="stretch" spacing={2}>
                    {(evaluation.improvements ?? []).map((s, i) => (
                      <Text key={i} fontSize="sm" color="gray.300" lineHeight="1.6">• {s}</Text>
                    ))}
                  </VStack>
                </Box>

                {/* Coaching tips */}
                <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="20px" p={5} w="100%">
                  <Text fontSize="xs" fontWeight="700" color="brand.500" letterSpacing="widest" mb={3}>✦ COACHING TIPS</Text>
                  <VStack align="stretch" spacing={3}>
                    {(evaluation.tips ?? []).map((tip, i) => (
                      <HStack key={i} spacing={3} align="flex-start">
                        <Box minW="20px" h="20px" borderRadius="full" bg="brand.500"
                          display="flex" alignItems="center" justifyContent="center"
                          fontSize="10px" fontWeight="800" color="#0D1117"
                        >
                          {i + 1}
                        </Box>
                        <Text fontSize="sm" color="gray.300" lineHeight="1.6">{tip}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </>

            ) : (
              /* ── INTERVIEW MODE: full scored results ── */
              <>
                {/* Score + Verdict */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                  <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="20px" p={6} textAlign="center">
                    <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest" mb={4}>OVERALL SCORE</Text>
                    <CircularProgress
                      value={evaluation.overallScore} size="120px" thickness="8px"
                      color={evaluation.overallScore >= 70 ? 'green.400' : evaluation.overallScore >= 50 ? 'yellow.400' : 'red.400'}
                      trackColor="surface.300"
                    >
                      <CircularProgressLabel fontSize="2xl" fontWeight="800">
                        {evaluation.overallScore}
                      </CircularProgressLabel>
                    </CircularProgress>
                  </Box>

                  <Box
                    bg="surface.100" border="1px solid" borderColor="surface.300"
                    borderRadius="20px" p={6} textAlign="center"
                    display="flex" flexDir="column" alignItems="center" justifyContent="center"
                  >
                    <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest" mb={4}>VERDICT</Text>
                    <Badge
                      colorScheme={VERDICT_COLOR[evaluation.verdict] ?? 'gray'}
                      fontSize="lg" px={5} py={2} borderRadius="10px" fontWeight="800"
                    >
                      {evaluation.verdict}
                    </Badge>
                    <Divider my={4} borderColor="surface.300" />
                    <HStack spacing={4} justify="center">
                      <VStack spacing={0}>
                        <Text fontSize="sm" fontWeight="800" color="brand.500">{fillerCount}</Text>
                        <Text fontSize="xs" color="gray.400">Filler Words</Text>
                      </VStack>
                      <VStack spacing={0}>
                        <Text fontSize="sm" fontWeight="800" color="brand.500">{wordCount}</Text>
                        <Text fontSize="xs" color="gray.400">Total Words</Text>
                      </VStack>
                    </HStack>
                  </Box>
                </SimpleGrid>

                {/* Per-question feedback cards */}
                {sortedFeedback.length > 0 && (
                  <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="20px" p={6} w="100%">
                    <HStack justify="space-between" mb={4}>
                      <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest">
                        PER-QUESTION BREAKDOWN
                      </Text>
                      {avgConfidence !== null && (
                        <HStack spacing={2}>
                          <Text fontSize="xs" color="gray.400">Avg Confidence</Text>
                          <Badge
                            colorScheme={avgConfidence >= 60 ? 'green' : avgConfidence >= 40 ? 'yellow' : 'red'}
                            fontSize="xs"
                          >
                            {avgConfidence}%
                          </Badge>
                        </HStack>
                      )}
                    </HStack>
                    <VStack spacing={3} align="stretch">
                      {sortedFeedback.map((fb, i) => (
                        <Box key={i} bg="surface.200" borderRadius="12px" p={4}>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="xs" color="gray.400" fontWeight="600" noOfLines={1} flex={1}>
                              Q{fb.questionIdx + 1}: {questions[fb.questionIdx]}
                            </Text>
                            <Badge
                              colorScheme={LABEL_COLOR[fb.label] ?? 'gray'}
                              fontSize="xs" ml={2} flexShrink={0}
                            >
                              {fb.label}
                            </Badge>
                          </HStack>
                          <Progress
                            value={fb.score} size="xs" borderRadius="full"
                            colorScheme={fb.score >= 70 ? 'green' : fb.score >= 50 ? 'yellow' : 'red'}
                            bg="surface.300" mb={2}
                          />
                          <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.400" fontStyle="italic">
                              {fb.oneLineFeedback}
                            </Text>
                            <Text fontSize="xs" fontWeight="700" color="brand.500">
                              {fb.score}/100
                            </Text>
                          </HStack>
                          {confidenceScores?.[fb.questionIdx] !== undefined && (
                            <Text fontSize="10px" color="gray.600" mt={1}>
                              Confidence: {confidenceScores[fb.questionIdx]}%
                            </Text>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Radar chart */}
                <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="20px" p={6} w="100%">
                  <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest" mb={4}>SKILL BREAKDOWN</Text>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#30363D" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <Radar dataKey="value" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.2} />
                      <Tooltip
                        contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  <SimpleGrid columns={3} spacing={3} mt={2}>
                    {Object.entries(evaluation.breakdown ?? {}).map(([key, val]) => (
                      <Box key={key} textAlign="center">
                        <Text fontSize="lg" fontWeight="800" color="brand.500">{val}</Text>
                        <Text fontSize="xs" color="gray.400" textTransform="capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                </Box>

                {/* Strengths + Improvements */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                  <Box bg="surface.100" border="1px solid" borderColor="green.900" borderRadius="20px" p={5}>
                    <Text fontSize="xs" fontWeight="700" color="green.400" letterSpacing="widest" mb={3}>✓ STRENGTHS</Text>
                    <VStack align="stretch" spacing={2}>
                      {(evaluation.strengths ?? []).map((s, i) => (
                        <Text key={i} fontSize="sm" color="gray.300" lineHeight="1.6">• {s}</Text>
                      ))}
                    </VStack>
                  </Box>
                  <Box bg="surface.100" border="1px solid" borderColor="orange.900" borderRadius="20px" p={5}>
                    <Text fontSize="xs" fontWeight="700" color="orange.400" letterSpacing="widest" mb={3}>↑ IMPROVEMENTS</Text>
                    <VStack align="stretch" spacing={2}>
                      {(evaluation.improvements ?? []).map((s, i) => (
                        <Text key={i} fontSize="sm" color="gray.300" lineHeight="1.6">• {s}</Text>
                      ))}
                    </VStack>
                  </Box>
                </SimpleGrid>

                {/* Tips */}
                <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="20px" p={5} w="100%">
                  <Text fontSize="xs" fontWeight="700" color="brand.500" letterSpacing="widest" mb={3}>✦ ACTIONABLE TIPS</Text>
                  <Wrap spacing={2}>
                    {(evaluation.tips ?? []).map((tip, i) => (
                      <WrapItem key={i}>
                        <Tag bg="surface.200" borderRadius="full" px={4} py={2}>
                          <TagLabel fontSize="sm" color="gray.300">{tip}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>
              </>
            )}

            {/* Actions — same for both modes */}
            <HStack spacing={3} mb={8}>
              <Button
                onClick={onRestart}
                bg="surface.200" border="1px solid" borderColor="surface.300"
                color="white" fontWeight="700" borderRadius="12px"
                _hover={{ bg: 'surface.300' }}
              >
                ↩ {practiceMode ? 'Practice Again' : 'New Interview'}
              </Button>
              <Button
                onClick={onViewHistory}
                bg="surface.200" border="1px solid" borderColor="brand.500"
                color="brand.500" fontWeight="700" borderRadius="12px"
                _hover={{ bg: 'surface.300' }}
              >
                📋 View History
              </Button>
            </HStack>
          </>

        ) : (
          <Text color="gray.400">No evaluation data available.</Text>
        )}

      </VStack>
    </MotionBox>
  );
}