import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json()

    if (!audio) {
      return NextResponse.json(
        { success: false, error: 'No audio provided' },
        { status: 400 }
      )
    }

    // Decode base64 into raw buffer
    const audioBuffer = Buffer.from(audio, 'base64')

    // Call Deepgram API
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav'
      },
      body: audioBuffer
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Deepgram API error: ${response.status} ${errText}`)
    }

    const result = await response.json()

    // Extract transcript
    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

    return NextResponse.json({ 
      success: true, 
      text: transcript 
    })
  } catch (error) {
    console.error('Deepgram API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
