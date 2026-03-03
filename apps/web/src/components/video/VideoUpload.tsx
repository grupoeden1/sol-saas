'use client'

import { useState, useRef, useCallback } from 'react'

const MAX_SIZE_MB = 500
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

interface VideoUploadProps {
  quizSessionId: string
  onUploadComplete: (videoAnalysisId: string) => void
  existingFileName?: string
}

export function VideoUpload({
  quizSessionId,
  onUploadComplete,
  existingFileName,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState(existingFileName ?? '')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Tipo de arquivo não suportado. Use MP4, MOV, AVI ou WebM.')
        return
      }

      const sizeMB = file.size / (1024 * 1024)
      if (sizeMB > MAX_SIZE_MB) {
        setError(`Arquivo excede o limite de ${MAX_SIZE_MB}MB (${sizeMB.toFixed(1)}MB).`)
        return
      }

      setFileName(file.name)
      setUploading(true)
      setProgress(0)

      try {
        const formData = new FormData()
        formData.append('video', file)
        formData.append('quizSessionId', quizSessionId)

        // Use XMLHttpRequest for upload progress
        const xhr = new XMLHttpRequest()

        const result = await new Promise<{ videoAnalysisId: string }>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100))
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              const errData = JSON.parse(xhr.responseText)
              reject(new Error(errData.error ?? 'Erro no upload'))
            }
          })

          xhr.addEventListener('error', () => reject(new Error('Erro de conexão')))
          xhr.open('POST', '/api/video/upload')
          xhr.send(formData)
        })

        onUploadComplete(result.videoAnalysisId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro no upload')
      } finally {
        setUploading(false)
      }
    },
    [quizSessionId, onUploadComplete]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-solar-500 bg-solar-500/10'
            : 'border-solar-800/30 hover:border-solar-800/50'
        }`}
      >
        <div className="mb-2 text-2xl">🎬</div>
        <p className="mb-1 text-sm text-foreground">
          {uploading
            ? `Enviando ${fileName}...`
            : fileName
              ? `Vídeo: ${fileName}`
              : 'Arraste e solte ou clique para selecionar'}
        </p>
        <p className="text-xs text-muted-foreground">
          MP4, MOV, AVI, WebM (máx. {MAX_SIZE_MB}MB, 5 min)
        </p>

        {uploading && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="h-2 rounded-full bg-background">
              <div
                className="h-2 rounded-full bg-solar-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-solar-400">{progress}%</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
