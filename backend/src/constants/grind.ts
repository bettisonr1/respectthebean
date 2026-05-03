/** Used when a machine has no saved grind bounds (legacy rows or migration). */
export const DEFAULT_GRIND_SETTING_MIN = 1
export const DEFAULT_GRIND_SETTING_MAX = 20

const ABS_MIN = 1
const ABS_MAX = 60

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Resolve usable grind bounds from stored machine fields (optional for backwards compatibility). */
export function resolveGrindLimits(machine?: {
  grindSettingMin?: number
  grindSettingMax?: number
} | null): { min: number; max: number } {
  let min = Number(machine?.grindSettingMin ?? DEFAULT_GRIND_SETTING_MIN)
  let max = Number(machine?.grindSettingMax ?? DEFAULT_GRIND_SETTING_MAX)
  if (!Number.isFinite(min)) min = DEFAULT_GRIND_SETTING_MIN
  if (!Number.isFinite(max)) max = DEFAULT_GRIND_SETTING_MAX
  min = clamp(Math.round(min), ABS_MIN, ABS_MAX)
  max = clamp(Math.round(max), ABS_MIN, ABS_MAX)
  if (min > max) [min, max] = [max, min]
  if (min === max) {
    if (max < ABS_MAX) max += 1
    else if (min > ABS_MIN) min -= 1
  }
  return { min, max }
}

export function clampGrindSetting(value: number, limits: { min: number; max: number }): number {
  return clamp(Math.round(value), limits.min, limits.max)
}
