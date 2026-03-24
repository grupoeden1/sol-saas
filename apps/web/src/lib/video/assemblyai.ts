// AssemblyAI client wrapper — SOL SaaS
// Transcribes video audio with speaker identification and sentiment analysis

import { AssemblyAI } from 'assemblyai'

let _client: AssemblyAI | null = null

function getClient(): AssemblyAI {
  if (!_client) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY
    if (!apiKey) {
      throw new Error('ASSEMBLYAI_API_KEY is not set')
    }
    _client = new AssemblyAI({ apiKey })
  }
  return _client
}

export interface TranscriptionResult {
  text: string
  speakers: Array<{
    speaker: string
    text: string
    start: number
    end: number
  }>
  audioDurationSeconds: number | null
}

/**
 * Transcribes a video file using AssemblyAI.
 * Returns full transcription with speaker diarization.
 */
export async function transcribe(videoPath: string): Promise<TranscriptionResult> {
  const client = getClient()

  const transcript = await client.transcripts.transcribe({
    audio: videoPath,
    speech_models: ['universal-3-pro', 'universal-2'],
    language_detection: true,
    speaker_labels: true,
  })

  if (transcript.status === 'error') {
    throw new Error(`AssemblyAI transcription failed: ${transcript.error}`)
  }

  const speakers = (transcript.utterances ?? []).map((u: { speaker: string; text: string; start: number; end: number }) => ({
    speaker: u.speaker,
    text: u.text,
    start: u.start,
    end: u.end,
  }))

  // Build text with speaker labels
  const textWithSpeakers = speakers.length > 0
    ? speakers.map((s: { speaker: string; text: string }) => `[${s.speaker}]: ${s.text}`).join('\n')
    : transcript.text ?? ''

  // audio_duration from AssemblyAI is already in seconds
  const audioDurationSeconds = transcript.audio_duration ?? null

  return {
    text: textWithSpeakers,
    speakers,
    audioDurationSeconds,
  }
}
