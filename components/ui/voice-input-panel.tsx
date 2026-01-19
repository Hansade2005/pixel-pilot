"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Mic,
  MicOff,
  Square,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VoiceInputPanelProps {
  isOpen: boolean
  onClose: () => void
  onTranscriptComplete: (transcript: string) => void
  onTranscriptChange?: (transcript: string) => void
  className?: string
}

type RecordingState = "idle" | "recording" | "processing" | "error"

export function VoiceInputPanel({
  isOpen,
  onClose,
  onTranscriptComplete,
  onTranscriptChange,
  className,
}: VoiceInputPanelProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Web Speech API
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return null

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser")
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      let interim = ""
      let final = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (final) {
        setTranscript((prev) => (prev + " " + final).trim())
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      if (event.error === "no-speech") {
        // Ignore no-speech errors, just keep listening
        return
      }
      setError(`Recognition error: ${event.error}`)
      setRecordingState("error")
    }

    recognition.onend = () => {
      // Auto-restart if still recording
      if (recordingState === "recording") {
        try {
          recognition.start()
        } catch (e) {
          // Ignore if already started
        }
      }
    }

    return recognition
  }, [recordingState])

  // Initialize audio analyzer for visual feedback
  const initAudioAnalyzer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Start visualizing audio levels
      const updateAudioLevel = () => {
        if (!analyserRef.current) return

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)

        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(average / 255)

        animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
      }
      updateAudioLevel()

      return stream
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setError("Could not access microphone")
      return null
    }
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    setError(null)
    setTranscript("")
    setInterimTranscript("")
    setDuration(0)

    // Initialize speech recognition
    const recognition = initSpeechRecognition()
    if (!recognition) return

    recognitionRef.current = recognition

    // Initialize audio analyzer
    await initAudioAnalyzer()

    // Start recognition
    try {
      recognition.start()
      setRecordingState("recording")

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error("Error starting recognition:", err)
      setError("Failed to start recording")
    }
  }, [initSpeechRecognition, initAudioAnalyzer])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setRecordingState("idle")
    setAudioLevel(0)
  }, [])

  // Send transcript
  const handleSend = useCallback(() => {
    const finalTranscript = (transcript + " " + interimTranscript).trim()
    if (finalTranscript) {
      onTranscriptComplete(finalTranscript)
      stopRecording()
      onClose()
    }
  }, [transcript, interimTranscript, onTranscriptComplete, stopRecording, onClose])

  // Cancel recording
  const handleCancel = useCallback(() => {
    stopRecording()
    setTranscript("")
    setInterimTranscript("")
    onClose()
  }, [stopRecording, onClose])

  // Update parent with transcript changes
  useEffect(() => {
    const fullTranscript = (transcript + " " + interimTranscript).trim()
    onTranscriptChange?.(fullTranscript)
  }, [transcript, interimTranscript, onTranscriptChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])

  // Auto-start recording when opened
  useEffect(() => {
    if (isOpen && recordingState === "idle") {
      startRecording()
    }
  }, [isOpen, recordingState, startRecording])

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!isOpen) return null

  const fullTranscript = (transcript + " " + interimTranscript).trim()

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-lg",
        className
      )}
    >
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                recordingState === "recording"
                  ? "bg-red-500/20 animate-pulse"
                  : "bg-muted"
              )}
              style={{
                transform: `scale(${1 + audioLevel * 0.3})`,
              }}
            >
              {recordingState === "recording" ? (
                <Mic className="h-6 w-6 text-red-500" />
              ) : recordingState === "processing" ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <MicOff className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-medium">
                {recordingState === "recording"
                  ? "Listening..."
                  : recordingState === "processing"
                  ? "Processing..."
                  : "Voice Input"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {recordingState === "recording"
                  ? formatDuration(duration)
                  : "Click the mic to start"}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Audio visualizer */}
        {recordingState === "recording" && (
          <div className="flex items-center justify-center gap-1 h-8 mb-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, audioLevel * 32 * Math.sin((i / 20) * Math.PI))}px`,
                  opacity: 0.5 + audioLevel * 0.5,
                }}
              />
            ))}
          </div>
        )}

        {/* Transcript display */}
        <div className="min-h-[80px] max-h-[200px] overflow-y-auto bg-muted/30 rounded-lg p-3 mb-4">
          {fullTranscript ? (
            <p className="text-sm">
              {transcript}
              {interimTranscript && (
                <span className="text-muted-foreground opacity-70">
                  {" "}
                  {interimTranscript}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              {recordingState === "recording"
                ? "Start speaking..."
                : "Your speech will appear here"}
            </p>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {recordingState === "recording" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={stopRecording}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={startRecording}
                className="gap-2"
              >
                <Mic className="h-4 w-4" />
                Start
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!fullTranscript}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>

        {/* Tips */}
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          Tip: Speak clearly and pause briefly between sentences for best results
        </p>
      </div>
    </div>
  )
}
