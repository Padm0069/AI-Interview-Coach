package com.interview.coach.controller;

import com.interview.coach.service.AssemblyAIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * REST controller that proxies AssemblyAI calls through our server.
 *
 * Why proxy instead of calling AssemblyAI directly from the browser?
 * → API key security. REACT_APP_* variables are bundled in the JS build
 *   and visible in browser DevTools — anyone can steal the key. Routing
 *   through Spring Boot keeps the key server-side only.
 *
 * Endpoints:
 *   POST /api/assembly/upload          → upload audio, returns { upload_url }
 *   POST /api/assembly/transcript      → submit transcription job, returns { id }
 *   GET  /api/assembly/transcript/{id} → poll status, returns full transcript object
 *
 * The frontend still does the polling loop — we just proxy each individual
 * GET call so the browser never needs the AssemblyAI key.
 */
@Slf4j
@RestController
@RequestMapping("/api/assembly")
@RequiredArgsConstructor
public class AssemblyAIController {

    private final AssemblyAIService assemblyAIService;

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/assembly/upload
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Receives the audio file from the React frontend (as multipart form data)
     * and uploads the raw bytes to AssemblyAI.
     *
     * The frontend records audio with the browser's MediaRecorder API and sends
     * the resulting Blob as a multipart field named "audio".
     *
     * Returns: { "upload_url": "https://cdn.assemblyai.com/..." }
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadAudio(
            @RequestParam("audio") MultipartFile audioFile) throws IOException {

        log.info("Received audio upload: size={}KB, contentType={}",
                audioFile.getSize() / 1024, audioFile.getContentType());

        String uploadUrl = assemblyAIService.uploadAudio(audioFile.getBytes());

        return ResponseEntity.ok(Map.of("upload_url", uploadUrl));
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/assembly/transcript
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Submits a transcription job to AssemblyAI with sentiment analysis
     * and entity detection enabled.
     *
     * Request body: { "upload_url": "https://cdn.assemblyai.com/..." }
     * Returns:      { "id": "abc123..." }
     */
    @PostMapping("/transcript")
    public ResponseEntity<Map<String, String>> submitTranscription(
            @RequestBody Map<String, String> body) {

        String uploadUrl = body.get("upload_url");
        if (uploadUrl == null || uploadUrl.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "upload_url is required"));
        }

        log.info("Submitting transcription for upload_url={}", uploadUrl);

        String transcriptId = assemblyAIService.submitTranscription(uploadUrl);
        return ResponseEntity.ok(Map.of("id", transcriptId));
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/assembly/transcript/{id}
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Polls AssemblyAI for transcript status. The React frontend calls this
     * every 1 second until status === "completed".
     *
     * Returns the full AssemblyAI transcript object, which includes:
     *   - status: "submitted" | "processing" | "completed" | "error"
     *   - text: the full transcript
     *   - sentiment_analysis_results: array of sentences with POSITIVE/NEUTRAL/NEGATIVE
     *   - entities: array of detected named entities
     */
    @GetMapping("/transcript/{id}")
    public ResponseEntity<Map<String, Object>> getTranscript(@PathVariable String id) {
        log.debug("Polling transcript id={}", id);
        Map<String, Object> transcript = assemblyAIService.getTranscript(id);
        return ResponseEntity.ok(transcript);
    }
}
