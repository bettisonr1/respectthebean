export type RoastLevel = 'light' | 'medium' | 'dark'
export type TasteRating = 'sour' | 'balanced' | 'bitter'

export interface Machine {
  machineId: string
  name: string
  model: string
  grindSettingMin?: number
  grindSettingMax?: number
  createdAt: string
}

export interface Bean {
  beanId: string
  roaster: string
  name: string
  origin: string
  roastLevel: RoastLevel
  roastDate: string
  tastingNotes?: string
  barcode?: string
  createdAt: string
}

export interface Shot {
  shotId: string
  beanId: string
  machineId: string
  grindSetting: number
  doseIn: number
  yieldOut?: number
  extractionTime?: number
  ratio?: number
  rating?: TasteRating
  photoKey?: string
  artworkFeedback?: ArtworkFeedback
  createdAt: string
}

export interface ArtworkFeedback {
  patternType: string
  symmetry: string
  contrast: string
  technique: string
  suggestion: string
}

export type RecommendationSource = 'taste-correction' | 'balanced-history' | 'last-shot' | 'roast-defaults'

export interface Recommendation {
  grindSetting: number
  doseIn: number
  yieldOut: number
  extractionTime: number
  explanation: string
  basedOnShots: number
  source: RecommendationSource
  tweaks: string[]
}
