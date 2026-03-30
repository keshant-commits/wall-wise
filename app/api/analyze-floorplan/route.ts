import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { z } from 'zod'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Schema for room configuration
const RoomSchema = z.object({
  name: z.string().describe("Name of the room like 'Living Room', 'Kitchen', 'Bedroom 1', 'Bath 1', etc."),
  x: z.number().min(0).max(1).describe("X position as fraction from 0 to 1 (left edge of room)"),
  y: z.number().min(0).max(1).describe("Y position as fraction from 0 to 1 (top edge of room)"),
  width: z.number().min(0.05).max(1).describe("Width as fraction from 0 to 1"),
  height: z.number().min(0.05).max(1).describe("Height as fraction from 0 to 1"),
  type: z.enum(["living", "bedroom", "kitchen", "bathroom", "dining", "study", "balcony", "hall", "entry", "garage", "storage", "utility"]).describe("Room type category"),
})

const FloorPlanAnalysisSchema = z.object({
  planType: z.string().describe("Type of plan like '1BHK', '2BHK', '3BHK', 'Studio', 'Villa', etc."),
  rooms: z.array(RoomSchema).describe("Array of all rooms detected in the floor plan"),
  confidence: z.number().min(0).max(100).describe("Confidence percentage of the analysis"),
})

export async function POST(request: Request) {
  try {
    const { imageBase64, mediaType } = await request.json()

    if (!imageBase64) {
      return Response.json({ success: false, error: 'No image provided' }, { status: 400 })
    }

    // Use Groq's Llama Vision model for image analysis
    const result = await generateObject({
      model: groq('llama-3.2-90b-vision-preview'),
      schema: FloorPlanAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${mediaType || 'image/jpeg'};base64,${imageBase64}`,
            },
            {
              type: 'text',
              text: `Analyze this floor plan image and extract the room layout. 

IMPORTANT RULES:
1. All room positions (x, y) and sizes (width, height) must be fractions between 0 and 1
2. The entire floor plan fits in a 1x1 grid (x + width <= 1, y + height <= 1)
3. Rooms should tile together without gaps - adjacent rooms should share edges
4. x=0 is the left edge, x=1 is the right edge
5. y=0 is the top edge, y=1 is the bottom edge
6. Ensure all x + width values don't exceed 1.0
7. Ensure all y + height values don't exceed 1.0

For each room, provide:
- name: A descriptive name (e.g., "Living Room", "Master Bedroom", "Kitchen", "Bath 1")
- x, y: Position as fraction (0-1)
- width, height: Size as fraction (0-1)
- type: One of: living, bedroom, kitchen, bathroom, dining, study, balcony, hall, entry, garage, storage, utility

Also determine the plan type (1BHK, 2BHK, 3BHK, etc.) based on the number of bedrooms.
Provide a confidence score (0-100) for your analysis.

Make sure rooms are properly positioned relative to each other as shown in the floor plan image.`,
            },
          ],
        },
      ],
    })

    // Validate and normalize room positions
    const rooms = result.object.rooms.map(room => ({
      ...room,
      x: Math.max(0, Math.min(room.x, 0.95)),
      y: Math.max(0, Math.min(room.y, 0.95)),
      width: Math.max(0.05, Math.min(room.width, 1 - room.x)),
      height: Math.max(0.05, Math.min(room.height, 1 - room.y)),
    }))

    return Response.json({
      success: true,
      analysis: {
        planType: result.object.planType,
        rooms,
        confidence: result.object.confidence,
      },
    })
  } catch (error) {
    console.error('Floor plan analysis error:', error)
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze floor plan' 
      },
      { status: 500 }
    )
  }
}
