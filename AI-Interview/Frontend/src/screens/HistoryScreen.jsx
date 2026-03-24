import {
  Box, VStack, HStack, Text, Button, Badge, Heading,
  SimpleGrid, Divider,
} from '@chakra-ui/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { VERDICT_COLOR, VERDICT_EMOJI } from '../constants';

// ── HistoryScreen ──────────────────────────────────────────────
// Shows all past interview attempts saved in localStorage.
// Includes a score trend line chart and per-attempt cards
// so you can demo improvement over time.
export default function HistoryScreen({ history, onClear, onBack }) {
  // Build chart data — oldest first for left-to-right trend
  const chartData = [...history].reverse().map((h, i) => ({
    attempt: `#${i + 1}`,
    score: h.evaluation?.overallScore ?? 0,
  }));

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box minH="100vh" bg="#0D1117" p={6}>
      <VStack spacing={6} maxW="800px" mx="auto">

        {/* Header */}
        <HStack w="100%" justify="space-between" pt={4}>
          <VStack spacing={1} align="flex-start">
            <Badge colorScheme="cyan" fontSize="xs" letterSpacing="widest" px={3} py={1}>
              PAST SESSIONS
            </Badge>
            <Heading fontSize="2xl" fontWeight="800">Interview History</Heading>
          </VStack>
          <HStack spacing={3}>
            {history.length > 0 && (
              <Button
                size="sm" onClick={onClear}
                bg="transparent" border="1px solid" borderColor="red.800"
                color="red.400" fontWeight="600" borderRadius="8px"
                _hover={{ bg: 'red.900' }}
              >
                Clear All
              </Button>
            )}
            <Button
              size="sm" onClick={onBack}
              bg="surface.200" border="1px solid" borderColor="surface.300"
              color="white" fontWeight="600" borderRadius="8px"
              _hover={{ bg: 'surface.300' }}
            >
              ← Back
            </Button>
          </HStack>
        </HStack>

        {history.length === 0 ? (
          <Box
            bg="surface.100" border="1px solid" borderColor="surface.300"
            borderRadius="20px" p={12} w="100%" textAlign="center"
          >
            <Text fontSize="3xl" mb={3}>🎙️</Text>
            <Text color="gray.400" fontSize="md">No interviews recorded yet.</Text>
            <Text color="gray.600" fontSize="sm" mt={1}>Complete your first interview to see history here.</Text>
          </Box>
        ) : (
          <>
            {/* Score trend chart */}
            <Box bg="surface.100" border="1px solid" borderColor="surface.300" borderRadius="20px" p={6} w="100%">
              <Text fontSize="xs" fontWeight="700" color="gray.400" letterSpacing="widest" mb={4}>
                SCORE TREND
              </Text>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#30363D" strokeDasharray="3 3" />
                  <XAxis dataKey="attempt" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone" dataKey="score" stroke="#00E5FF"
                    strokeWidth={2} dot={{ fill: '#00E5FF', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* Attempt cards */}
            <VStack spacing={4} w="100%">
              {history.map((attempt) => (
                <Box
                  key={attempt.id}
                  bg="surface.100" border="1px solid" borderColor="surface.300"
                  borderRadius="16px" p={5} w="100%"
                >
                  {/* Top row: role + date + verdict */}
                  <HStack justify="space-between" mb={3}>
                    <VStack spacing={0} align="flex-start">
                      <HStack spacing={2}>
                        <Text fontWeight="700" fontSize="sm">{attempt.role}</Text>
                        <Badge colorScheme="gray" fontSize="xs">{attempt.difficulty}</Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">{formatDate(attempt.date)}</Text>
                    </VStack>
                    <HStack spacing={3}>
                      <Text fontSize="xs" color="gray.400">
                        {VERDICT_EMOJI[attempt.evaluation?.verdict]} {' '}
                        <Badge colorScheme={VERDICT_COLOR[attempt.evaluation?.verdict] ?? 'gray'} fontSize="xs">
                          {attempt.evaluation?.verdict ?? 'N/A'}
                        </Badge>
                      </Text>
                    </HStack>
                  </HStack>

                  <Divider borderColor="surface.300" mb={3} />

                  {/* Score breakdown */}
                  <SimpleGrid columns={5} spacing={2} textAlign="center">
                    <VStack spacing={0}>
                      <Text fontSize="lg" fontWeight="800" color="brand.500">
                        {attempt.evaluation?.overallScore ?? '—'}
                      </Text>
                      <Text fontSize="10px" color="gray.500">Overall</Text>
                    </VStack>
                    <VStack spacing={0}>
                      <Text fontSize="lg" fontWeight="700" color="gray.300">
                        {attempt.evaluation?.breakdown?.technicalAccuracy ?? '—'}
                      </Text>
                      <Text fontSize="10px" color="gray.500">Technical</Text>
                    </VStack>
                    <VStack spacing={0}>
                      <Text fontSize="lg" fontWeight="700" color="gray.300">
                        {attempt.evaluation?.breakdown?.communication ?? '—'}
                      </Text>
                      <Text fontSize="10px" color="gray.500">Comms</Text>
                    </VStack>
                    <VStack spacing={0}>
                      <Text fontSize="lg" fontWeight="700" color="gray.300">
                        {attempt.evaluation?.breakdown?.problemSolving ?? '—'}
                      </Text>
                      <Text fontSize="10px" color="gray.500">Problem Solving</Text>
                    </VStack>
                    <VStack spacing={0}>
                      <Text fontSize="lg" fontWeight="700" color="gray.300">
                        {attempt.fillerCount ?? 0}
                      </Text>
                      <Text fontSize="10px" color="gray.500">Fillers</Text>
                    </VStack>
                  </SimpleGrid>
                </Box>
              ))}
            </VStack>
          </>
        )}

      </VStack>
    </Box>
  );
}