import { useState } from 'react'
import './App.css'
const BASE = '/api'

function band(s) {
  if (s >= 800) return 'Excellent'
  if (s >= 740) return 'Very good'
  if (s >= 670) return 'Good'
  if (s >= 580) return 'Fair'
  return 'Poor'
}

function Gauge({ data }) {
  const has = data && data.score != null
  const pct = has ? Math.max(0, Math.min(100, (Number(data.score) - 300) / 6)) : 0
  return (
    <div className="gauge">
      <svg viewBox="0 0 150 90" aria-hidden="true">
        <path d="M10 80 A65 65 0 0 1 140 80" fill="none" stroke="var(--line)" strokeWidth="12" strokeLinecap="round" />
        <path d="M10 80 A65 65 0 0 1 140 80" fill="none" stroke="var(--accent)" strokeWidth="12"
          strokeLinecap="round" pathLength="100" strokeDasharray={`${pct} 100`} />
      </svg>
      <div>
        <div className="big">{has ? data.score : '—'}</div>
        <div className="muted">{has ? `${band(Number(data.score))} · ${data.date ?? ''}` : 'No score loaded'}</div>
      </div>
    </div>
  )
}

function Table({ rows }) {
  if (!Array.isArray(rows) || !rows.length) return <p className="muted">No records.</p>
  const flat = rows.map((r) => {
    const { creditScoreDetails, ...rest } = r
    return { ...rest, ...(creditScoreDetails || {}) }
  })
  const cols = [...new Set(flat.flatMap((r) => Object.keys(r)))]
  return (
    <table>
      <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {flat.map((r, i) => (
          <tr key={i}>{cols.map((c) => <td key={c}>{typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c] ?? '')}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

export default function App() {
  const [token, setToken] = useState(sessionStorage.getItem('token') || '')
  const [who, setWho] = useState(sessionStorage.getItem('who') || '')
  const [reg, setReg] = useState({ username: '', password: '', email: '' })
  const [login, setLogin] = useState({ username: '', password: '' })
  const [form, setForm] = useState({ userId: 1, score: 750, date: new Date().toISOString().slice(0, 10) })
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState(null)
  const [average, setAverage] = useState(null)
  const [toast, setToast] = useState(null)

  const flash = (text, ok = true) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function api(path, opts = {}) {
    const res = await fetch(BASE + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    return { res, data }
  }

  const run = (fn) => async () => {
    try { await fn() } catch (e) { flash(e.message, false) }
  }

  const payload = () => JSON.stringify({ userId: +form.userId, score: +form.score, date: form.date })
  const clearExtras = () => { setHistory(null); setAverage(null) }

  const register = run(async () => {
    await api('/users/register', { method: 'POST', body: JSON.stringify({ ...reg, role: 'USER' }) })
    flash('Registered. Now sign in.')
  })

  const signIn = run(async () => {
    const q = new URLSearchParams(login)
    const { res } = await api(`/users/login?${q}`, { method: 'POST' })
    const t = (res.headers.get('Authorization') || '').replace(/^Bearer /, '')
    setToken(t); setWho(login.username)
    sessionStorage.setItem('token', t); sessionStorage.setItem('who', login.username)
    flash('Signed in')
  })

  const signOut = () => { setToken(''); setWho(''); sessionStorage.clear() }

  const getLatest = run(async () => { const { data } = await api(`/score/${form.userId}`); setCurrent(data); clearExtras() })
  const calc = run(async () => { const { data } = await api('/score/calculate', { method: 'POST', body: payload() }); setCurrent(data); flash('Saved') })
  const update = run(async () => { const { data } = await api(`/score/${form.userId}`, { method: 'PUT', body: payload() }); setCurrent(data); flash('Updated') })
  const hist = run(async () => { const { data } = await api(`/score/history/${form.userId}`); setHistory(data); setAverage(null) })
  const avg = run(async () => { const { data } = await api('/score/average'); setAverage(Number(data)); setHistory(null) })
  const refresh = run(async () => { await api('/score/refresh', { method: 'PUT' }); flash('Refreshed') })
  const del = run(async () => {
    if (!confirm(`Delete scores for user ${form.userId}?`)) return
    await api(`/score/${form.userId}`, { method: 'DELETE' })
    setCurrent(null); clearExtras(); flash('Deleted')
  })

  const set = (setter) => (k) => (e) => setter((s) => ({ ...s, [k]: e.target.value }))

  return (
    <>
      <header>
        <h1>Credit Score Analysis Tool</h1>
        <div>
          <span className="muted">{who ? `Signed in as ${who}` : 'Not signed in'} </span>
          {who && <button className="ghost" onClick={signOut}>Sign out</button>}
        </div>
      </header>

      <main>
        <section className="card">
          <h2>Register</h2>
          <label>Username</label><input value={reg.username} onChange={set(setReg)('username')} />
          <label>Password</label><input type="password" value={reg.password} onChange={set(setReg)('password')} />
          <label>Email</label><input type="email" value={reg.email} onChange={set(setReg)('email')} />
          <div className="row"><button onClick={register}>Register</button></div>
        </section>

        <section className="card">
          <h2>Sign in</h2>
          <label>Username</label><input value={login.username} onChange={set(setLogin)('username')} />
          <label>Password</label><input type="password" value={login.password} onChange={set(setLogin)('password')} />
          <div className="row"><button onClick={signIn}>Sign in</button></div>
        </section>

        <section className="card wide">
          <h2>Credit score</h2>
          <Gauge data={current} />
          <div className="grid3">
            <div><label>User ID</label><input type="number" value={form.userId} onChange={set(setForm)('userId')} /></div>
            <div><label>Score (300–900)</label><input type="number" value={form.score} onChange={set(setForm)('score')} /></div>
            <div><label>Date</label><input type="date" value={form.date} onChange={set(setForm)('date')} /></div>
          </div>
          <div className="row">
            <button onClick={getLatest}>Get latest</button>
            <button onClick={calc}>Calculate / save</button>
            <button className="ghost" onClick={update}>Update</button>
            <button className="ghost" onClick={hist}>History</button>
            <button className="ghost" onClick={avg}>Average</button>
            <button className="ghost" onClick={refresh}>Refresh all</button>
            <button className="danger" onClick={del}>Delete</button>
          </div>
          {history && <Table rows={history} />}
          {average != null && <p className="muted">Average score across all records: <b>{average.toFixed(1)}</b></p>}
        </section>
      </main>

      {toast && <div className={`toast ${toast.ok ? 'ok' : 'err'}`}>{toast.text}</div>}
    </>
  )
}