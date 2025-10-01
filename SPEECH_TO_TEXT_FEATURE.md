# Speech-to-Text Feature Documentation

## Overview
The speech-to-text feature allows users to input text using their voice through a microphone icon in both the homepage chat input and the workspace chat panel. The implementation uses **Web Speech API** as the primary method with **Deepgram API** as a fallback for browsers that don't support it (like Firefox).

## Architecture

### Primary Method: Web Speech API
- **Supported Browsers:** Chrome, Edge, Safari, Opera
- **Advantages:**
  - No API costs
  - Real-time recognition
  - Works offline (after initial load)
  - Lower latency
  - Native browser integration
  
### Fallback Method: Deepgram API
- **Used For:** Firefox and other browsers without Web Speech API support
- **Advantages:**
  - High accuracy
  - Consistent cross-browser experience
  - Professional-grade transcription

## Implementation Details

### Browser Detection
```typescript
const isWebSpeechSupported = typeof window !== 'undefined' && 
  ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
```

### Web Speech API Configuration
```typescript
recognition.continuous = false    // Single utterance mode
recognition.interimResults = false // Only final results
recognition.lang = 'en-US'        // English language
```

## User Interface

### Microphone Button States

1. **Idle State** (Gray)
   - Icon: Microphone
   - Color: Gray (#6B7280)
   - Tooltip: "Start voice input"

2. **Recording State** (Red, Pulsing)
   - Icon: MicOff
   - Color: Red (#DC2626)
   - Animation: Pulse animation
   - Tooltip: "Stop recording"

3. **Transcribing State** (Gray, Spinner)
   - Icon: Spinner
   - Color: Gray (#6B7280)
   - Animation: Rotating spinner
   - Tooltip: "Transcribing..."
   - Note: Only shown when using Deepgram fallback

### Button Location

#### Homepage (chat-input.tsx)
- **Position:** Bottom bar, left side
- **Next to:** Plus button and Attach button
- **Order:** Plus → Attach → Microphone

#### Workspace (chat-panel.tsx)
- **Position:** Absolute positioning, left side
- **Below:** Plus button
- **Layout:** Vertical stack (Plus above, Mic below)

## How It Works

### Web Speech API Flow (Chrome, Safari, Edge)

1. **User clicks microphone button**
2. **Browser requests microphone permission** (first time only)
3. **Web Speech API starts listening**
4. **User speaks**
5. **Browser transcribes speech in real-time**
6. **Transcript is appended to input field**
7. **User can continue typing or send message**

### Deepgram API Flow (Firefox, Others)

1. **User clicks microphone button**
2. **Browser requests microphone permission** (first time only)
3. **MediaRecorder starts recording**
4. **Red pulsing indicator shows recording is active**
5. **User speaks**
6. **User clicks microphone again to stop**
7. **Audio is converted to base64**
8. **Sent to `/api/speech-to-text` endpoint**
9. **Deepgram processes audio and returns transcript**
10. **Transcript is appended to input field**

## API Endpoint

### `/api/speech-to-text`
**Location:** `app/api/speech-to-text/route.ts`

**Method:** POST

**Request Body:**
```json
{
  "audio": "base64_encoded_audio_data"
}
```

**Response:**
```json
{
  "success": true,
  "text": "transcribed text here"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "error message"
}
```

## Environment Variables

Add to `.env.local`:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

**Note:** Deepgram API key is only required for Firefox and browsers without Web Speech API support.

## User Notifications

### Success Messages

1. **Web Speech API - Listening Started**
   ```
   Title: "Listening..."
   Description: "Speak now"
   ```

2. **Deepgram - Recording Started**
   ```
   Title: "Recording started"
   Description: "Speak now... Click again to stop"
   ```

3. **Transcription Complete**
   ```
   Title: "Speech recognized" (Web Speech)
   Title: "Transcription complete" (Deepgram)
   Description: "Your speech has been converted to text"
   ```

4. **Deepgram Fallback Notice**
   ```
   Title: "Using Deepgram"
   Description: "Your browser doesn't support Web Speech API"
   ```

### Error Messages

1. **Microphone Permission Denied**
   ```
   Title: "Microphone access denied"
   Description: "Please allow microphone access to use voice input"
   ```

2. **Recognition Failed**
   ```
   Title: "Recognition failed"
   Description: "Could not recognize speech. Please try again."
   ```

3. **Transcription Failed (Deepgram)**
   ```
   Title: "Transcription failed"
   Description: "Could not convert speech to text"
   ```

4. **Browser Not Supported**
   ```
   Title: "Speech recognition not available"
   Description: "Your browser doesn't support speech recognition"
   ```

## State Management

### Homepage (chat-input.tsx)
```typescript
const [isRecording, setIsRecording] = useState(false)
const [isTranscribing, setIsTranscribing] = useState(false)
const recognitionRef = useRef<any>(null)
const mediaRecorderRef = useRef<MediaRecorder | null>(null)
const audioChunksRef = useRef<Blob[]>([])
```

### Workspace (chat-panel.tsx)
Same state structure as homepage.

## Browser Support

| Browser | Method | Status |
|---------|--------|--------|
| Chrome | Web Speech API | ✅ Full Support |
| Edge | Web Speech API | ✅ Full Support |
| Safari | Web Speech API | ✅ Full Support |
| Opera | Web Speech API | ✅ Full Support |
| Firefox | Deepgram Fallback | ✅ Fallback Support |
| Mobile Chrome | Web Speech API | ✅ Full Support |
| Mobile Safari | Web Speech API | ✅ Full Support |

## Features

### ✅ Implemented
- Web Speech API integration
- Deepgram fallback for Firefox
- Real-time speech recognition
- Automatic browser detection
- Visual feedback (pulsing animation)
- Error handling
- Permission management
- Toast notifications
- Microphone icon state changes
- Text appending to existing content

### 🚀 Future Enhancements
- **Multi-language support** - Allow users to select language
- **Interim results** - Show transcription in real-time as user speaks
- **Continuous mode** - Keep listening until user stops
- **Voice commands** - Special commands like "send", "clear", "delete"
- **Punctuation** - Automatic punctuation insertion
- **Audio visualization** - Waveform or levels display
- **Recording history** - Save and replay recordings
- **Offline mode** - Cache for offline Web Speech API usage
- **Custom wake word** - Start recording with "Hey PiPilot"
- **Speaker identification** - Multiple users in team mode

## Usage Examples

### Basic Usage
1. Click the microphone icon (🎤)
2. Allow microphone access if prompted
3. Speak your message
4. Click the microphone again (Deepgram) or wait for Web Speech API to finish
5. Your speech appears as text in the input
6. Edit if needed and send

### Combining with Text Input
1. Type partial message: "Create a landing page"
2. Click microphone
3. Speak: "with a hero section and contact form"
4. Result: "Create a landing page with a hero section and contact form"

### Using with Attachments
1. Attach an image using the + button
2. Click microphone
3. Speak: "Clone this design and make it responsive"
4. The AI receives both the image description and your voice input

## Performance Considerations

### Web Speech API
- **Latency:** ~100-500ms
- **Accuracy:** 90-95% for clear speech
- **Network:** Minimal (model may be cached)
- **CPU:** Low

### Deepgram API
- **Latency:** ~1-3 seconds
- **Accuracy:** 95-98%
- **Network:** Requires upload of audio file
- **CPU:** Low (processing on server)

## Security & Privacy

### Permissions
- Microphone access is requested only when user clicks the button
- Permission is remembered by the browser
- User can revoke at any time via browser settings

### Data Handling
- **Web Speech API:** Audio processed by browser (may send to Google/Apple servers)
- **Deepgram:** Audio sent to Deepgram servers via API
- **Storage:** No audio is stored locally or on our servers
- **Transcripts:** Only stored in browser state until message is sent

## Troubleshooting

### "Microphone access denied"
**Solution:** Allow microphone access in browser settings
1. Click the lock icon in address bar
2. Find microphone permissions
3. Select "Allow"
4. Refresh the page

### "Speech recognition not available"
**Cause:** Browser doesn't support Web Speech API and Deepgram is not configured
**Solution:** 
- Use Chrome, Edge, or Safari for Web Speech API
- Or configure Deepgram API key for fallback

### Audio quality issues
**Solution:**
- Use a good quality microphone
- Speak clearly and at normal pace
- Reduce background noise
- Check microphone settings in OS

### Transcription inaccurate
**Solution:**
- Speak more clearly
- Use proper grammar
- Pause between sentences
- Try again if recognition fails

## Testing

### Web Speech API Test (Chrome/Safari)
1. Open homepage or workspace
2. Click microphone icon
3. Verify browser shows "Listening..." notification
4. Speak: "Test message"
5. Verify text appears in input
6. Check console for no errors

### Deepgram Test (Firefox)
1. Open homepage or workspace in Firefox
2. Click microphone icon
3. Verify "Using Deepgram" toast appears
4. See red pulsing button
5. Speak: "Test message"
6. Click microphone to stop
7. Wait for transcription
8. Verify text appears in input

### Error Handling Test
1. Block microphone permission
2. Click microphone
3. Verify error message appears
4. Re-enable permission
5. Try again successfully

## Cost Considerations

### Web Speech API
- **Cost:** Free (Google/Apple/Microsoft provides)
- **Rate Limits:** Browser-dependent
- **Recommended:** Primary method for all supported browsers

### Deepgram API
- **Cost:** Pay-as-you-go pricing
  - ~$0.0125 per minute of audio
  - Free tier: 45,000 minutes/year ($200 credit)
- **Recommended:** Use only as fallback

## Migration Path

If you want to remove Deepgram and use only Web Speech API:

1. Remove Deepgram-related functions
2. Show error for unsupported browsers
3. Update notifications
4. Remove API endpoint

If you want to use only Deepgram:

1. Remove Web Speech API detection
2. Always use MediaRecorder
3. Simplify state management
4. All browsers use same flow

## Conclusion

The speech-to-text feature provides a seamless voice input experience across all major browsers. By using Web Speech API as the primary method, we minimize costs and latency while maintaining high accuracy. The Deepgram fallback ensures Firefox users still have access to voice input, providing a consistent experience across all platforms.
