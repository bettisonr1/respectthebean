import { useEffect, useState } from 'react'
import { getMachines, createMachine, deleteMachine, updateMachine } from '../services/api'
import type { Machine } from '../types'

const APP_DEFAULT_GRIND_MIN = 1
const APP_DEFAULT_GRIND_MAX = 20

function dialLabel(m: Machine) {
  const a = m.grindSettingMin ?? APP_DEFAULT_GRIND_MIN
  const b = m.grindSettingMax ?? APP_DEFAULT_GRIND_MAX
  return `${a}–${b}`
}

export default function Machines() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [grindMin, setGrindMin] = useState('')
  const [grindMax, setGrindMax] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMin, setEditMin] = useState('')
  const [editMax, setEditMax] = useState('')

  useEffect(() => { getMachines().then(setMachines) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Parameters<typeof createMachine>[0] = { name, model }
      if (grindMin !== '' && grindMax !== '') {
        payload.grindSettingMin = Number(grindMin)
        payload.grindSettingMax = Number(grindMax)
      }
      const machine = await createMachine(payload)
      setMachines(m => [machine, ...m])
      setName(''); setModel(''); setGrindMin(''); setGrindMax(''); setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(machineId: string) {
    await deleteMachine(machineId)
    setMachines(m => m.filter(x => x.machineId !== machineId))
    if (editingId === machineId) setEditingId(null)
  }

  function openEdit(m: Machine) {
    setEditingId(m.machineId)
    setEditMin(String(m.grindSettingMin ?? APP_DEFAULT_GRIND_MIN))
    setEditMax(String(m.grindSettingMax ?? APP_DEFAULT_GRIND_MAX))
  }

  async function saveEdit(machineId: string) {
    setSaving(true)
    try {
      const updated = await updateMachine(machineId, {
        grindSettingMin: Number(editMin),
        grindSettingMax: Number(editMax),
      })
      setMachines(ms => ms.map(x => (x.machineId === machineId ? updated : x)))
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Machines</h1>

      {!showForm && (
        <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowForm(true)}>
          + Add machine
        </button>
      )}

      {showForm && (
        <form className="card stack" onSubmit={handleSubmit} style={{ marginBottom: 16, gap: 12 }}>
          <div>
            <label className="label">Name (e.g. My Breville)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Model (e.g. Breville Barista MAX)</label>
            <input type="text" value={model} onChange={e => setModel(e.target.value)} required />
          </div>
          <div className="row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="label">Grind dial min (finest)</label>
              <input
                type="number"
                min={1}
                step={1}
                placeholder={`${APP_DEFAULT_GRIND_MIN} if empty`}
                value={grindMin}
                onChange={e => setGrindMin(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="label">Grind dial max (coarsest)</label>
              <input
                type="number"
                min={1}
                step={1}
                placeholder={`${APP_DEFAULT_GRIND_MAX} if empty`}
                value={grindMax}
                onChange={e => setGrindMax(e.target.value)}
              />
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Lower numbers are finer in this app (matches most built-in grinders). Leave blank to use {APP_DEFAULT_GRIND_MIN}–{APP_DEFAULT_GRIND_MAX}.
          </p>
          <div className="row">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </form>
      )}

      <div className="stack">
        {machines.map(machine => (
          <div key={machine.machineId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{machine.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{machine.model}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Grind dial: <strong style={{ color: 'var(--text)' }}>{dialLabel(machine)}</strong>
                  {(machine.grindSettingMin == null || machine.grindSettingMax == null) && (
                    <span> (defaults — edit to match your grinder)</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {editingId !== machine.machineId ? (
                  <button type="button" className="btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => openEdit(machine)}>
                    Edit dial
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleDelete(machine.machineId)}
                  style={{ color: 'var(--text-muted)', fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label="Delete machine"
                >
                  ×
                </button>
              </div>
            </div>
            {editingId === machine.machineId && (
              <div className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <label className="label">Min (finest)</label>
                  <input type="number" min={1} step={1} value={editMin} onChange={e => setEditMin(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <label className="label">Max (coarsest)</label>
                  <input type="number" min={1} step={1} value={editMax} onChange={e => setEditMax(e.target.value)} />
                </div>
                <button type="button" className="btn-primary" disabled={saving} onClick={() => saveEdit(machine.machineId)}>
                  Save
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
