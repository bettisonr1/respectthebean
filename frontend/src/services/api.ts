import type { Bean, Machine, Shot, Recommendation } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

// Machines
export const getMachines = () => request<Machine[]>('/machines')
export const createMachine = (data: Omit<Machine, 'machineId' | 'createdAt'>) =>
  request<Machine>('/machines', { method: 'POST', body: JSON.stringify(data) })
export const deleteMachine = (machineId: string) =>
  request<void>(`/machines/${machineId}`, { method: 'DELETE' })

// Beans
export const getBeans = () => request<Bean[]>('/beans')
export const createBean = (data: Omit<Bean, 'beanId' | 'createdAt'>) =>
  request<Bean>('/beans', { method: 'POST', body: JSON.stringify(data) })
export const lookupBarcode = (barcode: string) =>
  request<Partial<Bean>>(`/beans/barcode/${barcode}`)
export const deleteBean = (beanId: string) =>
  request<void>(`/beans/${beanId}`, { method: 'DELETE' })

// Shots
export const getShots = (params?: { beanId?: string; machineId?: string }) => {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
  return request<Shot[]>(`/shots${qs}`)
}
export const createShot = (data: Omit<Shot, 'shotId' | 'createdAt'>) =>
  request<Shot>('/shots', { method: 'POST', body: JSON.stringify(data) })
export const updateShot = (shotId: string, data: Partial<Shot>) =>
  request<Shot>(`/shots/${shotId}`, { method: 'PATCH', body: JSON.stringify(data) })

// Recommendations
export const getRecommendation = (beanId: string, machineId: string) =>
  request<Recommendation>(`/recommendations/${beanId}/${machineId}`)

// Artwork
export const getUploadUrl = (shotId: string) =>
  request<{ uploadUrl: string; photoKey: string }>(`/artwork/upload-url/${shotId}`)
export const uploadPhoto = (uploadUrl: string, file: File) =>
  fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
