import { Box } from '@chakra-ui/react';
import { Recorder } from 'react-voice-recorder';
import 'react-voice-recorder/dist/index.css';

// ── AudioRecorder ──────────────────────────────────────────────
// Wrapper around react-voice-recorder that adds:
// 1. Disabled state to prevent multiple simultaneous uploads
// 2. Visual feedback when upload is in progress
export default function AudioRecorder({
  audioURL,
  isUploading = false,
  onAudioStop,
  onAudioUpload,
  onReset,
}) {
  // Intercept upload to prevent duplicate clicks
  const handleUpload = (data) => {
    if (isUploading) {
      console.log('Upload already in progress, ignoring click');
      return;
    }
    onAudioUpload(data);
  };

  return (
    <Box
      w="100%"
      position="relative"
      // Add opacity and pointer-events styling when uploading
      opacity={isUploading ? 0.6 : 1}
      pointerEvents={isUploading ? 'none' : 'auto'}
      transition="opacity 0.2s"
    >
      <Recorder
        record={true}
        audioURL={audioURL}
        handleAudioStop={onAudioStop}
        handleAudioUpload={handleUpload}
        handleReset={onReset}
      />
      {isUploading && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          fontSize="sm"
          color="brand.500"
          fontWeight="600"
          pointerEvents="none"
          zIndex={10}
        >
          Processing...
        </Box>
      )}
    </Box>
  );
}
