import {
  Box, VStack, HStack, Text, Badge, SimpleGrid, Alert, AlertIcon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Recorder } from 'react-voice-recorder';
import 'react-voice-recorder/dist/index.css';
import Status from '../Status';
import Result from '../Result';

const MotionBox = motion(Box);

// ── InterviewScreen ────────────────────────────────────────────
// Day 5: slide-in transition on mount, practice mode badge.
export default function InterviewScreen({
  questions,
  currentQuestionIdx,
  audioDetails,
  transcript,
  isLoading,
  textData,
  setTextData,
  setConfidenceScore,
  fillerCount,
  timer,
  timerRunning,
  formatTimer,
  showSilenceWarning,
  practiceMode,
  onAudioStop,
  onAudioUpload,
  onReset,
}) {
  const currentQ = questions[currentQuestionIdx];

  return (
    <MotionBox
      minH="100vh" bg="#0D1117" p={6}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
    >
      <VStack spacing={6} maxW="700px" mx="auto">

        {/* Progress bar + timer + mode badge */}
        <HStack w="100%" justify="space-between">
          <HStack spacing={2}>
            {questions.map((_, i) => (
              <Box
                key={i} h="4px" w="32px" borderRadius="full"
                bg={i < currentQuestionIdx ? 'brand.500' : i === currentQuestionIdx ? 'white' : 'surface.300'}
                transition="background 0.3s"
              />
            ))}
          </HStack>
          <HStack spacing={3}>
            {practiceMode && (
              <Badge colorScheme="cyan" fontSize="xs" px={2} py={1} borderRadius="6px">
                PRACTICE
              </Badge>
            )}
            <Text fontSize="xs" color="gray.400" fontWeight="600">
              Q {currentQuestionIdx + 1} / {questions.length}
            </Text>
            <Badge
              colorScheme={timerRunning ? 'red' : 'gray'}
              fontSize="sm" px={3} py={1} borderRadius="8px" fontFamily="mono"
            >
              {formatTimer(timer)}
            </Badge>
          </HStack>
        </HStack>

        {/* Silence warning */}
        {showSilenceWarning && (
          <Alert status="warning" borderRadius="12px" bg="yellow.900" border="1px solid" borderColor="yellow.700">
            <AlertIcon />
            <Text fontSize="sm" color="yellow.200">
              Are you still there? Press record when you're ready to answer.
            </Text>
          </Alert>
        )}

        {/* Question card — slides in when question changes */}
        <MotionBox
          key={currentQuestionIdx}
          bg="surface.100" border="1px solid" borderColor="surface.300"
          borderRadius="20px" p={8} w="100%" position="relative" overflow="hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            position="absolute" top={0} left={0} right={0} h="3px"
            bgGradient="linear(to-r, brand.500, transparent)" borderTopRadius="20px"
          />
          <Text fontSize="xs" fontWeight="700" color="brand.500" letterSpacing="widest" mb={3}>
            {practiceMode ? 'PRACTICE QUESTION' : 'QUESTION'} {currentQuestionIdx + 1}
          </Text>
          <Text fontSize="xl" fontWeight="600" lineHeight="1.6" color="white">
            {currentQ}
          </Text>
        </MotionBox>

        {/* Live stats */}
        <SimpleGrid columns={2} spacing={4} w="100%">
          <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="12px" p={4} textAlign="center">
            <Text fontSize="xl" fontWeight="800" color={fillerCount > 3 ? 'orange.400' : 'brand.500'}>
              {fillerCount}
            </Text>
            <Text fontSize="xs" color="gray.400" mt={1}>Filler Words (Total)</Text>
          </Box>
          <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="12px" p={4} textAlign="center">
            <Text fontSize="xl" fontWeight="800" color="white">
              {currentQuestionIdx + 1} / {questions.length}
            </Text>
            <Text fontSize="xs" color="gray.400" mt={1}>Questions Answered</Text>
          </Box>
        </SimpleGrid>

        {/* Transcript status / result */}
        <Box w="100%">
          {transcript.text && transcript.status === 'completed' ? (
            <Result
              setTextData={setTextData}
              setConfidenceScore={setConfidenceScore}
              transcript={transcript}
            />
          ) : (
            <Status isLoading={isLoading} status={transcript.status} />
          )}
        </Box>

        {/* Recorder */}
        <Box w="100%" bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="16px" p={4}>
          <Recorder
            record={true}
            audioURL={audioDetails.url}
            handleAudioStop={onAudioStop}
            handleAudioUpload={onAudioUpload}
            handleReset={onReset}
          />
        </Box>

      </VStack>
    </MotionBox>
  );
}