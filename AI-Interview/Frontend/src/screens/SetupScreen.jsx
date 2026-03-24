import { useState } from 'react';
import {
  Box, VStack, HStack, Text, Button, Select, Badge, Heading,
  Switch, FormLabel, Collapse, Tooltip,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_SCENARIOS } from '../constants';

const MotionBox = motion(Box);

// ── SetupScreen ────────────────────────────────────────────────
// Day 5 additions:
// - Framer Motion fade-in on mount
// - Practice Mode toggle (coaching only, no scores)
// - Demo Scenario loader for live presentation
export default function SetupScreen({
  role, setRole,
  difficulty, setDifficulty,
  questions,
  isGenerating,
  historyCount,
  practiceMode,
  setPracticeMode,
  onGenerateQuestions,
  onStartInterview,
  onLoadScenario,
  onViewHistory,
}) {
  const [showDemos, setShowDemos] = useState(false);

  return (
    <MotionBox
      minH="100vh" bg="#0D1117"
      display="flex" alignItems="center" justifyContent="center" p={8}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <VStack spacing={8} maxW="520px" w="100%">

        {/* Top bar */}
        <HStack w="100%" justify="space-between">
          <Button
            size="sm" onClick={() => setShowDemos(v => !v)}
            bg="surface.200" border="1px solid" borderColor="surface.300"
            color="gray.300" fontWeight="600" borderRadius="8px"
            _hover={{ bg: 'surface.300' }}
          >
            🎬 Demo Scenarios
          </Button>
          <Button
            size="sm" onClick={onViewHistory}
            bg="surface.200" border="1px solid" borderColor="surface.300"
            color="gray.300" fontWeight="600" borderRadius="8px"
            _hover={{ bg: 'surface.300' }}
          >
            📋 History {historyCount > 0 && `(${historyCount})`}
          </Button>
        </HStack>

        {/* Demo scenario cards — collapsible */}
        <AnimatePresence>
          {showDemos && (
            <MotionBox
              w="100%"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              overflow="hidden"
            >
              <Box bg="surface.100" border="1px dashed" borderColor="brand.500" borderRadius="16px" p={5}>
                <Text fontSize="xs" fontWeight="700" color="brand.500" letterSpacing="widest" mb={3}>
                  DEMO SCENARIOS — click to load
                </Text>
                <VStack spacing={3} align="stretch">
                  {DEMO_SCENARIOS.map((scenario, i) => (
                    <Box
                      key={i}
                      bg="surface.200" borderRadius="10px" p={4}
                      border="1px solid" borderColor="surface.300"
                      cursor="pointer"
                      _hover={{ borderColor: 'brand.500', bg: 'surface.300' }}
                      transition="all 0.2s"
                      onClick={() => { onLoadScenario(scenario); setShowDemos(false); }}
                    >
                      <Text fontSize="sm" fontWeight="700">{scenario.label}</Text>
                      <Text fontSize="xs" color="gray.400" mt={1}>{scenario.description}</Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            </MotionBox>
          )}
        </AnimatePresence>

        {/* Header */}
        <VStack spacing={2} textAlign="center">
          <Badge colorScheme="cyan" fontSize="xs" letterSpacing="widest" px={3} py={1}>
            AI INTERVIEW COACH
          </Badge>
          <Heading fontSize="3xl" fontWeight="800" letterSpacing="-0.5px">
            Configure Your Interview
          </Heading>
          <Text color="gray.400" fontSize="sm">
            Select your role and difficulty, then generate tailored questions powered by LLaMA 3.3
          </Text>
        </VStack>

        {/* Config card */}
        <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="16px" p={6} w="100%">
          <VStack spacing={5}>

            <Box w="100%">
              <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest" mb={2}>ROLE</Text>
              <Select
                value={role} onChange={e => setRole(e.target.value)}
                bg="surface.200" border="1px solid" borderColor="surface.300"
                _focus={{ borderColor: 'brand.500' }} borderRadius="10px"
              >
                <option value="Software Engineer">Software Engineer</option>
                <option value="Frontend Engineer">Frontend Engineer</option>
                <option value="Backend Engineer">Backend Engineer</option>
                <option value="Full Stack Engineer">Full Stack Engineer</option>
                <option value="DevOps Engineer">DevOps Engineer</option>
                <option value="Data Engineer">Data Engineer</option>
              </Select>
            </Box>

            <Box w="100%">
              <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest" mb={2}>DIFFICULTY</Text>
              <HStack spacing={3}>
                {['Junior', 'Mid-level', 'Senior'].map(d => (
                  <Button
                    key={d} flex={1} size="sm"
                    onClick={() => setDifficulty(d)}
                    bg={difficulty === d ? 'brand.500' : 'surface.200'}
                    color={difficulty === d ? '#0D1117' : 'gray.300'}
                    fontWeight="700" borderRadius="8px" border="1px solid"
                    borderColor={difficulty === d ? 'brand.500' : 'surface.300'}
                    _hover={{ bg: difficulty === d ? 'brand.600' : 'surface.300' }}
                  >
                    {d}
                  </Button>
                ))}
              </HStack>
            </Box>

            {/* Practice Mode toggle */}
            <HStack w="100%" justify="space-between"
              bg="surface.200" p={3} borderRadius="10px"
              border="1px solid" borderColor={practiceMode ? 'brand.500' : 'surface.300'}
              transition="border-color 0.2s"
            >
              <VStack spacing={0} align="flex-start">
                <FormLabel htmlFor="practice-mode" mb={0} fontSize="sm" fontWeight="700" color="white">
                  Practice Mode
                </FormLabel>
                <Text fontSize="xs" color="gray.400">Coaching tips only — no scores or verdict</Text>
              </VStack>
              <Tooltip label="In practice mode, LLaMA gives coaching feedback without scores — great for casual prep" placement="top">
                <Switch
                  id="practice-mode"
                  isChecked={practiceMode}
                  onChange={e => setPracticeMode(e.target.checked)}
                  colorScheme="cyan"
                  size="md"
                />
              </Tooltip>
            </HStack>

            <Button
              w="100%" onClick={onGenerateQuestions}
              isLoading={isGenerating} loadingText="Generating with LLaMA..."
              bg="surface.200" border="1px dashed" borderColor="brand.500"
              color="brand.500" fontWeight="700" borderRadius="10px"
              _hover={{ bg: 'surface.300' }}
            >
              ✦ Generate Questions with AI
            </Button>
          </VStack>
        </Box>

        {/* Generated questions preview */}
        {questions.length > 0 && (
          <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="16px" p={6} w="100%">
            <HStack justify="space-between" mb={4}>
              <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest">
                GENERATED QUESTIONS
              </Text>
              {practiceMode && (
                <Badge colorScheme="cyan" fontSize="xs">PRACTICE MODE</Badge>
              )}
            </HStack>
            <VStack spacing={3} align="stretch">
              {questions.map((q, i) => (
                <HStack key={i} spacing={3} align="flex-start">
                  <Box
                    minW="22px" h="22px" borderRadius="full" bg="brand.500"
                    display="flex" alignItems="center" justifyContent="center"
                    fontSize="10px" fontWeight="800" color="#0D1117"
                  >
                    {i + 1}
                  </Box>
                  <Text fontSize="sm" color="gray.300" lineHeight="1.6">{q}</Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        <Button
          w="100%" size="lg" onClick={onStartInterview}
          bg="brand.500" color="#0D1117" fontWeight="800"
          borderRadius="12px" fontSize="md" h="52px"
          _hover={{ bg: 'brand.600', transform: 'translateY(-1px)' }}
          transition="all 0.2s" isDisabled={questions.length === 0}
        >
          {practiceMode ? '🎯 Start Practice Session →' : 'Start Interview →'}
        </Button>

      </VStack>
    </MotionBox>
  );
}