import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecommendation, getMachines, getBeans, getShots } from '../services/api'
import type { Bean, Machine, Recommendation, Shot } from '../types'

export default function Home() {
  const navigate = useNavigate()
  const [machines, setMachines] = useState<Machine[]>([])
  const [beans, setBeans] = useState<Bean[]>([])
  const [todayShots, setTodayShots] = useState<Shot[]>([])
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [selectedBeanId, setSelectedBeanId] = useState('')
  const [selectedMachineId, setSelectedMachineId] = useState('')

  useEffect(() => {
    Promise.all([getMachines(), getBeans(), getShots()]).then(([m, b, s]) => {
      setMachines(m)
      setBeans(b)
      const today = new Date().toDateString()
      setTodayShots(s.filter(shot => new Date(shot.createdAt).toDateString() === today))
      if (m[0]) setSelectedMachineId(m[0].machineId)
      if (b[0]) setSelectedBeanId(b[0].beanId)
    })
  }, [])

  useEffect(() => {
    if (selectedBeanId && selectedMachineId) {
      getRecommendation(selectedBeanId, selectedMachineId)
        .then(setRecommendation)
        .catch(() => setRecommendation(null))
    }
  }, [selectedBeanId, selectedMachineId])

  return (
    <div className="page">
      <h1 className="page-title">Good morning ☕</h1>

      <div className="stack">
        <div className="card">
          <span className="label">Bean</span>
          <select value={selectedBeanId} onChange={e => setSelectedBeanId(e.target.value)}>
            {beans.map(b => (
              <option key={b.beanId} value={b.beanId}>{b.roaster} — {b.name}</option>
            ))}
          </select>
          <span className="label" style={{ marginTop: 12 }}>Machine</span>
          <select value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
            {machines.map(m => (
              <option key={m.machineId} value={m.machineId}>{m.name}</option>
            ))}
          </select>
        </div>

        {recommendation && (
          <div className="card">
            <span className="label">Recommended settings</span>
            <div className="row" style={{ marginBottom: 8 }}>
              <Stat label="Grind" value={String(recommendation.grindSetting)} />
              <Stat label="Dose in" value={`${recommendation.doseIn}g`} />
              <Stat label="Target yield" value={`${recommendation.yieldOut}g`} />
              <Stat label="Target time" value={`${recommendation.extractionTime}s`} />
            </div>
            {recommendation.tweaks.length > 0 && (
              <ul style={{ margin: '0 0 10px 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {recommendation.tweaks.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {recommendation.explanation}
            </p>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={() => navigate('/shot/new', {
            state: { beanId: selectedBeanId, machineId: selectedMachineId, recommendation }
          })}
          disabled={!selectedBeanId || !selectedMachineId}
        >
          Log a shot
        </button>

        {todayShots.length > 0 && (
          <div>
            <span className="label">Today — {todayShots.length} shot{todayShots.length !== 1 ? 's' : ''}</span>
            <div className="stack">
              {todayShots.map(shot => (
                <TodayShot key={shot.shotId} shot={shot} beans={beans} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function TodayShot({ shot, beans }: { shot: Shot; beans: Bean[] }) {
  const bean = beans.find(b => b.beanId === shot.beanId)
  const ratingColour = {
    sour: 'var(--rating-sour)',
    balanced: 'var(--rating-balanced)',
    bitter: 'var(--rating-bitter)',
  }[shot.rating ?? 'balanced']

  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600 }}>{bean ? `${bean.roaster} — ${bean.name}` : 'Unknown bean'}</div>
        {shot.yieldOut && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {shot.doseIn}g → {shot.yieldOut}g · {shot.extractionTime}s
          </div>
        )}
      </div>
      {shot.rating && (
        <span style={{
          background: ratingColour,
          color: '#1a0a00',
          borderRadius: 20,
          padding: '2px 10px',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}>
          {shot.rating}
        </span>
      )}
    </div>
  )
}
