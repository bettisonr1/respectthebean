import { useEffect, useState } from 'react'
import { getShots, getBeans } from '../services/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Shot, Bean, TasteRating } from '../types'

const RATING_COLOR: Record<TasteRating, string> = {
  sour: 'var(--rating-sour)',
  balanced: 'var(--rating-balanced)',
  bitter: 'var(--rating-bitter)',
}

export default function History() {
  const [shots, setShots] = useState<Shot[]>([])
  const [beans, setBeans] = useState<Bean[]>([])
  const [filterBeanId, setFilterBeanId] = useState('all')

  useEffect(() => {
    Promise.all([getShots(), getBeans()]).then(([s, b]) => {
      setShots(s.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      setBeans(b)
    })
  }, [])

  const filtered = filterBeanId === 'all' ? shots : shots.filter(s => s.beanId === filterBeanId)

  const chartData = [...filtered]
    .filter(s => s.ratio)
    .reverse()
    .map((s, i) => ({ index: i + 1, ratio: Number(s.ratio?.toFixed(2)) }))

  return (
    <div className="page">
      <h1 className="page-title">History</h1>

      <div style={{ marginBottom: 16 }}>
        <label className="label">Filter by bean</label>
        <select value={filterBeanId} onChange={e => setFilterBeanId(e.target.value)}>
          <option value="all">All beans</option>
          {beans.map(b => (
            <option key={b.beanId} value={b.beanId}>{b.roaster} — {b.name}</option>
          ))}
        </select>
      </div>

      {chartData.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <span className="label">Ratio trend</span>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="index" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Line type="monotone" dataKey="ratio" stroke="var(--accent)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="stack">
        {filtered.map(shot => {
          const bean = beans.find(b => b.beanId === shot.beanId)
          return (
            <div key={shot.shotId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{bean ? `${bean.roaster} — ${bean.name}` : 'Unknown'}</span>
                {shot.rating && (
                  <span style={{
                    color: RATING_COLOR[shot.rating],
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'capitalize',
                  }}>
                    {shot.rating}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Grind {shot.grindSetting} · {shot.doseIn}g in
                {shot.yieldOut ? ` → ${shot.yieldOut}g out` : ''}
                {shot.extractionTime ? ` · ${shot.extractionTime}s` : ''}
                {shot.ratio ? ` · 1:${shot.ratio.toFixed(2)}` : ''}
              </div>
              {shot.artworkFeedback && (
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  AI: {shot.artworkFeedback.suggestion}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(shot.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
            No shots logged yet.
          </p>
        )}
      </div>
    </div>
  )
}
