import Anthropic from '@anthropic-ai/sdk'
import type { ArtworkFeedback, RecommendationSource } from '../types'

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

export interface RecommendationExplanationInput {
  beanName: string
  settings: { grindSetting: number; doseIn: number; yieldOut: number; extractionTime: number }
  basedOnShots: number
  source: RecommendationSource
  tweaks: string[]
  lastRating?: 'sour' | 'bitter'
}

/** Turns rule-derived numbers + tweak bullets into friendly copy. Does not invent different targets. */
export async function generateRecommendationExplanation(input: RecommendationExplanationInput): Promise<string> {
  const { beanName, settings, basedOnShots, source, tweaks, lastRating } = input
  const facts = `
Bean: ${beanName}
Targets — grind ${settings.grindSetting}, dose ${settings.doseIn}g, yield ${settings.yieldOut}g, time ~${settings.extractionTime}s.
Derivation: ${source}. Shots in history for this bean+machine: ${basedOnShots}.
${lastRating ? `Last shot taste: ${lastRating}.` : ''}
Rule summary (use only these facts):
${tweaks.map(t => `- ${t}`).join('\n')}
`.trim()

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 180,
    system:
      'You write short espresso tips for home baristas. Use only the facts provided. Do not change grind, dose, yield, or time numbers. One or two friendly sentences, max 45 words.',
    messages: [
      {
        role: 'user',
        content: `Explain the recommended next shot for this bean. ${facts}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}
