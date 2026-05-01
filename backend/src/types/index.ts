export type RoastLevel = 'light' | 'medium' | 'dark'
export type TasteRating = 'sour' | 'balanced' | 'bitter'

export interface Machine {
  machineId: string
  userId: string
  name: string
  model: string
  createdAt: string
}

export interface Bean {
  beanId: string
  userId: string
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
  userId: string
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

export interface Recommendation {
  grindSetting: number
  doseIn: number
  yieldOut: number
  extractionTime: number
  explanation: string
  basedOnShots: number
}
