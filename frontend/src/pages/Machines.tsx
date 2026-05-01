import { useEffect, useState } from 'react'
import { getMachines, createMachine, deleteMachine } from '../services/api'
import type { Machine } from '../types'

export default function Machines() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { getMachines().then(setMachines) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const machine = await createMachine({ name, model })
      setMachines(m => [machine, ...m])
      setName(''); setModel(''); setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(machineId: string) {
    await deleteMachine(machineId)
    setMachines(m => m.filter(x => x.machineId !== machineId))
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
          <div className="row">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </form>
      )}

      <div className="stack">
        {machines.map(machine => (
          <div key={machine.machineId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{machine.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{machine.model}</div>
            </div>
            <button
              onClick={() => handleDelete(machine.machineId)}
              style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
