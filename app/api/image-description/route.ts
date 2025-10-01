import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/ai-providers'

export async function POST(request: NextRequest) {
  let filename = 'unknown'
  
  try {
    const { imageBase64, filename: requestFilename } = await request.json()
    filename = requestFilename || 'unknown'

    if (!imageBase64 || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing image data or filename' },
        { status: 400 }
      )
    }

    console.log('🖼️ Processing image with Pixtral for description...')

    // Use Pixtral to generate a description of the image
    const result = await generateText({
      model: getModel('pixtral-12b-2409'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in detail. Focus on the main subject, colors, composition, and any text or important elements visible. Keep the description concise but informative (2-3 sentences).'
            },
            {
              type: 'image',
              image: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ],
      temperature: 0.3,
    })

    const description = result.text?.trim() || `Image: ${filename}`

    console.log('✅ Image description generated:', description)

    return NextResponse.json({
      success: true,
      description
    })

  } catch (error) {
    console.error('❌ Error processing image:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process image',
        description: `Image: ${filename || 'unknown'}`
      },
      { status: 500 }
    )
  }
}