import type { Shot, RoastLevel, TasteRating, RecommendationSource } from '../types'
import { clampGrindSetting } from '../constants/grind'

const DEFAULTS_BY_ROAST: Record<RoastLevel, { grindSetting: number; doseIn: number; yieldOut: number; extractionTime: number }> = {
  light:  { grindSetting: 7,  doseIn: 18, yieldOut: 36, extractionTime: 30 },
  medium: { grindSetting: 8,  doseIn: 18, yieldOut: 36, extractionTime: 27 },
  dark:   { grindSetting: 10, doseIn: 18, yieldOut: 36, extractionTime: 25 },
}

const YIELD_MAX = 55
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
    const tweakLines = [
      modalRaw !== modalGrind
        ? `Based on ${balanced.length} balanced shots: historical modal grind ${modalRaw} clamped to ${modalGrind} for this machine’s dial (${grindLimits.min}–${grindLimits.max}).`
        : `Based on ${balanced.length} balanced shots: modal grind ${modalGrind}, mean dose / yield / time from those shots.`,
    ]
    const settings = {
      grindSetting: modalGrind,
      doseIn: Math.round(mean(balanced.map(s => s.doseIn)) * 10) / 10,
      yieldOut: Math.round(mean(balanced.map(s => s.yieldOut!)) * 10) / 10,
      extractionTime: Math.round(mean(balanced.map(s => s.extractionTime!))),
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
    return {
      settings: {
        grindSetting: clampGrindSetting(s.grindSetting, grindLimits),
        doseIn: s.doseIn,
        yieldOut: s.yieldOut ?? defaults.yieldOut,
        extractionTime: s.extractionTime ?? defaults.extractionTime,
      },
      basedOnShots: ordered.length,
      source: 'last-shot',
      tweaks: ['Continue from your last settings on this bean and machine; keep dialing until taste is balanced.'],
    }
  }

  return {
    settings: {
      ...defaults,
      grindSetting: clampGrindSetting(defaults.grindSetting, grindLimits),
    },
    basedOnShots: 0,
    source: 'roast-defaults',
    tweaks: [`No shots logged yet — starting from typical ${roastLevel} roast defaults (grind clamped to this machine’s dial ${grindLimits.min}–${grindLimits.max}).`],
  }
}

/**
 * Taste correction levers (rule-of-thumb, not physics):
 * - **Grind** — primary: more/finer surface area and contact time vs channeling risk.
 * - **Dose** — secondary: changes puck resistance and strength; use when grind is already at the dial limit,
 *   or (future) when time suggests flow issues.
 * - **Yield** — already used for sour as a gentler ratio nudge alongside grind.
 *
 * We **prefer grind first** one step; if that step is clamped (already finest/coarsest), **nudge dose**
 * by ±0.5g instead so there is still a concrete change.
 */
function correctFromLastShot(
  last: Shot,
  rating: Exclude<TasteRating, 'balanced'>,
  defaults: { grindSetting: number; doseIn: number; yieldOut: number; extractionTime: number },
  totalShots: number,
  grindLimits: { min: number; max: number },
): EngineResult {
  const baseYield = last.yieldOut ?? defaults.yieldOut
  const baseTime = last.extractionTime ?? defaults.extractionTime
  const tweaks: string[] = []

  let grindSetting = last.grindSetting
  let doseIn = last.doseIn
  let yieldOut = baseYield

  const { min: gmin, max: gmax } = grindLimits

  if (rating === 'sour') {
    const finer = Math.max(gmin, last.grindSetting - 1)
    const canGoFiner = finer !== last.grindSetting

    if (canGoFiner) {
      grindSetting = finer
      yieldOut = Math.min(YIELD_MAX, Math.round((baseYield + 1) * 10) / 10)
      tweaks.push(
        'Sour → prefer finer grind first (more extraction); slightly higher target yield as a second nudge.',
      )
      tweaks.push(
        `Grind ${last.grindSetting} → ${grindSetting}; yield ${baseYield}g → ${yieldOut}g; dose ${doseIn}g unchanged.`,
      )
    } else {
      grindSetting = last.grindSetting
      doseIn = Math.min(DOSE_MAX, Math.round((last.doseIn + DOSE_STEP) * 10) / 10)
      yieldOut = Math.min(YIELD_MAX, Math.round((baseYield + 1) * 10) / 10)
      if (doseIn > last.doseIn) {
        tweaks.push(
          `Already at this machine’s finest setting (${gmin}) — bump dose slightly to add puck resistance and slow the shot.`,
        )
        tweaks.push(
          `Dose ${last.doseIn}g → ${doseIn}g; yield ${baseYield}g → ${yieldOut}g; grind stays at ${grindSetting}.`,
        )
      } else {
        tweaks.push(`At finest (${gmin}) and max dose — try a touch more yield only, or review prep (WDT / tamp).`)
        tweaks.push(`Yield ${baseYield}g → ${yieldOut}g.`)
      }
    }
  } else {
    const coarser = Math.min(gmax, last.grindSetting + 1)
    const canGoCoarser = coarser !== last.grindSetting

    if (canGoCoarser) {
      grindSetting = coarser
      yieldOut = baseYield
      tweaks.push('Bitter → prefer coarser grind first (less resistance / less over-extraction); keep dose for now.')
      tweaks.push(`Grind ${last.grindSetting} → ${grindSetting}; yield ${yieldOut}g; dose ${doseIn}g unchanged.`)
    } else {
      grindSetting = last.grindSetting
      doseIn = Math.max(DOSE_MIN, Math.round((last.doseIn - DOSE_STEP) * 10) / 10)
      yieldOut = baseYield
      if (doseIn < last.doseIn) {
        tweaks.push(
          `Already at this machine’s coarsest setting (${gmax}) — trim dose slightly to speed the shot and ease extraction.`,
        )
        tweaks.push(`Dose ${last.doseIn}g → ${doseIn}g; yield ${yieldOut}g; grind stays at ${grindSetting}.`)
      } else {
        tweaks.push(`At coarsest (${gmax}) and min dose — try a slightly shorter yield or an earlier cut.`)
      }
    }
  }

  const settings = {
    grindSetting,
    doseIn,
    yieldOut,
    extractionTime:
      rating === 'sour' && baseYield > 0
        ? Math.round(baseTime * (yieldOut / baseYield))
        : Math.round(baseTime),
  }

  return {
    settings,
    basedOnShots: totalShots,
    source: 'taste-correction',
    tweaks,
    lastRating: rating,
  }
}
