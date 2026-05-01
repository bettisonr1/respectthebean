import { useEffect, useState } from 'react'
import { getBeans, createBean, lookupBarcode, deleteBean } from '../services/api'
import type { Bean, RoastLevel } from '../types'

const ROAST_LEVELS: RoastLevel[] = ['light', 'medium', 'dark']

const emptyForm = {
  roaster: '', name: '', origin: '', roastLevel: 'medium' as RoastLevel,
  roastDate: '', tastingNotes: '', barcode: '',
}

export default function Beans() {
  const [beans, setBeans] = useState<Bean[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { getBeans().then(setBeans) }, [])

  async function handleBarcodeScan(e: React.ChangeEvent<HTMLInputElement>) {
    const barcode = e.target.value.trim()
    if (!barcode) return
    setScanning(true)
    try {
      const data = await lookupBarcode(barcode)
      setForm(f => ({ ...f, ...data, barcode }))
    } catch {
      setForm(f => ({ ...f, barcode }))
    } finally {
      setScanning(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const bean = await createBean(form)
      setBeans(b => [bean, ...b])
      setForm(emptyForm)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(beanId: string) {
    await deleteBean(beanId)
    setBeans(b => b.filter(x => x.beanId !== beanId))
  }

  return (
    <div className="page">
      <h1 className="page-title">Beans</h1>

      {!showForm && (
        <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowForm(true)}>
          + Add beans
        </button>
      )}

      {showForm && (
        <form className="card stack" onSubmit={handleSubmit} style={{ marginBottom: 16, gap: 12 }}>
          <div>
            <label className="label">Scan barcode (optional)</label>
            <input type="text" placeholder="Scan or type barcode…" onChange={handleBarcodeScan} />
            {scanning && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Looking up…</p>}
          </div>
          <Field label="Roaster" value={form.roaster} onChange={v => setForm(f => ({ ...f, roaster: v }))} required />
          <Field label="Bean name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
          <Field label="Origin" value={form.origin} onChange={v => setForm(f => ({ ...f, origin: v }))} />
          <div>
            <label className="label">Roast level</label>
            <select value={form.roastLevel} onChange={e => setForm(f => ({ ...f, roastLevel: e.target.value as RoastLevel }))}>
              {ROAST_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Roast date</label>
            <input type="date" value={form.roastDate} onChange={e => setForm(f => ({ ...f, roastDate: e.target.value }))} />
          </div>
          <Field label="Tasting notes" value={form.tastingNotes ?? ''} onChange={v => setForm(f => ({ ...f, tastingNotes: v }))} />
          <div className="row">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add bean'}</button>
          </div>
        </form>
      )}

      <div className="stack">
        {beans.map(bean => (
          <div key={bean.beanId} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{bean.roaster}</div>
              <div style={{ color: 'var(--accent)' }}>{bean.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {bean.origin} · {bean.roastLevel} roast
              </div>
              {bean.tastingNotes && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {bean.tastingNotes}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDelete(bean.beanId)}
              style={{ color: 'var(--text-muted)', fontSize: '1.2rem', alignSelf: 'flex-start' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
      />
    </div>
  )
}
