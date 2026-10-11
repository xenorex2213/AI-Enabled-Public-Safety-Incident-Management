import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, Bell, Check, ChevronDown, CircleHelp, ClipboardList, Clock3, FilePlus2, Filter, LoaderCircle, MapPin, RefreshCw, Search, Shield, Siren, Sparkles, X } from 'lucide-react'
import { api, type Incident, type IncidentDraft } from './api'

type View = 'overview' | 'incidents' | 'analytics' | 'assessment'
type ServiceState = 'checking' | 'online' | 'offline'
type FormState = Omit<IncidentDraft, 'incidentDateTime'> & { incidentDateTime: string }
type IncidentFilters = { type: string; location: string; severity: string; status: string }
type AssessmentForm = { incidentType: string; location: string; dateTime: string; reportedSeverity: string; description: string }

const blankIncident: FormState = {
  title: '', description: '', type: '', location: '', incidentDateTime: '', severity: 'MEDIUM', status: 'OPEN',
}

function localDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function dateLabel(value?: string) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function App() {
  const [view, setView] = useState<View>('overview')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selected, setSelected] = useState<Incident | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [analytics, setAnalytics] = useState<Record<string, unknown>>({})
  const [services, setServices] = useState<Record<string, ServiceState>>({ incidents: 'checking', analytics: 'checking', triage: 'checking' })
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ type: '', location: '', severity: '', status: '' })
  const [hours, setHours] = useState(24)
  const [form, setForm] = useState<FormState>(blankIncident)
  const [editing, setEditing] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [assessment, setAssessment] = useState<Record<string, unknown> | null>(null)
  const [classification, setClassification] = useState<Record<string, unknown> | null>(null)
  const [predictions, setPredictions] = useState<Record<string, unknown> | null>(null)
  const [modelInfo, setModelInfo] = useState<Record<string, unknown> | null>(null)
  const [assessmentForm, setAssessmentForm] = useState({ incidentType: '', location: '', dateTime: '', reportedSeverity: 'MEDIUM', description: '' })
  const [triageText, setTriageText] = useState('')

  async function loadIncidents(params = '') {
    setBusy('incidents')
    try {
      const rows = await api.incidents(params)
      setIncidents(rows)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load incidents')
    } finally {
      setBusy('')
    }
  }

  async function loadAll() {
    setBusy('refresh')
    const health = await Promise.allSettled([api.health(), api.analytics('summary'), api.triageHealth()])
    setServices({
      incidents: health[0].status === 'fulfilled' ? 'online' : 'offline',
      analytics: health[1].status === 'fulfilled' ? 'online' : 'offline',
      triage: health[2].status === 'fulfilled' ? 'online' : 'offline',
    })
    const analyticsHealth = health[1]
    if (analyticsHealth.status === 'fulfilled') setAnalytics((current) => ({ ...current, summary: analyticsHealth.value }))
    await loadIncidents()
    setBusy('')
  }

  useEffect(() => { void loadAll() }, [])

  async function runSearch(event: React.FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) })
    await loadIncidents(params.size ? `?${params}` : '')
    setView('incidents')
  }

  async function showRecent() {
    setBusy('incidents')
    try { setIncidents(await api.recentIncidents(hours)); setError(''); setView('incidents') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load recent incidents') }
    finally { setBusy('') }
  }

  function startCreate() {
    setForm({ ...blankIncident, incidentDateTime: localDateTime(new Date().toISOString()) })
    setEditing(false)
    setFormOpen(true)
  }

  function startEdit(incident: Incident) {
    setSelected(incident)
    setForm({ ...incident, incidentDateTime: localDateTime(incident.incidentDateTime) })
    setEditing(true)
    setFormOpen(true)
  }

  async function saveIncident(event: React.FormEvent) {
    event.preventDefault()
    setBusy('save')
    const payload: IncidentDraft = { ...form, incidentDateTime: form.incidentDateTime || new Date().toISOString().slice(0, 19) }
    try {
      if (editing && selected) await api.updateIncident(selected.id, payload)
      else await api.createIncident(payload)
      setFormOpen(false)
      setNotice(editing ? 'Incident updated' : 'Incident created')
      await loadIncidents()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save incident') }
    finally { setBusy('') }
  }

  async function openDetail(incident: Incident) {
    setSelected(incident)
    setDetail(null)
    try { setSelected(await api.incident(incident.id)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load incident details') }
  }

  async function changeStatus(incident: Incident, status: string) {
    try { await api.updateStatus(incident.id, status); await loadIncidents(); setNotice(`Incident #${incident.id} marked ${status.toLowerCase()}`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update status') }
  }

  async function assessIncident(incident: Incident) {
    setBusy(`assess-${incident.id}`)
    try { setDetail(await api.incidentAnalysis(incident.id)); setSelected(incident) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to assess incident') }
    finally { setBusy('') }
  }

  async function loadAnalytics() {
    setBusy('analytics')
    const keys = ['summary', 'categories', 'locations', 'trends', 'hours', 'incidents']
    const values = await Promise.allSettled(keys.map((key) => api.analytics(key)))
    const results: Record<string, unknown> = {}
    values.forEach((value, index) => {
      if (value.status === 'fulfilled') results[keys[index]] = value.value
      else results[keys[index]] = { error: value.reason instanceof Error ? value.reason.message : 'Request failed' }
    })
    setAnalytics(results)
    setBusy('')
  }

  async function submitAssessment(event: React.FormEvent) {
    event.preventDefault(); setBusy('assessment')
    try { setAssessment(await api.evaluate(assessmentForm)); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Assessment request failed') }
    finally { setBusy('') }
  }

  async function submitClassification(event: React.FormEvent) {
    event.preventDefault(); setBusy('classify')
    try { setClassification(await api.classify(triageText)); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Classification request failed') }
    finally { setBusy('') }
  }

  async function getPredictions(method: 'GET' | 'POST') {
    setBusy('predictions')
    try { setPredictions(method === 'POST' ? await api.predictSelected(incidents.map((incident) => incident.id)) : await api.predictions('?limit=50')); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Prediction request failed') }
    finally { setBusy('') }
  }

  async function runRetrain() {
    setBusy('retrain')
    try { setModelInfo(await api.retrain()); setNotice('Model retraining completed') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Retraining request failed') }
    finally { setBusy('') }
  }

  async function getModelInfo() {
    setBusy('model-info')
    try { setModelInfo(await api.modelInfo()); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to read model information') }
    finally { setBusy('') }
  }

  const total = typeof (analytics.summary as { totalIncidents?: unknown } | undefined)?.totalIncidents === 'number'
    ? (analytics.summary as { totalIncidents: number }).totalIncidents
    : services.incidents === 'online' ? incidents.length : null
  const onlineServices = Object.values(services).filter((state) => state === 'online').length
  const systemState = onlineServices === 3 ? 'LIVE SYSTEM' : onlineServices === 0 ? 'BACKENDS OFFLINE' : 'DEGRADED SYSTEM'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setView('overview')} aria-label="CivicShield overview">
          <span className="brand-mark"><Shield size={20} strokeWidth={2.2} /></span>
          <span><strong>CIVICSHIELD</strong><small>PUBLIC SAFETY SYSTEMS</small></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          <NavButton active={view === 'overview'} icon={<Activity size={17} />} onClick={() => setView('overview')}>Command overview</NavButton>
          <NavButton active={view === 'incidents'} icon={<ClipboardList size={17} />} onClick={() => setView('incidents')}>Incident register</NavButton>
          <NavButton active={view === 'analytics'} icon={<BarChart3 size={17} />} onClick={() => { setView('analytics'); void loadAnalytics() }}>Analytics</NavButton>
          <NavButton active={view === 'assessment'} icon={<Sparkles size={17} />} onClick={() => setView('assessment')}>Assessment tools</NavButton>
        </nav>
        <div className="sidebar-bottom">
          <div className="side-label">SERVICE STATUS</div>
          <ServiceItem name="Incident service" state={services.incidents} />
          <ServiceItem name="Analytics service" state={services.analytics} />
          <ServiceItem name="Triage model" state={services.triage} />
          <div className="sidebar-foot"><CircleHelp size={14} /> Operational decision support</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>OPERATIONS</span><span className="crumb-slash">/</span><strong>{viewTitle(view)}</strong></div>
          <div className="top-actions"><span className={`live-indicator ${onlineServices === 0 ? 'offline' : onlineServices < 3 ? 'degraded' : ''}`}><i /> {systemState}</span><button className="icon-button" title="Refresh service status and incidents" onClick={() => void loadAll()}><RefreshCw size={16} className={busy === 'refresh' ? 'spin' : ''} /></button><button className="icon-button notification" title="Notifications"><Bell size={16} /></button><div className="operator"><span className="operator-avatar">OC</span><span>Operations desk</span><ChevronDown size={14} /></div></div>
        </header>

        {error && <div className="alert alert-error" role="alert"><AlertTriangle size={16} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
        {notice && <div className="alert alert-success" role="status"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

        <section className="page-content">
          {view === 'overview' && <Overview incidents={incidents} total={total} onlineServices={onlineServices} incidentOnline={services.incidents === 'online'} hours={hours} setHours={setHours} onRecent={() => void showRecent()} onCreate={startCreate} onViewAll={() => { setView('incidents'); void loadIncidents() }} onSelect={(incident) => void openDetail(incident)} onAssess={(incident) => void assessIncident(incident)} busy={busy} />}
          {view === 'incidents' && <IncidentRegister incidents={incidents} query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} onSearch={runSearch} onCreate={startCreate} onSelect={(incident) => void openDetail(incident)} onEdit={startEdit} onStatus={changeStatus} onAssess={(incident) => void assessIncident(incident)} busy={busy} />}
          {view === 'analytics' && <AnalyticsView data={analytics} busy={busy} onRefresh={() => void loadAnalytics()} />}
          {view === 'assessment' && <AssessmentView form={assessmentForm} setForm={setAssessmentForm} onSubmit={submitAssessment} busy={busy} assessment={assessment} triageText={triageText} setTriageText={setTriageText} onClassify={submitClassification} classification={classification} onPredictions={getPredictions} predictions={predictions} onRetrain={runRetrain} onModelInfo={getModelInfo} modelInfo={modelInfo} />}
        </section>
      </main>

      {selected && !formOpen && <IncidentDrawer incident={selected} detail={detail} onClose={() => { setSelected(null); setDetail(null) }} onEdit={() => startEdit(selected)} onAssess={() => void assessIncident(selected)} busy={busy} />}
      {formOpen && <IncidentModal form={form} setForm={setForm} editing={editing} busy={busy} onClose={() => setFormOpen(false)} onSubmit={saveIncident} />}
    </div>
  )
}

function viewTitle(view: View) {
  return { overview: 'Command overview', incidents: 'Incident register', analytics: 'Analytics', assessment: 'Assessment tools' }[view]
}

function NavButton({ active, icon, onClick, children }: { active: boolean; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return <button className={`nav-button${active ? ' active' : ''}`} onClick={onClick}>{icon}<span>{children}</span>{active && <i />}</button>
}

function ServiceItem({ name, state }: { name: string; state: ServiceState }) {
  return <div className="service-item"><span className={`service-dot ${state}`} /><span>{name}</span><small>{state === 'checking' ? 'CHECKING' : state.toUpperCase()}</small></div>
}

function Overview({ incidents, total, onlineServices, incidentOnline, hours, setHours, onRecent, onCreate, onViewAll, onSelect, onAssess, busy }: {
  incidents: Incident[]; total: number | null; onlineServices: number; incidentOnline: boolean; hours: number; setHours: (value: number) => void; onRecent: () => void; onCreate: () => void; onViewAll: () => void; onSelect: (incident: Incident) => void; onAssess: (incident: Incident) => void; busy: string
}) {
  const openCount = incidents.filter((incident) => !['CLOSED', 'RESOLVED'].includes(incident.status?.toUpperCase())).length
  const criticalCount = incidents.filter((incident) => ['CRITICAL', 'HIGH'].includes(incident.severity?.toUpperCase())).length
  return <>
    <div className="page-heading"><div><div className="eyebrow">SITUATION ROOM <span>•</span> {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1>Command overview</h1><p>Active incident picture and response queue.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={onViewAll}><ClipboardList size={16} /> Incident register</button><button className="button button-primary" onClick={onCreate}><FilePlus2 size={16} /> Report incident</button></div></div>
    <div className="metric-grid">
      <Metric label="TOTAL RECORDS" value={total === null ? '—' : total.toLocaleString()} detail="Historical and active" icon={<ClipboardList size={18} />} color="green" />
      <Metric label="OPEN QUEUE" value={incidentOnline ? openCount.toString().padStart(2, '0') : '—'} detail="Currently in register" icon={<Clock3 size={18} />} color="blue" />
      <Metric label="HIGH PRIORITY" value={incidentOnline ? criticalCount.toString().padStart(2, '0') : '—'} detail="High or critical severity" icon={<Siren size={18} />} color="red" />
      <Metric label="SERVICE HEALTH" value={`${onlineServices} / 3`} detail="Services responding" icon={<Activity size={18} />} color="gold" />
    </div>
    <div className="section-row"><div><h2>Latest incidents</h2><p>Most recently recorded activity</p></div><button className="text-button" onClick={onViewAll}>View all incidents <span>↗</span></button></div>
    <IncidentTable incidents={incidents.slice(0, 6)} onSelect={onSelect} onAssess={onAssess} busy={busy} />
    <div className="bottom-strip"><div className="strip-copy"><span className="strip-icon"><Clock3 size={18} /></span><span><strong>Recent activity window</strong><small>Load reports from the previous number of hours</small></span></div><div className="inline-control"><select value={hours} onChange={(event) => setHours(Number(event.target.value))}><option value={1}>Last hour</option><option value={6}>Last 6 hours</option><option value={24}>Last 24 hours</option><option value={72}>Last 72 hours</option></select><button className="button button-dark" onClick={onRecent} disabled={busy === 'incidents'}>{busy === 'incidents' ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />} Load recent</button></div></div>
  </>
}

function Metric({ label, value, detail, icon, color }: { label: string; value: string; detail: string; icon: React.ReactNode; color: string }) {
  return <div className="metric"><div className="metric-top"><span>{label}</span><i className={`metric-icon ${color}`}>{icon}</i></div><strong className="metric-value">{value}</strong><small>{detail}</small></div>
}

function IncidentRegister({ incidents, query, setQuery, filters, setFilters, onSearch, onCreate, onSelect, onEdit, onStatus, onAssess, busy }: {
  incidents: Incident[]; query: string; setQuery: (value: string) => void; filters: IncidentFilters; setFilters: (value: IncidentFilters) => void; onSearch: (event: React.FormEvent) => void; onCreate: () => void; onSelect: (incident: Incident) => void; onEdit: (incident: Incident) => void; onStatus: (incident: Incident, status: string) => void; onAssess: (incident: Incident) => void; busy: string
}) {
  return <>
    <div className="page-heading"><div><div className="eyebrow">FIELD RECORDS <span>•</span> INCIDENT SERVICE</div><h1>Incident register</h1><p>Search, update, and assess reports in the operational queue.</p></div><button className="button button-primary" onClick={onCreate}><FilePlus2 size={16} /> New incident</button></div>
    <form className="filter-panel" onSubmit={onSearch}><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, description, location..." aria-label="Search incidents" /><button className="button button-primary" type="submit">Search</button></div><div className="filter-line"><span className="filter-label"><Filter size={14} /> FILTER BY</span><select aria-label="Filter by type" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">All types</option><option>Traffic Accident</option><option>Medical</option><option>Fire</option><option>Public Safety</option></select><select aria-label="Filter by severity" value={filters.severity} onChange={(event) => setFilters({ ...filters, severity: event.target.value })}><option value="">Any severity</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select><select aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Any status</option><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select><input className="location-filter" aria-label="Filter by location" value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} placeholder="Location" /></div></form>
    <div className="table-caption"><span>{incidents.length} records displayed</span><span>Sorted by incident time <ChevronDown size={13} /></span></div>
    <IncidentTable incidents={incidents} onSelect={onSelect} onAssess={onAssess} onEdit={onEdit} onStatus={onStatus} busy={busy} />
  </>
}

function IncidentTable({ incidents, onSelect, onAssess, onEdit, onStatus, busy }: {
  incidents: Incident[]; onSelect: (incident: Incident) => void; onAssess: (incident: Incident) => void; onEdit?: (incident: Incident) => void; onStatus?: (incident: Incident, status: string) => void; busy: string
}) {
  if (!incidents.length) return <div className="empty-state"><ClipboardList size={25} /><strong>No incident records to show</strong><span>Try changing the filters or report a new incident.</span></div>
  return <div className="table-wrap"><table><thead><tr><th>INCIDENT</th><th>TYPE / LOCATION</th><th>SEVERITY</th><th>STATUS</th><th>REPORTED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{incidents.map((incident) => <tr key={incident.id}>
    <td><button className="incident-link" onClick={() => onSelect(incident)}><span className="incident-id">CS-{String(incident.id).padStart(4, '0')}</span><strong>{incident.title || incident.description?.slice(0, 48) || 'Untitled incident'}</strong></button></td>
    <td><span className="cell-main">{incident.type || 'Unclassified'}</span><span className="cell-sub"><MapPin size={12} /> {incident.location || 'Location not recorded'}</span></td>
    <td><span className={`severity severity-${(incident.severity || 'unknown').toLowerCase()}`}><i />{incident.severity || 'Unrated'}</span></td>
    <td><span className={`status status-${(incident.status || 'open').toLowerCase().replaceAll('_', '-')}`}>{(incident.status || 'OPEN').replaceAll('_', ' ')}</span></td>
    <td className="date-cell">{dateLabel(incident.incidentDateTime)}</td>
    <td><div className="row-actions"><button className="small-action" title="View incident" onClick={() => onSelect(incident)}>View</button><button className="small-action" title="Run incident analysis" onClick={() => onAssess(incident)} disabled={busy === `assess-${incident.id}`}>{busy === `assess-${incident.id}` ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}</button>{onEdit && <button className="small-action" title="Edit incident" onClick={() => onEdit(incident)}>Edit</button>}{onStatus && incident.status?.toUpperCase() !== 'CLOSED' && <button className="small-action" title="Close incident" onClick={() => onStatus(incident, 'CLOSED')}>Close</button>}</div></td>
  </tr>)}</tbody></table></div>
}

function AnalyticsView({ data, busy, onRefresh }: { data: Record<string, unknown>; busy: string; onRefresh: () => void }) {
  const summary = data.summary as Record<string, unknown> | undefined
  return <>
    <div className="page-heading"><div><div className="eyebrow">PATTERNS & VOLUME <span>•</span> ANALYTICS SERVICE</div><h1>Analytics</h1><p>Historical records and incident distribution across the dataset.</p></div><button className="button button-secondary" onClick={onRefresh} disabled={busy === 'analytics'}>{busy === 'analytics' ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} Refresh all</button></div>
    <div className="metric-grid analytics-metrics"><Metric label="HISTORICAL INCIDENTS" value={String(summary?.totalIncidents ?? '—')} detail="Analytics dataset" icon={<ClipboardList size={18} />} color="green" /><Metric label="CATEGORY GROUPS" value={String(Object.keys((data.categories as object) || {}).length || '—')} detail="Distinct categories" icon={<BarChart3 size={18} />} color="blue" /><Metric label="LOCATIONS" value={String(Object.keys((data.locations as object) || {}).length || '—')} detail="Distinct locations" icon={<MapPin size={18} />} color="gold" /><Metric label="HOURLY BINS" value={String(Object.keys((data.hours as object) || {}).length || '—')} detail="Time-of-day distribution" icon={<Clock3 size={18} />} color="red" /></div>
    <div className="analytics-grid"><DataPanel title="Incident categories" endpoint="GET /api/analytics/categories" value={data.categories} /><DataPanel title="Incident locations" endpoint="GET /api/analytics/locations" value={data.locations} /><DataPanel title="Daily trend" endpoint="GET /api/analytics/trends" value={data.trends} /><DataPanel title="Hourly activity" endpoint="GET /api/analytics/hours" value={data.hours} /></div>
    <DataPanel title="Dataset records" endpoint="GET /api/analytics/incidents" value={data.incidents} wide />
  </>
}

function DataPanel({ title, endpoint, value, wide }: { title: string; endpoint: string; value: unknown; wide?: boolean }) {
  const rows = value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value as Record<string, unknown>) : []
  const error = value && typeof value === 'object' && 'error' in value ? String((value as { error: unknown }).error) : ''
  return <section className={`data-panel${wide ? ' wide' : ''}`}><div className="data-panel-head"><div><h3>{title}</h3><span>{endpoint}</span></div><span className="panel-mark"><BarChart3 size={16} /></span></div>{error ? <div className="panel-error">{error}</div> : Array.isArray(value) ? <pre className="json-preview">{pretty(value.slice(0, 12))}{value.length > 12 ? `\n... ${value.length - 12} more records` : ''}</pre> : rows.length ? <div className="bar-list">{rows.slice(0, 8).map(([label, count], index) => { const max = Math.max(...rows.map(([, n]) => Number(n) || 0), 1); const width = Math.max(3, ((Number(count) || 0) / max) * 100); return <div className="bar-row" key={label}><span title={label}>{label}</span><div className="bar-track"><i style={{ width: `${width}%`, animationDelay: `${index * 45}ms` }} /></div><strong>{String(count)}</strong></div> })}</div> : <div className="panel-empty">No data returned. Check analytics service status.</div>}</section>
}

function AssessmentView({ form, setForm, onSubmit, busy, assessment, triageText, setTriageText, onClassify, classification, onPredictions, predictions, onRetrain, onModelInfo, modelInfo }: {
  form: AssessmentForm; setForm: (form: AssessmentForm) => void; onSubmit: (event: React.FormEvent) => void; busy: string; assessment: Record<string, unknown> | null; triageText: string; setTriageText: (value: string) => void; onClassify: (event: React.FormEvent) => void; classification: Record<string, unknown> | null; onPredictions: (method: 'GET' | 'POST') => void; predictions: Record<string, unknown> | null; onRetrain: () => void; onModelInfo: () => void; modelInfo: Record<string, unknown> | null
}) {
  return <>
    <div className="page-heading"><div><div className="eyebrow">DECISION SUPPORT <span>•</span> ADVISORY ONLY</div><h1>Assessment tools</h1><p>Rule-based evaluation and model-backed triage endpoints.</p></div></div>
    <div className="advisory-note"><Shield size={17} /><span>Assessments are decision support only. They do not dispatch responders or replace authorised review.</span></div>
    <div className="tool-grid">
      <section className="tool-panel"><PanelTitle icon={<Sparkles size={16} />} title="Decision support assessment" endpoint="POST /api/analysis/evaluate" /><form onSubmit={onSubmit} className="tool-form"><div className="form-grid"><label>Incident type<input required value={form.incidentType} onChange={(event) => setForm({ ...form, incidentType: event.target.value })} placeholder="e.g. Traffic accident" /></label><label>Location<input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Address or area" /></label><label>Date and time<input required type="datetime-local" value={form.dateTime} onChange={(event) => setForm({ ...form, dateTime: event.target.value })} /></label><label>Reported severity<select value={form.reportedSeverity} onChange={(event) => setForm({ ...form, reportedSeverity: event.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label></div><label>Description<textarea required maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the reported situation" rows={3} /></label><button className="button button-primary" disabled={busy === 'assessment'}>{busy === 'assessment' ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} Evaluate incident</button></form>{assessment && <ResultBlock title="Assessment response" value={assessment} />}</section>
      <section className="tool-panel"><PanelTitle icon={<Siren size={16} />} title="Incident classifier" endpoint="POST /api/v1/classify-incident" /><form onSubmit={onClassify} className="tool-form"><label>Description<textarea required value={triageText} onChange={(event) => setTriageText(event.target.value)} rows={5} placeholder="Enter an incident description for model classification" /></label><button className="button button-primary" disabled={busy === 'classify'}>{busy === 'classify' ? <LoaderCircle className="spin" size={15} /> : <Activity size={15} />} Classify description</button></form>{classification && <ResultBlock title="Classifier response" value={classification} />}</section>
      <section className="tool-panel"><PanelTitle icon={<BarChart3 size={16} />} title="Batch predictions" endpoint="GET /api/v1/predict-incidents · POST /api/v1/predict-incidents" /><p className="tool-description">Run predictions for up to 50 stored incidents, or submit the incidents currently loaded in the register by ID.</p><div className="button-row"><button className="button button-secondary" onClick={() => onPredictions('GET')} disabled={busy === 'predictions'}><Search size={15} /> Predict latest 50</button><button className="button button-secondary" onClick={() => onPredictions('POST')} disabled={busy === 'predictions'}><ClipboardList size={15} /> Predict loaded IDs</button></div>{predictions && <ResultBlock title="Prediction response" value={predictions} />}</section>
      <section className="tool-panel"><PanelTitle icon={<RefreshCw size={16} />} title="Model management" endpoint="POST /api/v1/retrain · GET /api/v1/model-info · GET /health" /><p className="tool-description">Retrain against historical database records or inspect the active model metrics.</p><div className="button-row"><button className="button button-primary" onClick={onRetrain} disabled={busy === 'retrain'}>{busy === 'retrain' ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />} Retrain model</button><button className="button button-secondary" onClick={onModelInfo} disabled={busy === 'model-info'}><Activity size={15} /> Model info</button></div>{modelInfo && <ResultBlock title="Model response" value={modelInfo} />}</section>
    </div>
  </>
}

function PanelTitle({ icon, title, endpoint }: { icon: React.ReactNode; title: string; endpoint: string }) {
  return <div className="tool-title"><span className="tool-icon">{icon}</span><div><h2>{title}</h2><small>{endpoint}</small></div></div>
}

function ResultBlock({ title, value }: { title: string; value: unknown }) {
  const result = asRecord(value)
  const isAssessment = 'recommendedPriority' in result
  const isClassifier = 'category_confidence' in result
  const isPredictions = Array.isArray(result.predictions)
  const kind = isAssessment ? 'ASSESSMENT' : isClassifier ? 'MODEL CLASSIFICATION' : isPredictions ? 'BATCH RESULTS' : 'MODEL STATUS'

  return <section className="result-block" aria-label={title}>
    <header className="result-heading"><h3>{title}</h3><span>{kind}</span></header>
    {isAssessment ? <AssessmentResult result={result} />
      : isClassifier ? <ClassifierResult result={result} />
        : isPredictions ? <PredictionsResult result={result} />
          : <ModelResult result={result} />}
  </section>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function resultLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function readableValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not available'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 3 })
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object' ? Object.values(asRecord(item)).map(readableValue).join(' · ') : readableValue(item)).join(', ')
  if (typeof value === 'object') return Object.entries(asRecord(value)).map(([key, item]) => `${resultLabel(key)}: ${readableValue(item)}`).join(' · ')
  return String(value)
}

function ResultFields({ value, omit = [] }: { value: Record<string, unknown>; omit?: string[] }) {
  const fields = Object.entries(value).filter(([key, item]) => !omit.includes(key) && item !== null && item !== undefined && item !== '')
  if (!fields.length) return null
  return <dl className="result-fields">{fields.map(([key, item]) => <div key={key}><dt>{resultLabel(key)}</dt><dd>{readableValue(item)}</dd></div>)}</dl>
}

function ResultHero({ label, value, detail, tone = 'green' }: { label: string; value: unknown; detail?: string; tone?: string }) {
  return <div className={`result-hero tone-${tone}`}><div><span>{label}</span><strong>{readableValue(value)}</strong>{detail && <small>{detail}</small>}</div></div>
}

function ConfidenceMeter({ label, value }: { label: string; value: unknown }) {
  const score = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0
  return <div className="confidence-meter"><div><span>{label}</span><strong>{Math.round(score * 100)}%</strong></div><div className="confidence-track"><i style={{ width: `${score * 100}%` }} /></div></div>
}

function SignalList({ value }: { value: unknown }) {
  const signals = asRecord(value)
  const entries = Object.entries(signals)
  if (!entries.length) return <p className="result-muted">No signals were returned.</p>
  return <div className="signal-list">{entries.map(([name, active]) => <span className={`signal-chip ${active ? 'signal-active' : 'signal-clear'}`} key={name}><i />{resultLabel(name)}<strong>{active ? 'Detected' : 'Not detected'}</strong></span>)}</div>
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="result-section"><h4>{title}</h4>{children}</div>
}

function AssessmentResult({ result }: { result: Record<string, unknown> }) {
  const priority = String(result.recommendedPriority || 'Priority unavailable')
  const priorityTone = /critical|p1/i.test(priority) ? 'red' : /high|p2/i.test(priority) ? 'amber' : 'green'
  const factors = Array.isArray(result.factors) ? result.factors : []
  const resources = Array.isArray(result.recommendedResources) ? result.recommendedResources : []
  const personnel = Array.isArray(result.recommendedPersonnel) ? result.recommendedPersonnel : []
  const score = typeof result.priorityScore === 'number' ? result.priorityScore : null
  const nlp = asRecord(result.nlpPrediction)
  const categoryConfidence = nlp.categoryConfidence ?? nlp.category_confidence
  const priorityConfidence = nlp.priorityConfidence ?? nlp.priority_confidence
  const needsReview = nlp.needsReview ?? nlp.needs_review

  return <div className="result-content">
    <div className="result-topline"><ResultHero label="Recommended priority" value={priority} detail={String(result.incidentClassification || '')} tone={priorityTone} />{score !== null && <div className="score-tile"><span>PRIORITY SCORE</span><strong>{score}<small> / 100</small></strong><div className="score-track"><i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div></div>}</div>
    {Boolean(result.recommendationRationale) && <div className="result-callout"><strong>Why this priority</strong><p>{String(result.recommendationRationale)}</p></div>}
    {Boolean(result.recommendedAction) && <div className="action-card"><span>RECOMMENDED ACTION</span><p>{String(result.recommendedAction)}</p></div>}
    {factors.length > 0 && <ResultSection title="Contributing factors"><ul className="result-list">{factors.map((factor, index) => <li key={`${String(factor)}-${index}`}>{readableValue(factor)}</li>)}</ul></ResultSection>}
    {Object.keys(asRecord(result.signals)).length > 0 && <ResultSection title="Detected signals"><SignalList value={result.signals} /></ResultSection>}
    {Boolean(nlp.category) && <ResultSection title="AI model cross-check"><div className="crosscheck-head"><strong>{readableValue(nlp.category)}</strong><span className={`priority-tag tone-${/high|critical/i.test(String(nlp.priority)) ? 'red' : 'green'}`}>{readableValue(nlp.priority)}</span></div><div className="confidence-grid"><ConfidenceMeter label="Category confidence" value={categoryConfidence} /><ConfidenceMeter label="Priority confidence" value={priorityConfidence} /></div>{needsReview === true && <p className="review-note">Model recommends human review.</p>}</ResultSection>}
    {resources.length > 0 && <ResultSection title="Suggested resources"><ul className="recommendation-list">{resources.map((resource, index) => { const item = asRecord(resource); return <li key={`${String(item.category)}-${index}`}><strong>{readableValue(item.category)}</strong><span>{readableValue(item.reason)}</span></li> })}</ul></ResultSection>}
    {personnel.length > 0 && <ResultSection title="Suggested personnel"><div className="tag-list">{personnel.map((person, index) => <span key={`${String(person)}-${index}`}>{readableValue(person)}</span>)}</div></ResultSection>}
    {Object.keys(asRecord(result.historicalEvidence)).length > 0 && <ResultSection title="Historical context"><ResultFields value={asRecord(result.historicalEvidence)} /></ResultSection>}
  </div>
}

function ClassifierResult({ result }: { result: Record<string, unknown> }) {
  const priority = String(result.priority || 'Priority unavailable')
  const priorityTone = /critical|high/i.test(priority) ? 'red' : /medium/i.test(priority) ? 'amber' : 'green'
  return <div className="result-content">
    <div className="result-topline"><ResultHero label="Predicted category" value={result.category} tone="blue" /><div className={`priority-tag tone-${priorityTone}`}>{priority}</div></div>
    <div className="confidence-grid"><ConfidenceMeter label="Category confidence" value={result.category_confidence} /><ConfidenceMeter label="Priority confidence" value={result.priority_confidence} /></div>
    {result.needs_review === true && <div className="review-banner"><AlertTriangle size={15} /><span><strong>Review recommended</strong>Model confidence or signals require operator review.</span></div>}
    <ResultSection title="Extracted signals"><SignalList value={result.extracted_signals} /></ResultSection>
  </div>
}

function PredictionsResult({ result }: { result: Record<string, unknown> }) {
  const predictions = Array.isArray(result.predictions) ? result.predictions : []
  return <div className="result-content">
    <div className="prediction-summary"><strong>{readableValue(result.count ?? predictions.length)}</strong><span>incidents assessed</span></div>
    {predictions.length ? <div className="prediction-table-wrap"><table className="prediction-table"><thead><tr><th>Incident</th><th>Predicted category</th><th>Priority</th><th>Confidence</th><th>Review</th></tr></thead><tbody>{predictions.map((prediction, index) => {
      const item = asRecord(prediction)
      const confidence = typeof item.category_confidence === 'number' ? `${Math.round(item.category_confidence * 100)}%` : '—'
      return <tr key={`${String(item.incident_id ?? index)}-${index}`}><td>{item.incident_id === undefined ? `#${index + 1}` : `#${readableValue(item.incident_id)}`}</td><td>{readableValue(item.category)}</td><td>{readableValue(item.priority)}</td><td>{confidence}</td><td><span className={`review-tag ${item.needs_review ? 'review-needed' : 'review-clear'}`}>{item.needs_review ? 'Review' : 'Clear'}</span></td></tr>
    })}</tbody></table></div> : <p className="result-muted">No predictions were returned. Check the selected incident IDs or model service.</p>}
  </div>
}

function ModelResult({ result }: { result: Record<string, unknown> }) {
  const metrics = asRecord(result.metrics)
  const values = Object.keys(metrics).length ? metrics : result
  const status = result.status
  return <div className="result-content">
    {status !== undefined && <div className="model-status"><span className="service-dot online" />{readableValue(status)}</div>}
    <ResultFields value={values} omit={['status', 'metrics']} />
  </div>
}

function IncidentDrawer({ incident, detail, onClose, onEdit, onAssess, busy }: { incident: Incident; detail: Record<string, unknown> | null; onClose: () => void; onEdit: () => void; onAssess: () => void; busy: string }) {
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="incident-drawer"><div className="drawer-head"><div><div className="eyebrow">INCIDENT DETAIL <span>•</span> CS-{String(incident.id).padStart(4, '0')}</div><h2>{incident.title || 'Incident record'}</h2></div><button className="icon-button" aria-label="Close details" onClick={onClose}><X size={17} /></button></div><div className="drawer-actions"><button className="button button-secondary" onClick={onEdit}>Edit record</button><button className="button button-primary" onClick={onAssess} disabled={busy === 'incidents'}>{busy === 'incidents' ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />} Analyze</button></div><div className="detail-list"><Detail label="Type" value={incident.type} /><Detail label="Location" value={incident.location} /><Detail label="Date reported" value={dateLabel(incident.incidentDateTime)} /><Detail label="Severity" value={incident.severity} /><Detail label="Status" value={incident.status} /><div className="detail-item detail-full"><span>Description</span><p>{incident.description || 'No description provided.'}</p></div></div>{detail && <div className="detail-analysis"><h3>Incident analysis</h3><small>GET /api/incidents/{incident.id}/analysis</small><pre>{pretty(detail)}</pre></div>}</aside></div>
}

function Detail({ label, value }: { label: string; value?: string }) {
  return <div className="detail-item"><span>{label}</span><strong>{value || 'Not provided'}</strong></div>
}

function IncidentModal({ form, setForm, editing, busy, onClose, onSubmit }: { form: FormState; setForm: (form: FormState) => void; editing: boolean; busy: string; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="incident-modal" onSubmit={onSubmit}><div className="modal-heading"><div><div className="eyebrow">INCIDENT SERVICE <span>•</span> {editing ? 'PUT' : 'POST'} /api/incidents</div><h2>{editing ? 'Update incident' : 'Report an incident'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close form"><X size={17} /></button></div><div className="modal-form-grid"><label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={180} /></label><label>Incident type<input required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label><label>Location<input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label>Date and time<input type="datetime-local" value={form.incidentDateTime} onChange={(event) => setForm({ ...form, incidentDateTime: event.target.value })} /></label><label>Severity<select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select></label><label className="modal-full">Description<textarea required maxLength={2000} rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div><div className="modal-footer"><span>Required fields are validated by the incident service.</span><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy === 'save'}>{busy === 'save' ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}{editing ? 'Save changes' : 'Create incident'}</button></div></form></div>
}

export default App