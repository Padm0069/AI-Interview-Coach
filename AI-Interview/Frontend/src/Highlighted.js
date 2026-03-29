import { Box, Text, Tooltip } from '@chakra-ui/react';

const sentimentColor = {
  POSITIVE: 'Lightgreen',
  NEGATIVE: 'pink',
  NEUTRAL: 'Lightgray',
};

export default function Highlighted({ text, sentiment, entities }) {
  const entityText = entities.map(e => e.text);
  const parts = text.split(new RegExp('(${entityText.join(' | ')})', 'g'));

  return (
    <Box width={1000} as="mark" bg="transparent" color="white" fontSize='4xl' mr="1">
      {parts.map(part => {
        const matchingEntity = entities.find(e => e.text === part);

        if (matchingEntity) {
          return (
            <Tooltip label={matchingEntity.entity_type} key={part}>
              <Text display="inline" fontSize="6xl" fontWeight="bold">
                {part}
              </Text>
            </Tooltip>
          );
        }

        return part;
      })}
    </Box>
  );
}
