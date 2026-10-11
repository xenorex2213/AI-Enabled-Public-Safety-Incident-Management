export type Incident = {
  id: number
  title: string
  description: string
  type: string
  location: string
  incidentDateTime: string
  severity: string
  status: string
}

export type IncidentDraft = Omit<Incident, 'id'>

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body
      ? String(body.message)
      : `${response.status} ${response.statusText}`
    throw new Error(message)
  }
  return body as T
}

export const api = {
  health: () => request<Record<string, unknown>>('/api/health'),
  triageHealth: () => request<Record<string, unknown>>('/health'),
  incidents: (params = '') => request<Incident[]>(`/api/incidents${params}`),
  recentIncidents: (hours: number) => request<Incident[]>(`/api/incidents/recent?hours=${hours}`),
  incident: (id: number) => request<Incident>(`/api/incidents/${id}`),
  createIncident: (data: IncidentDraft) => request<Incident>('/api/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateIncident: (id: number, data: IncidentDraft) => request<Incident>(`/api/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) => request<Incident>(`/api/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  incidentAnalysis: (id: number) => request<Record<string, unknown>>(`/api/incidents/${id}/analysis`),
  analytics: (endpoint: string) => request<unknown>(`/api/analytics/${endpoint}`),
  evaluate: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/analysis/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  classify: (description: string) => request<Record<string, unknown>>('/api/v1/classify-incident', { method: 'POST', body: JSON.stringify({ description }) }),
  predictions: (params: string) => request<Record<string, unknown>>(`/api/v1/predict-incidents${params}`),
  predictSelected: (ids: number[]) => request<Record<string, unknown>>('/api/v1/predict-incidents', { method: 'POST', body: JSON.stringify({ ids }) }),
  retrain: () => request<Record<string, unknown>>('/api/v1/retrain', { method: 'POST', body: JSON.stringify({}) }),
  modelInfo: () => request<Record<string, unknown>>('/api/v1/model-info'),
}