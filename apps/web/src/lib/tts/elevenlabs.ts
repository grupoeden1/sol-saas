// ElevenLabs TTS client wrapper — SOL SaaS
// Text-to-speech generation for roteiro scripts

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

let _client: ElevenLabsClient | null = null

function getClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set')
  }
  if (!_client) {
    _client = new ElevenLabsClient({ apiKey })
  }
  return _client
}

const TTS_AUDIO_DIR = process.env.TTS_AUDIO_DIR
  || path.join(os.tmpdir(), 'sol-tts-audio')

export interface TtsGenerationResult {
  audioPath: string
  fileSizeBytes: number
  characters: number
}

export interface TtsOptions {
  voiceId: string
  modelId?: string
  text: string
}

/**
 * Strips markdown formatting to produce clean speech-ready text.
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')             // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')         // bold
    .replace(/\*(.+?)\*/g, '$1')             // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '')       // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*+]\s+/gm, '')              // list markers
    .replace(/^\d+\.\s+/gm, '')              // numbered lists
    .replace(/^>\s+/gm, '')                  // blockquotes
    .replace(/---+/g, '')                    // horizontal rules
    .replace(/\n{3,}/g, '\n\n')              // collapse multiple newlines
    .trim()
}

/**
 * Generates TTS audio using ElevenLabs.
 * Expects pre-stripped text (already passed through stripMarkdown).
 * Returns the path to the saved MP3 file.
 */
export async function generateAudio(options: TtsOptions): Promise<TtsGenerationResult> {
  const client = getClient()
  const modelId = options.modelId || 'eleven_multilingual_v2'

  const text = options.text
  const characters = text.length

  if (characters === 0) {
    throw new Error('Text is empty')
  }

  if (characters > 10_000) {
    throw new Error(`Text too long for TTS: ${characters} characters (max 10,000)`)
  }

  // Ensure output directory exists
  await fs.mkdir(TTS_AUDIO_DIR, { recursive: true })

  const filename = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`
  const audioPath = path.join(TTS_AUDIO_DIR, filename)

  // Generate audio (non-streaming for caching)
  const audioStream = await client.textToSpeech.convert(options.voiceId, {
    text,
    modelId,
    outputFormat: 'mp3_44100_128',
    languageCode: 'pt',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
    },
  })

  // Collect stream into buffer
  const reader = audioStream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const audioBuffer = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    audioBuffer.set(chunk, offset)
    offset += chunk.length
  }

  await fs.writeFile(audioPath, audioBuffer)

  return {
    audioPath,
    fileSizeBytes: totalLength,
    characters,
  }
}

/**
 * Deletes a cached audio file from disk.
 */
export async function deleteAudioFile(audioPath: string): Promise<void> {
  try {
    await fs.rm(audioPath, { force: true })
  } catch {
    // Ignore cleanup errors
  }
}
