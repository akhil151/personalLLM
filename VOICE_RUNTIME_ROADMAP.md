# VOICE RUNTIME ROADMAP (PHASE Z.4)

## PART 1 — Recommended Voice Architecture
The Voice Runtime is designed as a **Bi-Directional Real-time Gateway** that decouples audio processing from agent cognition while maintaining ultra-low latency.

- **Gateway Pattern**: A WebSocket-based `VoiceGateway` handles persistent client connections, managing the lifecycle of audio streams.
- **Provider-Agnostic Core**: Leverages a `SpeechProvider` interface to support Gemini Multimodal Live (primary) with fallback to a Deepgram + ElevenLabs pipeline.
- **Agent Integration**: The `VoiceOrchestrator` translates voice events into `AgentInput` and routes `AgentOutput` to the TTS stream.

## PART 2 — Audio Pipeline
1. **Upstream (User -> Jarvis)**: 
   - Client: 16-bit LPCM @ 16kHz -> WebSocket.
   - Server: Buffer -> VAD (Voice Activity Detection) -> STT (Speech-to-Text).
2. **Downstream (Jarvis -> User)**:
   - Server: LLM Stream -> Sentence Chunking -> TTS (Text-to-Speech) -> Audio Chunks.
   - Client: Jitter Buffer -> Audio Worklet Playback.

## PART 3 — Realtime Event Flow
- `VOICE_SESSION_INIT`: Handshake and provider negotiation.
- `USER_SPEECH_START`: Triggers interruption of any current Jarvis speech.
- `TRANSCRIPTION_FINAL`: Injected into the `orchestratorService` as a new message.
- `AGENT_STEP_TICK`: Periodic voice feedback for long-running tasks ("I'm searching the web now...").
- `JARVIS_SPEECH_STREAM`: Continuous audio data packets to the client.

## PART 4 — Required New Services
- `VoiceGatewayService`: WebSocket server for stateful audio management.
- `VoiceOrchestrator`: The brain connecting audio events to the Multi-Agent Runtime.
- `STTService`: Wrapper for Deepgram/Gemini transcription.
- `TTSService`: Wrapper for ElevenLabs/Gemini synthesis.

## PART 5 — Required Database Changes
- **`voice_sessions`**: Add `is_always_on` (boolean), `wake_word_enabled` (boolean), and `provider_config` (jsonb).
- **`voice_events`**: New table to log latency, STT accuracy, and interruption frequency for system optimization.
- **`user_profiles`**: Add `voice_id` and `stt_language_code`.

## PART 6 — Required UI Components
- `VoiceCore`: A floating action button (FAB) with an integrated SVG Waveform Visualizer.
- `VoiceSettingsPanel`: Configuration for voice speed, pitch, and provider selection.
- `InterruptionIndicator`: Visual pulse when the system detects user speech during its own turn.

## PART 7 — Failure Modes
- **High Latency**: Adaptive bitrate and chunk size reduction.
- **VAD False Positives**: Tunable sensitivity threshold in `user_profiles`.
- **Incoherent STT**: Context-aware transcription correction using `MemoryAgent` (last 5 messages).

## PART 8 — Cost Analysis
- **Gemini Flash (Live)**: Low cost (~$0.01/hr interaction).
- **Deepgram (STT)**: ~$0.25/hr.
- **ElevenLabs (TTS)**: ~$0.30 per 1k characters (Highest cost component).
- **Optimization**: Use Gemini TTS for status updates and ElevenLabs only for final answers.

## PART 9 — Security Review
- **Local VAD**: Prevents streaming silence/background noise to the cloud.
- **Ephemeral Storage**: Transcripts are stored; raw audio buffers are purged immediately after processing.
- **Auth**: WebSocket connections require a valid Supabase JWT.

## PART 10 — Exact Phase Breakdown

### Z.4.1 — The Audio Bridge
*   **Goal**: Establish low-latency bidirectional audio streaming.
*   **Files to Create**: 
    - `src/voice/VoiceGateway.ts` (WebSocket server)
    - `src/voice/providers/DeepgramProvider.ts`
    - `src/voice/providers/ElevenLabsProvider.ts`
*   **Files to Modify**: 
    - `src/voice/voiceService.ts` (Refactor to use new providers)
*   **Testing Strategy**: Loopback testing (STT -> Text -> TTS) to measure round-trip latency.
*   **Completion Criteria**: Audio spoken by user is transcribed and echoed back in < 800ms.

### Z.4.2 — Cognitive Integration
*   **Goal**: Connect Voice Gateway to the Multi-Agent Runtime.
*   **Files to Create**: 
    - `src/voice/VoiceOrchestrator.ts`
*   **Files to Modify**: 
    - `src/orchestrator/orchestratorService.ts` (Add voice event hooks)
    - `src/agents/planner/plannerAgent.ts` (Add voice-optimized prompting)
*   **Testing Strategy**: "Voice-to-Task" verification. Speak a goal, verify Planner generates tasks.
*   **Completion Criteria**: User can trigger a `BrowserAgent` or `ResearchAgent` run via voice.

### Z.4.3 — Interruption & Real-time Flow
*   **Goal**: Implement VAD-based interruption and "Always-on" mode foundation.
*   **Files to Create**: 
    - `src/voice/VADManager.ts`
*   **Files to Modify**: 
    - `src/voice/VoiceGateway.ts` (Add interruption logic)
    - `src/components/voice/VoiceInterface.tsx` (Add visualizer)
*   **Testing Strategy**: Speak over Jarvis while it is reading a long research summary.
*   **Completion Criteria**: System stops speaking within 200ms of user speech detection and resets state for new input.
