import type { Shot, RoastLevel, TasteRating, RecommendationSource } from '../types'
import { clampGrindSetting } from '../constants/grind'

/**
 * Dose + grind come from history or taste correction. **Target yield** is always 1:2 (yield = 2× dose) —
 * a simple balanced marker, not a prediction from past outputs. **Target time** is roast-based only
 * (25–35s band from `extractionTime` below), not derived from past shot times or yield math.
 */
const DEFAULTS_BY_ROAST: Record<RoastLevel, { grindSetting: number; doseIn: number; yieldOut: number; extractionTime: number }> = {
  light:  { grindSetting: 7,  doseIn: 18, yieldOut: 36, extractionTime: 30 },
  medium: { grindSetting: 8,  doseIn: 18, yieldOut: 36, extractionTime: 27 },
  dark:   { grindSetting: 10, doseIn: 18, yieldOut: 36, extractionTime: 25 },
}

function targetYieldFromDose(doseIn: number): number {
  return Math.round(doseIn * 2 * 10) / 10
}

/** Typical double range; clamp suggestions so they stay realistic */
const DOSE_MIN = 15
const DOSE_MAX = 22
const DOSE_STEP = 0.5

function sortByCreatedAt(shots: Shot[]): Shot[] {
  return [...shots].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

function mean(arr: number[]) {
  return arr.reduce((x, y) => x + y, 0) / arr.length
}

export interface EngineResult {
  settings: { grindSetting: number; doseIn: number; yieldOut: number; extractionTime: number }
  basedOnShots: number
  source: RecommendationSource
  /** Deterministic, display-ready; passed to the LLM for wording only */
  tweaks: string[]
  lastRating?: 'sour' | 'bitter'
}

/**
 * v1 rule engine: numbers only. LLM is used elsewhere to turn `tweaks` + `settings` into prose.
 * Community pulls for the same machine+bean can be merged at this layer later (e.g. blend with GSI stats).
 */
export function computeRecommendation(
  shots: Shot[],
  roastLevel: RoastLevel,
  grindLimits: { min: number; max: number },
): EngineResult {
  const ordered = sortByCreatedAt(shots)
  const defaults = DEFAULTS_BY_ROAST[roastLevel]
  const last = ordered[ordered.length - 1]
  const balanced = ordered.filter(s => s.rating === 'balanced' && s.yieldOut != null && s.extractionTime != null)

  const offTarget = last?.rating
  if (last && (offTarget === 'sour' || offTarget === 'bitter')) {
    return correctFromLastShot(last, offTarget, defaults, ordered.length, grindLimits)
  }

  if (balanced.length >= 3) {
    const grindCounts = balanced.reduce<Record<number, number>>((acc, s) => {
      acc[s.grindSetting] = (acc[s.grindSetting] ?? 0) + 1
      return acc
    }, {})
    const modalRaw = Number(Object.entries(grindCounts).sort((a, b) => b[1] - a[1])[0][0])
    const modalGrind = clampGrindSetting(modalRaw, grindLimits)
    const doseIn = Math.round(mean(balanced.map(s => s.doseIn)) * 10) / 10
    const tweakLines = [
      modalRaw !== modalGrind
        ? `Based on ${balanced.length} balanced shots: historical modal grind ${modalRaw} clamped to ${modalGrind} for this machine’s dial (${grindLimits.min}–${grindLimits.max}). Mean dose ${doseIn}g; target yield 1:2 (${targetYieldFromDose(doseIn)}g); target time ~${defaults.extractionTime}s (${roastLevel} roast, 25–35s band).`
        : `Based on ${balanced.length} balanced shots: modal grind ${modalGrind}, mean dose ${doseIn}g; target yield 1:2 (${targetYieldFromDose(doseIn)}g); target time ~${defaults.extractionTime}s (${roastLevel} roast, 25–35s band).`,
    ]
    const settings = {
      grindSetting: modalGrind,
      doseIn,
      yieldOut: targetYieldFromDose(doseIn),
      extractionTime: defaults.extractionTime,
    }
    return {
      settings,
      basedOnShots: balanced.length,
      source: 'balanced-history',
      tweaks: tweakLines,
    }
  }

  if (ordered.length > 0) {
    const s = last!
    const doseIn = s.doseIn
    return {
      settings: {
        grindSetting: clampGrindSetting(s.grindSetting, grindLimits),
        doseIn,
        yieldOut: targetYieldFromDose(doseIn),
        extractionTime: defaults.extractionTime,
      },
      basedOnShots: ordered.length,
      source: 'last-shot',
      tweaks: [
        `Continue from your last grind/dose on this bean and machine. Target yield 1:2 (${targetYieldFromDose(doseIn)}g); target time ~${defaults.extractionTime}s (${roastLevel} roast, 25–35s band).`,
      ],
    }
  }

  return {
    settings: {
      ...defaults,
      grindSetting: clampGrindSetting(defaults.grindSetting, grindLimits),
      yieldOut: targetYieldFromDose(defaults.doseIn),
    },
    basedOnShots: 0,
    source: 'roast-defaults',
    tweaks: [`No shots logged yet — starting from typical ${roastLevel} roast defaults (grind clamped to this machine’s dial ${grindLimits.min}–${grindLimits.max}).`],
  }
}

/**
 * Taste correction adjusts **grind** (primary) and **dose** (when dial is maxed out).
 * Target yield and time are not “predicted” here — yield stays 1:2 with the chosen dose; time follows roast defaults.
 */
function correctFromLastShot(
  last: Shot,
  rating: Exclude<TasteRating, 'balanced'>,
  defaults: { grindSetting: number; doseIn: number; yieldOut: number; extractionTime: number },
  totalShots: number,
  grindLimits: { min: number; max: number },
): EngineResult {
  const tweaks: string[] = []

  let grindSetting = last.grindSetting
  let doseIn = last.doseIn

  const { min: gmin, max: gmax } = grindLimits

  if (rating === 'sour') {
    const finer = Math.max(gmin, last.grindSetting - 1)
    const canGoFiner = finer !== last.grindSetting

    if (canGoFiner) {
      grindSetting = finer
      tweaks.push('Sour → try a finer grind first (more extraction).')
      tweaks.push(
        `Grind ${last.grindSetting} → ${grindSetting}; dose ${doseIn}g unchanged. Targets: yield 1:2 (${targetYieldFromDose(doseIn)}g), time ~${defaults.extractionTime}s.`,
      )
    } else {
      grindSetting = last.grindSetting
      doseIn = Math.min(DOSE_MAX, Math.round((last.doseIn + DOSE_STEP) * 10) / 10)
      if (doseIn > last.doseIn) {
        tweaks.push(
          `Already at this machine’s finest setting (${gmin}) — bump dose slightly to add puck resistance and slow the shot.`,
        )
        tweaks.push(
          `Dose ${last.doseIn}g → ${doseIn}g; grind stays at ${grindSetting}. Targets: yield 1:2 (${targetYieldFromDose(doseIn)}g), time ~${defaults.extractionTime}s.`,
        )
      } else {
        tweaks.push(`At finest (${gmin}) and max dose — review prep (WDT / tamp) or rest; targets stay yield 1:2 (${targetYieldFromDose(doseIn)}g), time ~${defaults.extractionTime}s.`)
      }
    }
  } else {
    const coarser = Math.min(gmax, last.grindSetting + 1)
    const canGoCoarser = coarser !== last.grindSetting

    if (canGoCoarser) {
      grindSetting = coarser
      tweaks.push('Bitter → try a coarser grind first (less resistance / less over-extraction); keep dose for now.')
      tweaks.push(
        `Grind ${last.grindSetting} → ${grindSetting}; dose ${doseIn}g unchanged. Targets: yield 1:2 (${targetYieldFromDose(doseIn)}g), time ~${defaults.extractionTime}s.`,
      )
    } else {
      grindSetting = last.grindSetting
      doseIn = Math.max(DOSE_MIN, Math.round((last.doseIn - DOSE_STEP) * 10) / 10)
      if (doseIn < last.doseIn) {
        tweaks.push(
          `Already at this machine’s coarsest setting (${gmax}) — trim dose slightly to speed the shot and ease extraction.`,
        )
        tweaks.push(
          `Dose ${last.doseIn}g → ${doseIn}g; grind stays at ${grindSetting}. Targets: yield 1:2 (${targetYieldFromDose(doseIn)}g), time ~${defaults.extractionTime}s.`,
        )
      } else {
        tweaks.push(
          `At coarsest (${gmax}) and min dose — review prep or try a shorter ratio next pull; targets stay yield 1:2 (${targetYieldFromDose(doseIn)}g), time ~${defaults.extractionTime}s.`,
        )
      }
    }
  }

  const settings = {
    grindSetting,
    doseIn,
    yieldOut: targetYieldFromDose(doseIn),
    extractionTime: defaults.extractionTime,
  }

  return {
    settings,
    basedOnShots: totalShots,
    source: 'taste-correction',
    tweaks,
    lastRating: rating,
  }
}
