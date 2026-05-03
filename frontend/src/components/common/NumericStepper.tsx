import type { InputHTMLAttributes } from 'react'

function parseField(value: string, fallback: number): number {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}

function clamp(n: number, min?: number, max?: number): number {
  let x = n
  if (min !== undefined) x = Math.max(min, x)
  if (max !== undefined) x = Math.min(max, x)
  return x
}

/** One decimal when needed, integers without trailing .0 */
function formatStepped(n: number): string {
  const t = Math.round(n * 10) / 10
  if (Math.abs(t - Math.round(t)) < 1e-9) return String(Math.round(t))
  return t.toFixed(1)
}

function formatStepSize(s: number): string {
  if (Number.isInteger(s)) return String(s)
  return (Math.round(s * 10) / 10).toFixed(1)
}

export interface NumericStepperProps {
  value: string
  onChange: (value: string) => void
  /** Used when the field is empty or invalid and the user taps a step button */
  fallback: number
  min?: number
  max?: number
  stepFine?: number
  stepCoarse?: number
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>
}

export default function NumericStepper({
  value,
  onChange,
  fallback,
  min,
  max,
  stepFine = 0.1,
  stepCoarse = 1,
  inputProps,
}: NumericStepperProps) {
  const singleStepSize = stepFine === stepCoarse
  const wholeNumberSteps =
    singleStepSize && Number.isInteger(stepFine)

  function applyDelta(delta: number) {
    const raw = parseField(value, fallback)
    const base = wholeNumberSteps ? Math.round(raw) : raw
    const next = clamp(base + delta, min, max)
    const formatted = wholeNumberSteps
      ? String(Math.round(next))
      : formatStepped(next)
    onChange(formatted)
  }

  const fc = formatStepSize(stepCoarse)
  const ff = formatStepSize(stepFine)

  return (
    <div className="numeric-stepper">
      {singleStepSize ? (
        <>
          <button
            type="button"
            className="numeric-stepper__btn"
            aria-label={`Decrease by ${ff}`}
            onClick={() => applyDelta(-stepFine)}
          >
            −{ff}
          </button>
          <input
            type="number"
            className="numeric-stepper__input"
            value={value}
            onChange={e => onChange(e.target.value)}
            inputMode="decimal"
            {...inputProps}
          />
          <button
            type="button"
            className="numeric-stepper__btn"
            aria-label={`Increase by ${ff}`}
            onClick={() => applyDelta(stepFine)}
          >
            +{ff}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="numeric-stepper__btn"
            aria-label={`Decrease by ${fc}`}
            onClick={() => applyDelta(-stepCoarse)}
          >
            −{fc}
          </button>
          <button
            type="button"
            className="numeric-stepper__btn"
            aria-label={`Decrease by ${ff}`}
            onClick={() => applyDelta(-stepFine)}
          >
            −{ff}
          </button>
          <input
            type="number"
            className="numeric-stepper__input"
            value={value}
            onChange={e => onChange(e.target.value)}
            inputMode="decimal"
            {...inputProps}
          />
          <button
            type="button"
            className="numeric-stepper__btn"
            aria-label={`Increase by ${ff}`}
            onClick={() => applyDelta(stepFine)}
          >
            +{ff}
          </button>
          <button
            type="button"
            className="numeric-stepper__btn"
            aria-label={`Increase by ${fc}`}
            onClick={() => applyDelta(stepCoarse)}
          >
            +{fc}
          </button>
        </>
      )}
    </div>
  )
}
