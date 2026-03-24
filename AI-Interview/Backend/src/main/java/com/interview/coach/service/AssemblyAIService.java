package com.interview.coach.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interview.coach.exception.AssemblyAIException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * All communication with the AssemblyAI speech-to-text API lives here.
 *
 * Flow proxied through this service (instead of calling AssemblyAI from the browser):
 *   1. uploadAudio()        — POST raw bytes → returns upload_url
 *   2. submitTranscription()— POST transcript job with sentiment + entity detection → returns id
 *   3. getTranscript()      — GET /transcript/{id} → returns status + results
 *
 * Why proxy through the backend instead of calling AssemblyAI from the React frontend?
 * → The API key never leaves the server. If the key is in REACT_APP_*, anyone opening
 *   DevTools can steal it and rack up charges on your account.
 *
 * The frontend still does the 1-second polling loop (GET /api/assembly/transcript/{id})
 * because that avoids holding a long-lived HTTP connection open on the server.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssemblyAIService {

    @Value("${assemblyai.api.key}")
    private String apiKey;

    @Value("${assemblyai.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // ══════════════════════════════════════════════════════════════════════
    // Public interface
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Step 1: Upload raw audio bytes to AssemblyAI.
     *
     * @param audioBytes raw audio data (webm/ogg from the browser MediaRecorder)
     * @return the upload_url that AssemblyAI hosts temporarily
     */
    public String uploadAudio(byte[] audioBytes) {
        HttpHeaders headers = buildHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);

        HttpEntity<byte[]> entity = new HttpEntity<>(audioBytes, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    baseUrl + "/upload",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getBody() == null || !response.getBody().containsKey("upload_url")) {
                throw new AssemblyAIException("AssemblyAI did not return an upload_url.");
            }

            String uploadUrl = (String) response.getBody().get("upload_url");
            log.debug("AssemblyAI upload_url: {}", uploadUrl);
            return uploadUrl;

        } catch (AssemblyAIException e) {
            throw e;
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new AssemblyAIException("Invalid AssemblyAI API key. Check ASSEMBLYAI_API_KEY.");
        } catch (Exception e) {
            throw new AssemblyAIException("Audio upload to AssemblyAI failed: " + e.getMessage(), e);
        }
    }

    /**
     * Step 2: Submit a transcription job with sentiment analysis and entity detection.
     *
     * @param uploadUrl the URL returned by uploadAudio()
     * @return the transcript job ID (used to poll status)
     */
    public String submitTranscription(String uploadUrl) {
        HttpHeaders headers = buildHeaders();

        // Request body: tell AssemblyAI what to do with the audio
        Map<String, Object> requestBody = Map.of(
                "audio_url",          uploadUrl,
                "sentiment_analysis", true,
                "entity_detection",   true
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    baseUrl + "/transcript",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getBody() == null || !response.getBody().containsKey("id")) {
                throw new AssemblyAIException("AssemblyAI did not return a transcript ID.");
            }

            String transcriptId = (String) response.getBody().get("id");
            log.debug("AssemblyAI transcript job submitted, id={}", transcriptId);
            return transcriptId;

        } catch (AssemblyAIException e) {
            throw e;
        } catch (Exception e) {
            throw new AssemblyAIException("Transcription submission failed: " + e.getMessage(), e);
        }
    }

    /**
     * Step 3: Poll the transcript status.
     * Called repeatedly by the frontend (every 1 s) until status === "completed".
     * This method just proxies the response — it does NOT block and poll internally.
     *
     * @param transcriptId the ID returned by submitTranscription()
     * @return the full AssemblyAI transcript object as a Map
     *         (contains status, text, sentiment_analysis_results, entities, etc.)
     */
    public Map<String, Object> getTranscript(String transcriptId) {
        HttpHeaders headers = buildHeaders();
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    baseUrl + "/transcript/" + transcriptId,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            if (response.getBody() == null) {
                throw new AssemblyAIException("Empty response when polling transcript " + transcriptId);
            }

            //noinspection unchecked
            return (Map<String, Object>) response.getBody();

        } catch (AssemblyAIException e) {
            throw e;
        } catch (Exception e) {
            throw new AssemblyAIException("Failed to poll transcript status: " + e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // Private helpers
    // ══════════════════════════════════════════════════════════════════════

    /** Standard headers for every AssemblyAI request. */
    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", apiKey);          // AssemblyAI uses bare key, not Bearer
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }
}
