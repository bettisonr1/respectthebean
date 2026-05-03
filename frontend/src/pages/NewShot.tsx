import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NumericStepper from '../components/common/NumericStepper'
import { createShot, updateShot, getUploadUrl, uploadPhoto } from '../services/api'
import type { Recommendation, TasteRating } from '../types'

const DEFAULT_YIELD_G = 36
const DEFAULT_TIME_S = 27

type Stage = 'pre' | 'post'

interface LocationState {
  beanId: string
  machineId: string
  recommendation: Recommendation | null
}

export default function NewShot() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const [stage, setStage] = useState<Stage>('pre')
  const [shotId, setShotId] = useState<string | null>(null)

  const rec = state?.recommendation

  const [grindSetting, setGrindSetting] = useState(
    String(rec?.grindSetting ?? 8)
  )
  const [doseIn, setDoseIn] = useState(String(rec?.doseIn ?? 18))
  const [yieldOut, setYieldOut] = useState(
    String(rec?.yieldOut ?? DEFAULT_YIELD_G)
  )
  const [extractionTime, setExtractionTime] = useState(
    String(rec?.extractionTime ?? DEFAULT_TIME_S)
  )
  const [rating, setRating] = useState<TasteRating | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  async function handlePreSubmit() {
    setSaving(true)
    try {
      const shot = await createShot({
        beanId: state.beanId,
        machineId: state.machineId,
        grindSetting: Number(grindSetting),
        doseIn: Number(doseIn),
      })
      setShotId(shot.shotId)
      setStage('post')
    } finally {
      setSaving(false)
    }
  }

  async function handlePostSubmit() {
    if (!shotId || !rating) return
    setSaving(true)
    try {
      const ratio = Number(yieldOut) / Number(doseIn)
      await updateShot(shotId, {
        yieldOut: Number(yieldOut),
        extractionTime: Number(extractionTime),
        ratio,
        rating,
      })

      if (photo) {
        const { uploadUrl, photoKey } = await getUploadUrl(shotId)
        await uploadPhoto(uploadUrl, photo)
        await updateShot(shotId, { photoKey })
      }

      navigate('/')
    } finally {
      setSaving(false)
    }
  }

  if (stage === 'pre') {
    return (
      <div className="page">
        <h1 className="page-title">Before the pull</h1>
        <div className="stack">
          <div>
            <label className="label">Grind setting</label>
            <NumericStepper
              value={grindSetting}
              onChange={setGrindSetting}
              fallback={rec?.grindSetting ?? 8}
              min={1}
              max={30}
              inputProps={{ min: 1, max: 30, step: 0.1 }}
            />
          </div>
          <div>
            <label className="label">Dose in (g)</label>
            <NumericStepper
              value={doseIn}
              onChange={setDoseIn}
              fallback={rec?.doseIn ?? 18}
              min={0.1}
              max={50}
              inputProps={{ min: 0.1, max: 50, step: 0.1 }}
            />
          </div>
          <button className="btn-primary" onClick={handlePreSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Pull the shot →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">After the pull</h1>
      <div className="stack">
        <div className="stack">
          <div>
            <label className="label">Yield out (g)</label>
            <NumericStepper
              value={yieldOut}
              onChange={setYieldOut}
              fallback={rec?.yieldOut ?? DEFAULT_YIELD_G}
              min={0.1}
              max={200}
              inputProps={{ min: 0.1, max: 200, step: 0.1 }}
            />
          </div>
          <div>
            <label className="label">Time (s)</label>
            <NumericStepper
              value={extractionTime}
              onChange={setExtractionTime}
              fallback={rec?.extractionTime ?? DEFAULT_TIME_S}
              min={1}
              max={120}
              inputProps={{ min: 1, max: 120, step: 0.1 }}
            />
          </div>
        </div>

        {yieldOut && doseIn && (
          <div className="card" style={{ textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ratio </span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
              1:{(Number(yieldOut) / Number(doseIn)).toFixed(2)}
            </span>
          </div>
        )}

        <div>
          <label className="label">How did it taste?</label>
          <div className="row">
            {(['sour', 'balanced', 'bitter'] as TasteRating[]).map(r => (
              <button
                key={r}
                onClick={() => setRating(r)}
                style={{
                  padding: '12px 8px',
                  borderRadius: 12,
                  border: `2px solid ${rating === r ? `var(--rating-${r})` : 'var(--border)'}`,
                  background: rating === r ? `var(--rating-${r})22` : 'var(--bg-card)',
                  color: rating === r ? `var(--rating-${r})` : 'var(--text-muted)',
                  fontWeight: rating === r ? 700 : 400,
                  textTransform: 'capitalize',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Latte art photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => setPhoto(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          className="btn-primary"
          onClick={handlePostSubmit}
          disabled={saving || !rating || !yieldOut || !extractionTime}
        >
          {saving ? 'Saving…' : 'Save shot'}
        </button>
      </div>
    </div>
  )
}
