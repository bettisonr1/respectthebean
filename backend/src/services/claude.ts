import Anthropic from '@anthropic-ai/sdk'
import type { ArtworkFeedback } from '../types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyseLattArt(imageBase64: string, mediaType: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<ArtworkFeedback> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    system: 'You are a professional barista and latte art coach. Analyse the latte art in the image and respond ONLY with valid JSON matching the schema provided. Be encouraging but honest.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Analyse this latte art and respond with JSON only:
{
  "patternType": "name of the pattern (e.g. rosetta, heart, tulip, free pour)",
  "symmetry": "one sentence on symmetry",
  "contrast": "one sentence on contrast between milk and espresso",
  "technique": "one sentence on technique observations",
  "suggestion": "one actionable improvement suggestion"
}`,
          },
        ],
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text) as ArtworkFeedback
}

export async function generateRecommendationExplanation(
  grindSetting: number,
  doseIn: number,
  yieldOut: number,
  extractionTime: number,
  basedOnShots: number,
  beanName: string,
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Write a single friendly sentence (max 30 words) explaining this espresso recommendation for ${beanName}:
Grind: ${grindSetting}, Dose: ${doseIn}g, Target yield: ${yieldOut}g, Target time: ${extractionTime}s.
Based on ${basedOnShots} previous balanced shot${basedOnShots !== 1 ? 's' : ''}.`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}
