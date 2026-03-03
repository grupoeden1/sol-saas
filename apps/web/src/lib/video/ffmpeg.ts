// FFmpeg wrapper for video processing — SOL SaaS
// Extracts frames from video at specified intervals

import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'

const VIDEO_TEMP_DIR = process.env.VIDEO_TEMP_DIR || '/tmp/sol-uploads/'

/**
 * Extracts frames from a video file at the specified interval.
 * Returns array of frame file paths (JPEG).
 */
export async function extractFrames(
  videoPath: string,
  intervalSeconds: number = 5
): Promise<string[]> {
  const framesDir = path.join(VIDEO_TEMP_DIR, `frames-${Date.now()}`)
  await fs.mkdir(framesDir, { recursive: true })

  const outputPattern = path.join(framesDir, 'frame-%04d.jpg')

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', `fps=1/${intervalSeconds}`,
      '-q:v', '2',
      outputPattern,
      '-y',
    ])

    let stderr = ''
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffmpeg.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`))
        return
      }

      try {
        const files = await fs.readdir(framesDir)
        const framePaths = files
          .filter((f) => f.endsWith('.jpg'))
          .sort()
          .map((f) => path.join(framesDir, f))
        resolve(framePaths)
      } catch (err) {
        reject(err)
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg not found or failed to start: ${err.message}`))
    })
  })
}

/**
 * Gets video duration in seconds using FFprobe.
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      videoPath,
    ])

    let stdout = ''
    let stderr = ''
    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed: ${stderr.slice(-200)}`))
        return
      }
      const duration = parseFloat(stdout.trim())
      if (isNaN(duration)) {
        reject(new Error('Could not parse video duration'))
        return
      }
      resolve(duration)
    })

    ffprobe.on('error', (err) => {
      reject(new Error(`FFprobe not found: ${err.message}`))
    })
  })
}

/**
 * Cleanup temporary files/directories.
 */
export async function cleanup(...paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      await fs.rm(p, { recursive: true, force: true })
    } catch {
      console.warn(`[Video Cleanup] Failed to remove: ${p}`)
    }
  }
}
