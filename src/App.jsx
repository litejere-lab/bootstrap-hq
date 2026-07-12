import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Wallet, Users, ListTodo, Plus, Trash2, X, ArrowRight, ArrowLeft, Fuel, Menu } from 'lucide-react';

// ---------- storage helpers ----------
const KEYS = { settings: 'settings', expenses: 'expenses', customers: 'customers', tasks: 'tasks' };

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    return res ? JSON.parse(res.value) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error('storage save failed', key, e);
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtMoney = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const monthKey = (d) => d.slice(0, 7);
const thisMonth = () => new Date().toISOString().slice(0, 7);

const VENTURE_COLORS = {
  '__default': '#8A8F9C',
};
const VENTURE_PALETTE = ['#E8A33D', '#45C9B0', '#8B7FD9', '#E8615A', '#5AA9E6', '#D9B45A'];
function ventureColor(name, list) {
  const idx = list.indexOf(name);
  return VENTURE_PALETTE[idx % VENTURE_PALETTE.length] || VENTURE_COLORS.__default;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [settings, setSettings] = useState({ cashOnHand: 0, businessName: 'Bootstrap HQ' });
  const [expenses, setExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, e, c, t] = await Promise.all([
        loadKey(KEYS.settings, { cashOnHand: 0, businessName: 'Bootstrap HQ' }),
        loadKey(KEYS.expenses, []),
        loadKey(KEYS.customers, []),
        loadKey(KEYS.tasks, []),
      ]);
      setSettings(s);
      setExpenses(e);
      setCustomers(c);
      setTasks(t);
      setLoading(false);
    })();
  }, []);

  // persist on change (after initial load)
  useEffect(() => { if (!loading) saveKey(KEYS.settings, settings); }, [settings, loading]);
  useEffect(() => { if (!loading) saveKey(KEYS.expenses, expenses); }, [expenses, loading]);
  useEffect(() => { if (!loading) saveKey(KEYS.customers, customers); }, [customers, loading]);
  useEffect(() => { if (!loading) saveKey(KEYS.tasks, tasks); }, [tasks, loading]);

  const ventures = useMemo(() => {
    const set = new Set();
    expenses.forEach(e => e.venture && set.add(e.venture));
    customers.forEach(c => c.venture && set.add(c.venture));
    tasks.forEach(t => t.venture && set.add(t.venture));
    return Array.from(set);
  }, [expenses, customers, tasks]);

  // ---------- derived financials ----------
  const mrr = useMemo(() => customers.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.mrr || 0), 0), [customers]);
  const monthlyBurn = useMemo(() => {
    const recurring = expenses.filter(e => e.recurring).reduce((s, e) => s + Number(e.amount || 0), 0);
    const oneTimeThisMonth = expenses.filter(e => !e.recurring && monthKey(e.date) === thisMonth()).reduce((s, e) => s + Number(e.amount || 0), 0);
    return recurring + oneTimeThisMonth;
  }, [expenses]);
  const netBurn = monthlyBurn - mrr;
  const cashOnHand = Number(settings.cashOnHand || 0);
  const runwayMonths = netBurn > 0 ? cashOnHand / netBurn : Infinity;

  if (loading) {
    return (
      <div style={{ ...rootStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
        <FontImports />
        <p style={{ fontFamily: 'Inter, sans-serif', color: '#8A8F9C', fontSize: 14 }}>Loading your business data…</p>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'roadmap', label: 'Roadmap', icon: ListTodo },
  ];

  return (
    <div style={rootStyle}>
      <FontImports />
      <div style={{ display: 'flex', minHeight: 600, background: 'var(--bg)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>

        {/* Sidebar - desktop */}
        <div className="hq-sidebar-desktop" style={{ width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '24px 16px', flexShrink: 0 }}>
          <SidebarContent settings={settings} setSettings={setSettings} navItems={navItems} tab={tab} setTab={setTab} />
        </div>

        {/* Mobile top bar */}
        <div className="hq-topbar-mobile" style={{ display: 'none', position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 16px', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{settings.businessName}</div>
          <button onClick={() => setMobileNavOpen(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 4 }}>
            <Menu size={22} />
          </button>
        </div>
        {mobileNavOpen && (
          <div className="hq-mobile-drawer" style={{ display: 'none', position: 'absolute', top: 50, left: 0, right: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px', zIndex: 20 }}>
            <SidebarContent settings={settings} setSettings={setSettings} navItems={navItems} tab={tab} setTab={(t) => { setTab(t); setMobileNavOpen(false); }} compact />
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', minWidth: 0 }} className="hq-main">
          {tab === 'dashboard' && (
            <Dashboard cashOnHand={cashOnHand} mrr={mrr} monthlyBurn={monthlyBurn} runwayMonths={runwayMonths} expenses={expenses} ventures={ventures} />
          )}
          {tab === 'finances' && (
            <Finances settings={settings} setSettings={setSettings} expenses={expenses} setExpenses={setExpenses} ventures={ventures} monthlyBurn={monthlyBurn} />
          )}
          {tab === 'customers' && (
            <Customers customers={customers} setCustomers={setCustomers} ventures={ventures} mrr={mrr} />
          )}
          {tab === 'roadmap' && (
            <Roadmap tasks={tasks} setTasks={setTasks} ventures={ventures} />
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .hq-sidebar-desktop { display: none !important; }
          .hq-topbar-mobile { display: flex !important; }
          .hq-mobile-drawer { display: block !important; }
          .hq-main { padding-top: 70px !important; }
        }
      `}</style>
    </div>
  );
}

function FontImports() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
    `}</style>
  );
}

const rootStyle = {
  '--bg': '#12141B',
  '--surface': '#1B1E28',
  '--surface-2': '#232733',
  '--border': '#2E323F',
  '--text': '#ECEDF1',
  '--text-dim': '#8A8F9C',
  '--amber': '#E8A33D',
  '--teal': '#45C9B0',
  '--red': '#E8615A',
  '--violet': '#8B7FD9',
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text)',
  position: 'relative',
  width: '100%',
};

function SidebarContent({ settings, setSettings, navItems, tab, setTab, compact }) {
  return (
    <div>
      {!compact && (
        <div style={{ marginBottom: 32 }}>
          <input
            value={settings.businessName}
            onChange={(e) => setSettings(s => ({ ...s, businessName: e.target.value }))}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text)',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18,
              width: '100%', padding: 0, outline: 'none',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>Operator console</div>
        </div>
      )}
      <nav style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: 4, flexWrap: 'wrap' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none',
                background: active ? 'var(--surface-2)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-dim)',
                fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: active ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', width: compact ? 'auto' : '100%',
              }}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ================= DASHBOARD =================

function Dashboard({ cashOnHand, mrr, monthlyBurn, runwayMonths, expenses, ventures }) {
  const recent = useMemo(() => {
    return [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
  }, [expenses]);

  return (
    <div>
      <h1 style={h1Style}>Dashboard</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4, marginBottom: 24 }}>Your business, at a glance.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Cash on hand" value={fmtMoney(cashOnHand)} />
        <StatCard label="MRR" value={fmtMoney(mrr)} accent="var(--teal)" />
        <StatCard label="Monthly burn" value={fmtMoney(monthlyBurn)} accent="var(--red)" />
        <StatCard label="Runway" value={runwayMonths === Infinity ? '∞' : `${runwayMonths.toFixed(1)} mo`} accent="var(--amber)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 24, alignItems: 'start' }} className="hq-dash-grid">
        <RunwayGauge months={runwayMonths} />

        <div>
          <h3 style={h3Style}>Recent expenses</h3>
          {recent.length === 0 ? (
            <EmptyState text="No expenses logged yet. Add one from the Finances tab." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recent.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface)', borderRadius: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.vendor || 'Untitled'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span>{e.date}</span>
                      {e.venture && <VentureTag name={e.venture} list={ventures} small />}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'var(--red)', flexShrink: 0, marginLeft: 12 }}>-{fmtMoney(e.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 700px) { .hq-dash-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '14px 16px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: accent || 'var(--text)' }}>{value}</div>
    </div>
  );
}

function RunwayGauge({ months }) {
  const cap = 24;
  const isInfinite = months === Infinity;
  const fraction = isInfinite ? 1 : Math.max(0, Math.min(1, months / cap));
  const color = isInfinite ? '#45C9B0' : months < 3 ? '#E8615A' : months < 9 ? '#E8A33D' : '#45C9B0';
  const r = 90;
  const circumference = Math.PI * r;
  const dash = fraction * circumference;
  const needleAngle = -90 + fraction * 180;

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '20px 16px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Fuel size={13} /> Runway
      </div>
      <svg viewBox="0 0 240 150" width="100%" style={{ maxWidth: 260, display: 'block', margin: '0 auto' }}>
        <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="var(--surface-2)" strokeWidth="14" strokeLinecap="round" />
        <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`} />
        <line x1="120" y1="120" x2="120" y2="45" stroke={color} strokeWidth="3" strokeLinecap="round"
          transform={`rotate(${needleAngle} 120 120)`} />
        <circle cx="120" cy="120" r="7" fill={color} />
        <text x="120" y="112" textAnchor="middle" fill="var(--text)" fontFamily="JetBrains Mono, monospace" fontSize="22" fontWeight="700">
          {isInfinite ? '∞' : months.toFixed(1)}
        </text>
        <text x="120" y="130" textAnchor="middle" fill="var(--text-dim)" fontFamily="Inter, sans-serif" fontSize="11">
          {isInfinite ? 'profitable' : 'months left'}
        </text>
      </svg>
    </div>
  );
}

function VentureTag({ name, list, small }) {
  const color = ventureColor(name, list);
  return (
    <span style={{
      display: 'inline-block', padding: small ? '1px 6px' : '2px 8px', borderRadius: 999,
      fontSize: small ? 11 : 12, background: color + '22', color, whiteSpace: 'nowrap',
    }}>{name}</span>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: '24px 16px', background: 'var(--surface)', borderRadius: 8, color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', border: '1px dashed var(--border)' }}>
      {text}
    </div>
  );
}

const h1Style = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, margin: 0 };
const h3Style = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 10 };

const inputStyle = {
  background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
  borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%',
};
const btnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--amber)', color: '#12141B',
  border: 'none', borderRadius: 6, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnGhost = { ...btnStyle, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)' };

// ================= FINANCES =================

function Finances({ settings, setSettings, expenses, setExpenses, ventures, monthlyBurn }) {
  const [form, setForm] = useState(blankExpense());
  function blankExpense() {
    return { date: new Date().toISOString().slice(0, 10), vendor: '', category: '', venture: '', amount: '', recurring: false };
  }
  function addExpense() {
    if (!form.vendor || !form.amount) return;
    setExpenses(list => [...list, { ...form, id: uid(), amount: Number(form.amount) }]);
    setForm(blankExpense());
  }
  function removeExpense(id) {
    setExpenses(list => list.filter(e => e.id !== id));
  }

  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach(e => { map[e.category || 'Uncategorized'] = (map[e.category || 'Uncategorized'] || 0) + Number(e.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);
  const totalSpend = byCategory.reduce((s, [, v]) => s + v, 0) || 1;

  const sorted = useMemo(() => [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [expenses]);

  return (
    <div>
      <h1 style={h1Style}>Finances</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4, marginBottom: 20 }}>Track spend and know your burn rate.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Cash on hand</span>
          <input
            type="number"
            value={settings.cashOnHand}
            onChange={(e) => setSettings(s => ({ ...s, cashOnHand: e.target.value }))}
            style={{ ...inputStyle, width: 120, background: 'transparent', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 15, padding: 0 }}
          />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', marginRight: 8 }}>Monthly burn</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: 'var(--red)' }}>{fmtMoney(monthlyBurn)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }} className="hq-fin-grid">
        <div>
          <h3 style={h3Style}>Add expense</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 10 }}>
            <input style={inputStyle} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <input style={inputStyle} placeholder="Vendor" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
            <input style={inputStyle} placeholder="Category" list="cat-list" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <datalist id="cat-list">
              {['Software / tools', 'Hosting', 'Contractors', 'Marketing', 'Legal / admin', 'Other'].map(c => <option key={c} value={c} />)}
            </datalist>
            <input style={inputStyle} placeholder="Venture" list="venture-list" value={form.venture} onChange={e => setForm(f => ({ ...f, venture: e.target.value }))} />
            <datalist id="venture-list">
              {ventures.map(v => <option key={v} value={v} />)}
            </datalist>
            <input style={inputStyle} type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
            <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} />
            Recurring monthly
          </label>
          <button style={btnStyle} onClick={addExpense}><Plus size={14} /> Add expense</button>

          <h3 style={{ ...h3Style, marginTop: 28 }}>All expenses</h3>
          {sorted.length === 0 ? <EmptyState text="No expenses yet." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sorted.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface)', borderRadius: 6 }}>
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{e.vendor}{e.recurring && <span style={{ fontSize: 11, color: 'var(--amber)', marginLeft: 6 }}>recurring</span>}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {e.date} · {e.category || 'Uncategorized'} {e.venture && <VentureTag name={e.venture} list={ventures} small />}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'var(--red)' }}>-{fmtMoney(e.amount)}</span>
                    <button onClick={() => removeExpense(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={h3Style}>Spend by category</h3>
          {byCategory.length === 0 ? <EmptyState text="Nothing to show yet." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byCategory.map(([cat, amt]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 3 }}>
                    <span>{cat}</span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtMoney(amt)}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(amt / totalSpend) * 100}%`, background: 'var(--amber)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 760px) { .hq-fin-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

// ================= CUSTOMERS =================

function Customers({ customers, setCustomers, ventures, mrr }) {
  const blank = { name: '', mrr: '', status: 'active', venture: '', startDate: new Date().toISOString().slice(0, 10) };
  const [form, setForm] = useState(blank);

  function addCustomer() {
    if (!form.name) return;
    setCustomers(list => [...list, { ...form, id: uid(), mrr: Number(form.mrr || 0) }]);
    setForm(blank);
  }
  function updateStatus(id, status) {
    setCustomers(list => list.map(c => c.id === id ? { ...c, status } : c));
  }
  function removeCustomer(id) {
    setCustomers(list => list.filter(c => c.id !== id));
  }

  const statusColor = { active: 'var(--teal)', trial: 'var(--amber)', churned: 'var(--red)' };

  return (
    <div>
      <h1 style={h1Style}>Customers</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4, marginBottom: 4 }}>Every subscriber, and where your MRR comes from.</p>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, color: 'var(--teal)', fontWeight: 700, marginBottom: 20 }}>{fmtMoney(mrr)} <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>MRR</span></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 10, maxWidth: 720 }}>
        <input style={inputStyle} placeholder="Customer name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <input style={inputStyle} type="number" placeholder="MRR" value={form.mrr} onChange={e => setForm(f => ({ ...f, mrr: e.target.value }))} />
        <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="churned">Churned</option>
        </select>
        <input style={inputStyle} placeholder="Venture" list="cust-venture-list" value={form.venture} onChange={e => setForm(f => ({ ...f, venture: e.target.value }))} />
        <datalist id="cust-venture-list">{ventures.map(v => <option key={v} value={v} />)}</datalist>
        <input style={inputStyle} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
      </div>
      <button style={{ ...btnStyle, marginBottom: 24 }} onClick={addCustomer}><Plus size={14} /> Add customer</button>

      {customers.length === 0 ? <EmptyState text="No customers yet. Add your first subscriber above." /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {customers.map(c => (
            <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <button onClick={() => removeCustomer(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, marginBottom: 8 }}>{fmtMoney(c.mrr)}<span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Inter, sans-serif' }}>/mo</span></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12, color: statusColor[c.status] }}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="churned">Churned</option>
                </select>
                {c.venture && <VentureTag name={c.venture} list={ventures} small />}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Since {c.startDate}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= ROADMAP =================

function Roadmap({ tasks, setTasks, ventures }) {
  const blank = { title: '', venture: '', dueDate: '', status: 'backlog' };
  const [form, setForm] = useState(blank);
  const columns = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'progress', label: 'In progress' },
    { id: 'done', label: 'Done' },
  ];

  function addTask() {
    if (!form.title) return;
    setTasks(list => [...list, { ...form, id: uid() }]);
    setForm(blank);
  }
  function moveTask(id, dir) {
    const order = ['backlog', 'progress', 'done'];
    setTasks(list => list.map(t => {
      if (t.id !== id) return t;
      const idx = order.indexOf(t.status);
      const next = order[Math.max(0, Math.min(order.length - 1, idx + dir))];
      return { ...t, status: next };
    }));
  }
  function removeTask(id) {
    setTasks(list => list.filter(t => t.id !== id));
  }

  return (
    <div>
      <h1 style={h1Style}>Roadmap</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4, marginBottom: 20 }}>What's next across every venture.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 10, maxWidth: 720 }}>
        <input style={inputStyle} placeholder="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <input style={inputStyle} placeholder="Venture" list="task-venture-list" value={form.venture} onChange={e => setForm(f => ({ ...f, venture: e.target.value }))} />
        <datalist id="task-venture-list">{ventures.map(v => <option key={v} value={v} />)}</datalist>
        <input style={inputStyle} type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
      </div>
      <button style={{ ...btnStyle, marginBottom: 24 }} onClick={addTask}><Plus size={14} /> Add task</button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="hq-kanban">
        {columns.map(col => (
          <div key={col.id}>
            <h3 style={{ ...h3Style, color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>{col.label} · {tasks.filter(t => t.status === col.id).length}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.filter(t => t.status === col.id).map(t => (
                <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                    <button onClick={() => removeTask(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2, flexShrink: 0 }}><X size={13} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    {t.venture && <VentureTag name={t.venture} list={ventures} small />}
                    {t.dueDate && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.dueDate}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button disabled={col.id === 'backlog'} onClick={() => moveTask(t.id, -1)} style={{ ...btnGhost, padding: '4px 8px', opacity: col.id === 'backlog' ? 0.3 : 1 }}><ArrowLeft size={12} /></button>
                    <button disabled={col.id === 'done'} onClick={() => moveTask(t.id, 1)} style={{ ...btnGhost, padding: '4px 8px', opacity: col.id === 'done' ? 0.3 : 1 }}><ArrowRight size={12} /></button>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '12px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8 }}>Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`@media (max-width: 700px) { .hq-kanban { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
