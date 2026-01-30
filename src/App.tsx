import { useState, useEffect, useMemo, useCallback } from 'react';
import './styles.css';

// ============================================
// TYPES
// ============================================

interface Entry {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

interface Budget {
  id: string;
  category: string;
  allocated: number;
  color: string;
}

interface Holding {
  id: string;
  name: string;
  type: 'account' | 'stock';
  value: number;
  previousValue: number;
  icon: string;
  iconClass: string;
  symbol?: string; // Stock ticker symbol for real-time data
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  icon: string;
  paid: boolean;
}

interface Settings {
  userName: string;
  payAmount: number;
  payFrequency: 'weekly' | 'biweekly' | 'monthly';
  firstPayDate: string;
  bufferAmount: number;
  savingsGoal: number;
  finnhubApiKey: string;
}

interface AppState {
  entries: Entry[];
  budgets: Budget[];
  holdings: Holding[];
  bills: Bill[];
  settings: Settings;
}

type TimeFilter = 'cycle' | 'mtd' | 'ytd';

// ============================================
// ICONS
// ============================================

const Icons = {
  Dashboard: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
  Portfolio: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>),
  Entries: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>),
  Budgets: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>),
  Settings: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>),
  Search: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>),
  Bell: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>),
  Logout: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>),
  Lightbulb: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" /></svg>),
  Wallet: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" /></svg>),
  Shield: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  PiggyBank: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" /></svg>),
  Calendar: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>),
  DollarSign: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>),
  TrendingUp: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18" /><polyline points="17,6 23,6 23,12" /></svg>),
  TrendingDown: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,18 13.5,8.5 8.5,13.5 1,6" /><polyline points="17,18 23,18 23,12" /></svg>),
  Plus: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>),
  X: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
  Edit: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>),
  Trash: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>),
  Check: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12" /></svg>),
  Refresh: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>),
  Stock: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>),
};

// ============================================
// DEFAULT DATA
// ============================================

const defaultSettings: Settings = {
  userName: 'Luke',
  payAmount: 0,
  payFrequency: 'biweekly',
  firstPayDate: '',
  bufferAmount: 0,
  savingsGoal: 0,
  finnhubApiKey: '',
};

const defaultBudgets: Budget[] = [
  { id: '1', category: 'Groceries (protected)', allocated: 0, color: '#22c55e' },
  { id: '2', category: 'Transportation', allocated: 0, color: '#3b82f6' },
  { id: '3', category: 'Subscriptions', allocated: 0, color: '#8b5cf6' },
  { id: '4', category: 'Clothing', allocated: 0, color: '#ec4899' },
  { id: '5', category: 'Alcohol', allocated: 0, color: '#f97316' },
  { id: '6', category: 'Flexible Fun', allocated: 0, color: '#eab308' },
  { id: '7', category: 'Health', allocated: 0, color: '#06b6d4' },
  { id: '8', category: 'Personal Care', allocated: 0, color: '#ef4444' },
  { id: '9', category: 'Gifts', allocated: 0, color: '#22c55e' },
  { id: '10', category: 'Savings (locked)', allocated: 0, color: '#3b82f6' },
  { id: '11', category: 'Fixed bills', allocated: 0, color: '#8b5cf6' },
  { id: '12', category: 'Buffer', allocated: 0, color: '#ec4899' },
  { id: '13', category: 'Bonuses', allocated: 0, color: '#f97316' },
];

const defaultHoldings: Holding[] = [];

const defaultBills: Bill[] = [];

const defaultEntries: Entry[] = [];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substr(2);
const formatCurrency = (v: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const formatDate = (d: string): string => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';
const formatDateLong = (d: string): string => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--';
const getDaysUntil = (d: string): number => { if (!d) return 0; const t = new Date(); t.setHours(0,0,0,0); return Math.ceil((new Date(d).getTime() - t.getTime()) / 86400000); };
const getPercentChange = (c: number, p: number): number => p === 0 ? 0 : ((c - p) / p) * 100;

function getNextPayday(firstPayDate: string, freq: 'weekly' | 'biweekly' | 'monthly'): string {
  if (!firstPayDate) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  let payday = new Date(firstPayDate); payday.setHours(0,0,0,0);
  const interval = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30;
  while (payday <= today) payday.setDate(payday.getDate() + interval);
  return payday.toISOString().split('T')[0];
}

function getCurrentCycleStart(firstPayDate: string, freq: 'weekly' | 'biweekly' | 'monthly'): string {
  if (!firstPayDate) return new Date().toISOString().split('T')[0];
  const today = new Date(); today.setHours(0,0,0,0);
  let cycleStart = new Date(firstPayDate); cycleStart.setHours(0,0,0,0);
  const interval = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30;
  while (cycleStart.getTime() + interval * 86400000 <= today.getTime()) cycleStart.setDate(cycleStart.getDate() + interval);
  return cycleStart.toISOString().split('T')[0];
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

function getYearStart(): string {
  return new Date().getFullYear() + '-01-01';
}

// ============================================
// FINNHUB API
// ============================================

async function fetchStockPrice(symbol: string, apiKey: string): Promise<{ price: number; prevClose: number } | null> {
  if (!apiKey || !symbol) return null;
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${apiKey}`);
    const data = await response.json();
    if (data.c && data.pc) {
      return { price: data.c, prevClose: data.pc };
    }
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
  }
  return null;
}

// ============================================
// LOCAL STORAGE
// ============================================

const STORAGE_KEY = 'moneyhub_data';
const loadState = (): AppState => { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch {} return { entries: defaultEntries, budgets: defaultBudgets, holdings: defaultHoldings, bills: defaultBills, settings: defaultSettings }; };
const saveState = (state: AppState): void => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} };

// ============================================
// COMPONENTS
// ============================================

function Sidebar({ activeNav, setActiveNav }: { activeNav: string; setActiveNav: (n: string) => void }) {
  const items = [{ id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard }, { id: 'holdings', label: 'Holdings', icon: Icons.Portfolio }, { id: 'entries', label: 'Entries', icon: Icons.Entries }, { id: 'budgets', label: 'Budgets', icon: Icons.Budgets }, { id: 'settings', label: 'Settings', icon: Icons.Settings }];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><h1>MoneyHub</h1></div>
      <div className="sidebar-section-label">User Panel</div>
      <nav className="sidebar-nav">{items.map(i => (<button key={i.id} className={`nav-item ${activeNav === i.id ? 'active' : ''}`} onClick={() => setActiveNav(i.id)}><i.icon /><span>{i.label}</span></button>))}</nav>
      <div className="sidebar-footer"><div className="sidebar-quote"><div className="quote-icon"><Icons.Lightbulb /></div><div className="quote-title">Biweekly Model</div><div className="quote-text">Budget resets every payday. Stay on track with envelope budgeting.</div></div></div>
      <button className="sidebar-logout"><Icons.Logout /><span>Logout</span></button>
    </aside>
  );
}

function Topbar({ userName, pageTitle }: { userName: string; pageTitle: string }) {
  return (
    <header className="topbar">
      <div className="topbar-left"><h2>Hello {userName}</h2><span className="topbar-subtitle">{pageTitle}</span></div>
      <div className="topbar-right">
        <div className="search-bar"><Icons.Search /><input type="text" placeholder="Search transactions..." /></div>
        <button className="notification-btn"><Icons.Bell /><span className="notification-badge"></span></button>
        <div className="profile-chip"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Aphex_Twin_logo.svg/1200px-Aphex_Twin_logo.svg.png" alt="Profile" /></div>
      </div>
    </header>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{title}</h3><button className="modal-close" onClick={onClose}><Icons.X /></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function SetupPrompt({ onGoToSettings }: { onGoToSettings: () => void }) {
  return (
    <div className="setup-prompt">
      <div className="setup-prompt-content">
        <Icons.Settings />
        <h3>Welcome to MoneyHub!</h3>
        <p>To get started, please configure your pay cycle and savings goals in Settings.</p>
        <button className="btn-primary" onClick={onGoToSettings}>Go to Settings</button>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================

function DashboardPage({ state, setState, onGoToSettings }: { state: AppState; setState: (s: AppState) => void; onGoToSettings: () => void }) {
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('cycle');
  
  const needsSetup = !state.settings.firstPayDate || state.settings.payAmount === 0;
  
  const nextPayday = getNextPayday(state.settings.firstPayDate, state.settings.payFrequency);
  const cycleStart = getCurrentCycleStart(state.settings.firstPayDate, state.settings.payFrequency);
  const monthStart = getMonthStart();
  const yearStart = getYearStart();
  const daysUntilPayday = getDaysUntil(nextPayday);
  
  // Get filter start date based on selected time filter
  const filterStartDate = timeFilter === 'cycle' ? cycleStart : timeFilter === 'mtd' ? monthStart : yearStart;
  const filterLabel = timeFilter === 'cycle' ? 'This Cycle' : timeFilter === 'mtd' ? 'Month to Date' : 'Year to Date';
  
  const filteredEntries = state.entries.filter(e => e.date >= filterStartDate && e.type === 'expense');
  const filteredSpent = filteredEntries.reduce((s, e) => s + e.amount, 0);
  const filteredIncome = state.entries.filter(e => e.date >= filterStartDate && e.type === 'income').reduce((s, e) => s + e.amount, 0);
  
  // For budget calculations, use cycle data
  const cycleEntries = state.entries.filter(e => e.date >= cycleStart && e.type === 'expense');
  const cycleSpent = cycleEntries.reduce((s, e) => s + e.amount, 0);
  const budgetRemaining = state.settings.payAmount - cycleSpent;
  const budgetPercent = state.settings.payAmount > 0 ? ((budgetRemaining / state.settings.payAmount) * 100).toFixed(1) : '0';
  
  const savingsYTD = state.entries.filter(e => e.date >= yearStart && e.type === 'income').reduce((s, e) => s + e.amount, 0) * 0.15;
  const totalHoldings = state.holdings.reduce((s, h) => s + h.value, 0);
  const categorySpending = state.budgets.map(b => { const spent = filteredEntries.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0); return { ...b, spent, remaining: b.allocated - spent }; });
  const topCategory = [...categorySpending].sort((a, b) => b.spent - a.spent)[0];
  
  const monthlyData = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthEntries = state.entries.filter(e => e.date.startsWith(monthStr));
      months.push({ month: monthName, income: monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0), expense: monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0) });
    }
    return months;
  }, [state.entries]);

  const handleAddEntry = (entry: Omit<Entry, 'id'>) => { const ns = { ...state, entries: [{ ...entry, id: generateId() }, ...state.entries] }; setState(ns); saveState(ns); setShowAddEntry(false); };

  const budgetCards = [
    { id: 'budget', label: 'Budget Remaining', value: formatCurrency(budgetRemaining), badge: `${budgetPercent}%`, color: 'purple', icon: Icons.Wallet, ticker: 'BUDGET' },
    { id: 'buffer', label: 'Buffer Available', value: formatCurrency(state.settings.bufferAmount), badge: '100%', color: 'cyan', icon: Icons.Shield, ticker: 'BUFFER' },
    { id: 'savings', label: 'Savings YTD', value: formatCurrency(savingsYTD), badge: state.settings.savingsGoal > 0 ? `${((savingsYTD / state.settings.savingsGoal) * 100).toFixed(0)}%` : '0%', color: 'orange', icon: Icons.PiggyBank, ticker: 'SAVE' },
    { id: 'payday', label: 'Next Payday', value: nextPayday ? formatDate(nextPayday) : 'Not Set', badge: nextPayday ? `${daysUntilPayday}d` : '--', color: 'green', icon: Icons.Calendar, ticker: 'PAY' },
    { id: 'total', label: 'Total Holdings', value: formatCurrency(totalHoldings), badge: '+0.0%', color: 'pink', icon: Icons.DollarSign, ticker: 'TOTAL' },
  ];

  if (needsSetup) {
    return (
      <div className="dashboard">
        <SetupPrompt onGoToSettings={onGoToSettings} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div>
        <div className="section-header">
          <div className="section-title-row">
            <div className="section-title">My Budget</div>
            <div className="time-filter-tabs">
              <button className={`time-filter-tab ${timeFilter === 'cycle' ? 'active' : ''}`} onClick={() => setTimeFilter('cycle')}>Cycle</button>
              <button className={`time-filter-tab ${timeFilter === 'mtd' ? 'active' : ''}`} onClick={() => setTimeFilter('mtd')}>MTD</button>
              <button className={`time-filter-tab ${timeFilter === 'ytd' ? 'active' : ''}`} onClick={() => setTimeFilter('ytd')}>YTD</button>
            </div>
          </div>
          <button className="add-btn-small" onClick={() => setShowAddEntry(true)}><Icons.Plus /><span>Add Entry</span></button>
        </div>
        <div className="budget-cards-row">{budgetCards.map(c => (<div key={c.id} className={`budget-card ${c.color}`}><div className="budget-card-header"><div className="budget-card-icon"><c.icon /><span>{c.ticker}</span></div><span className="budget-card-badge">{c.badge}</span></div><div className="budget-card-label">{c.label}</div><div className="budget-card-value">{c.value}</div></div>))}</div>
      </div>
      <div className="holdings-section"><div className="section-title">Holdings</div>
        {state.holdings.length === 0 ? (
          <div className="empty-state-small">No holdings yet. Add accounts or stocks in the Holdings page.</div>
        ) : (
          <div className="holdings-grid">{state.holdings.slice(0, 4).map(h => { const change = getPercentChange(h.value, h.previousValue); return (<div key={h.id} className="holding-card"><div className="holding-header"><div className={`holding-icon ${h.iconClass}`}>{h.icon}</div><div className="holding-info"><h4>{h.name}</h4><span>{h.type === 'stock' && h.symbol ? h.symbol : h.type}</span></div></div><div className="holding-value">{formatCurrency(h.value)}</div><div className={`holding-change ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? <Icons.TrendingUp /> : <Icons.TrendingDown />}<span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span></div></div>); })}</div>
        )}
      </div>
      <div className="panels-grid">
        <div className="panel balance-panel">
          <div className="panel-header"><span className="panel-title">{filterLabel}</span></div>
          <div className="balance-card primary"><div className="balance-card-label">{timeFilter === 'cycle' ? 'Cycle Budget' : 'Income'}</div><div className="balance-card-row"><div className="balance-card-amount">{formatCurrency(timeFilter === 'cycle' ? state.settings.payAmount : filteredIncome)}</div><span className="balance-card-badge">{timeFilter === 'cycle' ? state.settings.payFrequency : filterLabel}</span></div></div>
          <div className="balance-card secondary"><div className="balance-card-label">Spent {filterLabel}</div><div className="balance-card-row"><div className="balance-card-amount">{formatCurrency(filteredSpent)}</div><button className="balance-action-btn" onClick={() => setShowAddEntry(true)}><Icons.Plus /></button></div></div>
          {topCategory && topCategory.spent > 0 && (<div className="top-category"><div className="top-category-label">Top Category</div><div className="category-item"><div className="category-icon" style={{ background: `linear-gradient(135deg, ${topCategory.color}, ${topCategory.color}88)` }}>{topCategory.category.slice(0, 2).toUpperCase()}</div><div className="category-info"><h4>{topCategory.category}</h4><div className="category-details"><div className="category-detail"><span className="category-detail-label">Budget</span><span className="category-detail-value">{formatCurrency(topCategory.allocated)}</span></div><div className="category-detail"><span className="category-detail-label">Spent</span><span className="category-detail-value">{formatCurrency(topCategory.spent)}</span></div></div></div><div className="category-stats"><div className="category-ticker">{topCategory.category.slice(0, 4).toUpperCase()}</div><div className="category-change">-{formatCurrency(topCategory.spent)}</div></div></div></div>)}
        </div>
        <div className="panel chart-panel">
          <div className="panel-header"><span className="panel-title">Spending Trend</span><div className="panel-tabs">{['1D', '5D', '1M', '6M', '1Y'].map(t => (<button key={t} className={`panel-tab ${t === '1M' ? 'active' : ''}`}>{t}</button>))}</div></div>
          <div className="chart-container"><svg className="chart-svg" viewBox="0 0 500 100" preserveAspectRatio="none"><defs><linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" /><stop offset="100%" stopColor="rgba(139, 92, 246, 0)" /></linearGradient></defs>{(() => { const expenses = monthlyData.map(d => d.expense); const max = Math.max(...expenses, 1); const points = expenses.map((v, i) => `${(i / (expenses.length - 1)) * 500},${100 - (v / max) * 80}`); const pathD = 'M ' + points.join(' L '); return (<><path className="chart-area" d={pathD + ' L 500,100 L 0,100 Z'} /><path className="chart-line" d={pathD} /></>); })()}</svg></div>
          <div className="chart-stats"><div className="chart-stat"><span className="chart-stat-label">This Month</span><span className="chart-stat-value">{formatCurrency(monthlyData[5]?.expense || 0)}</span></div><div className="chart-stat"><span className="chart-stat-label">Last Month</span><span className="chart-stat-value">{formatCurrency(monthlyData[4]?.expense || 0)}</span></div><div className="chart-stat"><span className="chart-stat-label">6 Mo Avg</span><span className="chart-stat-value">{formatCurrency(monthlyData.reduce((s, d) => s + d.expense, 0) / 6)}</span></div><div className="chart-stat"><span className="chart-stat-label">Cycle Start</span><span className="chart-stat-value">{formatDate(cycleStart)}</span></div></div>
        </div>
        <div className="panel snapshot-panel">
          <div className="panel-header"><span className="panel-title">Snapshot</span></div>
          <div className="snapshot-main"><div className="snapshot-value">{formatCurrency(budgetRemaining)}</div><div className="snapshot-label">Budget Remaining</div></div>
          <div className="snapshot-grid">
            <div className="snapshot-item"><div className="snapshot-item-label">Daily Limit</div><div className="snapshot-item-value">{formatCurrency(budgetRemaining / Math.max(daysUntilPayday, 1))}</div></div>
            <div className="snapshot-item"><div className="snapshot-item-label">Days Left</div><div className="snapshot-item-value highlight">{daysUntilPayday}</div></div>
            {categorySpending.filter(c => c.allocated > 0).slice(0, 2).map(c => (<div key={c.id} className="snapshot-item"><div className="snapshot-item-label">{c.category}</div><div className={`snapshot-item-value ${c.remaining < 0 ? 'danger' : c.remaining < c.allocated * 0.2 ? 'warning' : ''}`}>{formatCurrency(c.remaining)}</div></div>))}
            <div className="snapshot-range"><div className="range-labels"><span className="range-label">Cycle Start</span><span className="range-label">Cycle End</span></div><div className="range-values"><span className="range-value">$0</span><span className="range-value">{formatCurrency(state.settings.payAmount)}</span></div><div className="range-bar"><div className="range-indicator" style={{ left: `${Math.min(100, state.settings.payAmount > 0 ? (cycleSpent / state.settings.payAmount) * 100 : 0)}%` }}></div></div><div className="range-current">{formatCurrency(budgetRemaining)} left</div></div>
          </div>
        </div>
      </div>
      <div className="bottom-grid">
        <div className="panel analytics-panel">
          <div className="panel-header"><span className="panel-title">Cash Flow Analytics</span></div>
          <div className="chart-container"><div className="bar-chart">{monthlyData.map((d, i) => { const max = Math.max(...monthlyData.flatMap(m => [m.income, m.expense]), 1); return (<div key={i} className="bar-item"><div className="bar income" style={{ height: `${(d.income / max) * 180}px` }}></div><div className="bar expense" style={{ height: `${(d.expense / max) * 180}px` }}></div><span className="bar-label">{d.month}</span></div>); })}</div></div>
          <div className="chart-legend"><div className="legend-item"><span className="legend-dot income"></span><span>Income</span></div><div className="legend-item"><span className="legend-dot expense"></span><span>Expenses</span></div></div>
        </div>
        <div className="panel watchlist-panel">
          <div className="watchlist-header"><span className="panel-title">Upcoming Bills</span></div>
          {state.bills.length === 0 ? (
            <div className="empty-state-small">No bills configured yet.</div>
          ) : (
            <div className="watchlist-items">{state.bills.sort((a, b) => a.dueDay - b.dueDay).slice(0, 6).map(b => { const today = new Date().getDate(); const status = b.paid ? 'paid' : b.dueDay <= today + 3 ? 'due' : 'upcoming'; return (<div key={b.id} className="watchlist-item"><div className="watchlist-icon">{b.icon}</div><div className="watchlist-info"><div className="watchlist-name">{b.name}</div><div className="watchlist-date">Due: {b.dueDay}th</div></div><div className="watchlist-amount"><div className="watchlist-value">{formatCurrency(b.amount)}</div><div className={`watchlist-status ${status}`}>{status === 'due' ? 'Due Soon' : status === 'paid' ? 'Paid' : 'Upcoming'}</div></div></div>); })}</div>
          )}
        </div>
      </div>
      <Modal isOpen={showAddEntry} onClose={() => setShowAddEntry(false)} title="Add Entry"><EntryForm budgets={state.budgets} onSubmit={handleAddEntry} onCancel={() => setShowAddEntry(false)} /></Modal>
    </div>
  );
}

function EntryForm({ budgets, onSubmit, onCancel, initialData }: { budgets: Budget[]; onSubmit: (e: Omit<Entry, 'id'>) => void; onCancel: () => void; initialData?: Entry }) {
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || budgets[0]?.category || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!amount || !description) return; onSubmit({ type, amount: parseFloat(amount), description, category: type === 'income' ? 'Income' : category, date }); };
  return (<form className="entry-form" onSubmit={handleSubmit}><div className="form-row"><div className="form-group"><label>Type</label><div className="toggle-group"><button type="button" className={`toggle-btn ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')}>Expense</button><button type="button" className={`toggle-btn ${type === 'income' ? 'active' : ''}`} onClick={() => setType('income')}>Income</button></div></div></div><div className="form-row"><div className="form-group"><label>Amount</label><input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required /></div><div className="form-group"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div></div><div className="form-group"><label>Description</label><input type="text" placeholder="What was this for?" value={description} onChange={e => setDescription(e.target.value)} required /></div>{type === 'expense' && (<div className="form-group"><label>Category</label><select value={category} onChange={e => setCategory(e.target.value)}>{budgets.map(b => (<option key={b.id} value={b.category}>{b.category}</option>))}</select></div>)}<div className="form-actions"><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="btn-primary">Save Entry</button></div></form>);
}

// ============================================
// HOLDINGS PAGE
// ============================================

function HoldingsPage({ state, setState }: { state: AppState; setState: (s: AppState) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const totalValue = state.holdings.reduce((s, h) => s + h.value, 0);
  const totalPrev = state.holdings.reduce((s, h) => s + h.previousValue, 0);
  const totalChange = getPercentChange(totalValue, totalPrev);
  
  const stockHoldings = state.holdings.filter(h => h.type === 'stock' && h.symbol);
  const accountHoldings = state.holdings.filter(h => h.type === 'account');
  
  const refreshStockPrices = useCallback(async () => {
    if (!state.settings.finnhubApiKey || stockHoldings.length === 0) return;
    setRefreshing(true);
    const updatedHoldings = [...state.holdings];
    for (const holding of stockHoldings) {
      if (holding.symbol) {
        const data = await fetchStockPrice(holding.symbol, state.settings.finnhubApiKey);
        if (data) {
          const idx = updatedHoldings.findIndex(h => h.id === holding.id);
          if (idx !== -1) {
            updatedHoldings[idx] = { ...updatedHoldings[idx], value: data.price, previousValue: data.prevClose };
          }
        }
      }
    }
    const ns = { ...state, holdings: updatedHoldings };
    setState(ns);
    saveState(ns);
    setRefreshing(false);
  }, [state, stockHoldings, setState]);

  useEffect(() => {
    if (state.settings.finnhubApiKey && stockHoldings.length > 0) {
      refreshStockPrices();
    }
  }, [state.settings.finnhubApiKey]);
  
  const handleSave = (h: Holding) => { const ns = { ...state, holdings: editingId ? state.holdings.map(x => x.id === editingId ? h : x) : [...state.holdings, { ...h, id: generateId() }] }; setState(ns); saveState(ns); setEditingId(null); setShowAdd(false); };
  const handleDelete = (id: string) => { const ns = { ...state, holdings: state.holdings.filter(h => h.id !== id) }; setState(ns); saveState(ns); };
  
  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1>Holdings</h1><p className="page-subtitle">Track your investments, accounts, and stocks</p></div>
        <div className="header-actions">
          {stockHoldings.length > 0 && state.settings.finnhubApiKey && (
            <button className="btn-secondary" onClick={refreshStockPrices} disabled={refreshing}>
              <Icons.Refresh /><span>{refreshing ? 'Refreshing...' : 'Refresh Prices'}</span>
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Icons.Plus /><span>Add Holding</span></button>
        </div>
      </div>
      <div className="summary-cards"><div className="summary-card large"><div className="summary-label">Total Portfolio Value</div><div className="summary-value">{formatCurrency(totalValue)}</div><div className={`summary-change ${totalChange >= 0 ? 'positive' : 'negative'}`}>{totalChange >= 0 ? <Icons.TrendingUp /> : <Icons.TrendingDown />}<span>{totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}%</span></div></div></div>
      
      {stockHoldings.length > 0 && (
        <>
          <div className="holdings-section-header"><Icons.Stock /><h3>Stocks</h3>{!state.settings.finnhubApiKey && <span className="api-hint">Add Finnhub API key in Settings for real-time prices</span>}</div>
          <div className="holdings-list">{stockHoldings.map(h => { const change = getPercentChange(h.value, h.previousValue); const alloc = totalValue > 0 ? (h.value / totalValue) * 100 : 0; return (<div key={h.id} className="holding-list-item"><div className={`holding-icon stock`}><Icons.Stock /></div><div className="holding-details"><h4>{h.symbol}</h4><span>{h.name}</span></div><div className="holding-allocation"><div className="allocation-bar"><div className="allocation-fill" style={{ width: `${alloc}%` }}></div></div><span>{alloc.toFixed(1)}% of portfolio</span></div><div className="holding-values"><div className="holding-current">{formatCurrency(h.value)}</div><div className={`holding-change ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</div></div><div className="holding-actions"><button className="icon-btn" onClick={() => setEditingId(h.id)}><Icons.Edit /></button><button className="icon-btn danger" onClick={() => handleDelete(h.id)}><Icons.Trash /></button></div></div>); })}</div>
        </>
      )}
      
      {accountHoldings.length > 0 && (
        <>
          <div className="holdings-section-header"><Icons.Portfolio /><h3>Accounts</h3></div>
          <div className="holdings-list">{accountHoldings.map(h => { const change = getPercentChange(h.value, h.previousValue); const alloc = totalValue > 0 ? (h.value / totalValue) * 100 : 0; return (<div key={h.id} className="holding-list-item"><div className={`holding-icon ${h.iconClass}`}>{h.icon}</div><div className="holding-details"><h4>{h.name}</h4><span>{h.type}</span></div><div className="holding-allocation"><div className="allocation-bar"><div className="allocation-fill" style={{ width: `${alloc}%` }}></div></div><span>{alloc.toFixed(1)}% of portfolio</span></div><div className="holding-values"><div className="holding-current">{formatCurrency(h.value)}</div><div className={`holding-change ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</div></div><div className="holding-actions"><button className="icon-btn" onClick={() => setEditingId(h.id)}><Icons.Edit /></button><button className="icon-btn danger" onClick={() => handleDelete(h.id)}><Icons.Trash /></button></div></div>); })}</div>
        </>
      )}
      
      {state.holdings.length === 0 && (
        <div className="empty-state">
          <Icons.Portfolio />
          <h3>No holdings yet</h3>
          <p>Add your investment accounts or individual stocks to track your portfolio.</p>
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Icons.Plus /><span>Add Holding</span></button>
        </div>
      )}
      
      <Modal isOpen={showAdd || editingId !== null} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? 'Edit Holding' : 'Add Holding'}><HoldingForm holding={editingId ? state.holdings.find(h => h.id === editingId) : undefined} onSubmit={handleSave} onCancel={() => { setShowAdd(false); setEditingId(null); }} /></Modal>
    </div>
  );
}

function HoldingForm({ holding, onSubmit, onCancel }: { holding?: Holding; onSubmit: (h: Holding) => void; onCancel: () => void }) {
  const [holdingType, setHoldingType] = useState<'account' | 'stock'>(holding?.type || 'account');
  const [name, setName] = useState(holding?.name || '');
  const [symbol, setSymbol] = useState(holding?.symbol || '');
  const [value, setValue] = useState(holding?.value?.toString() || '');
  const [icon, setIcon] = useState(holding?.icon || '💰');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (holdingType === 'stock') {
      onSubmit({
        id: holding?.id || '',
        name: name || symbol.toUpperCase(),
        type: 'stock',
        symbol: symbol.toUpperCase(),
        value: parseFloat(value) || 0,
        previousValue: holding?.previousValue || parseFloat(value) || 0,
        icon: '📈',
        iconClass: 'stock',
      });
    } else {
      onSubmit({
        id: holding?.id || '',
        name,
        type: 'account',
        value: parseFloat(value) || 0,
        previousValue: holding?.previousValue || parseFloat(value) || 0,
        icon,
        iconClass: name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4),
      });
    }
  };
  
  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Type</label>
        <div className="toggle-group">
          <button type="button" className={`toggle-btn ${holdingType === 'account' ? 'active' : ''}`} onClick={() => setHoldingType('account')}>Account</button>
          <button type="button" className={`toggle-btn ${holdingType === 'stock' ? 'active' : ''}`} onClick={() => setHoldingType('stock')}>Stock</button>
        </div>
      </div>
      
      {holdingType === 'stock' ? (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Stock Symbol</label>
              <input type="text" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" required />
            </div>
            <div className="form-group">
              <label>Shares (optional)</label>
              <input type="number" step="0.0001" value={value} onChange={e => setValue(e.target.value)} placeholder="100" />
            </div>
          </div>
          <div className="form-group">
            <label>Company Name (optional)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Apple Inc." />
          </div>
          <p className="form-hint">Price will be fetched automatically if you have a Finnhub API key configured in Settings.</p>
        </>
      ) : (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Account Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="401(k)" required />
            </div>
            <div className="form-group">
              <label>Icon</label>
              <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🏦" />
            </div>
          </div>
          <div className="form-group">
            <label>Current Value</label>
            <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0.00" required />
          </div>
        </>
      )}
      
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

// ============================================
// ENTRIES PAGE
// ============================================

function EntriesPage({ state, setState }: { state: AppState; setState: (s: AppState) => void }) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const filtered = state.entries.filter(e => filter === 'all' || e.type === filter).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const handleAdd = (entry: Omit<Entry, 'id'>) => { const ns = { ...state, entries: [{ ...entry, id: generateId() }, ...state.entries] }; setState(ns); saveState(ns); setShowAdd(false); };
  const handleEdit = (entry: Omit<Entry, 'id'>) => { const ns = { ...state, entries: state.entries.map(e => e.id === editingId ? { ...entry, id: editingId } : e) }; setState(ns); saveState(ns); setEditingId(null); };
  const handleDelete = (id: string) => { const ns = { ...state, entries: state.entries.filter(e => e.id !== id) }; setState(ns); saveState(ns); };
  return (
    <div className="page-content">
      <div className="page-header"><div><h1>Entries</h1><p className="page-subtitle">View and manage your transactions</p></div><button className="btn-primary" onClick={() => setShowAdd(true)}><Icons.Plus /><span>Add Entry</span></button></div>
      <div className="filter-tabs"><button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button><button className={`filter-tab ${filter === 'expense' ? 'active' : ''}`} onClick={() => setFilter('expense')}>Expenses</button><button className={`filter-tab ${filter === 'income' ? 'active' : ''}`} onClick={() => setFilter('income')}>Income</button></div>
      {filtered.length === 0 ? (
        <div className="empty-state">
          <Icons.Entries />
          <h3>No entries yet</h3>
          <p>Start tracking your income and expenses by adding your first entry.</p>
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Icons.Plus /><span>Add Entry</span></button>
        </div>
      ) : (
        <div className="entries-list">{filtered.map(e => (<div key={e.id} className="entry-item"><div className={`entry-icon ${e.type}`}>{e.type === 'income' ? <Icons.TrendingUp /> : <Icons.TrendingDown />}</div><div className="entry-details"><h4>{e.description}</h4><span>{formatDateLong(e.date)} • {e.category}</span></div><div className="entry-amount-col"><div className={`entry-amount ${e.type}`}>{e.type === 'income' ? '+' : '-'}{formatCurrency(e.amount)}</div></div><div className="entry-actions"><button className="icon-btn" onClick={() => setEditingId(e.id)}><Icons.Edit /></button><button className="icon-btn danger" onClick={() => handleDelete(e.id)}><Icons.Trash /></button></div></div>))}</div>
      )}
      <Modal isOpen={showAdd || editingId !== null} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? 'Edit Entry' : 'Add Entry'}>{editingId ? <EntryForm budgets={state.budgets} onSubmit={handleEdit} onCancel={() => setEditingId(null)} initialData={state.entries.find(e => e.id === editingId)} /> : <EntryForm budgets={state.budgets} onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />}</Modal>
    </div>
  );
}

// ============================================
// BUDGETS PAGE
// ============================================

function BudgetsPage({ state, setState }: { state: AppState; setState: (s: AppState) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const cycleStart = getCurrentCycleStart(state.settings.firstPayDate, state.settings.payFrequency);
  const cycleEntries = state.entries.filter(e => e.date >= cycleStart && e.type === 'expense');
  const totalAllocated = state.budgets.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = cycleEntries.reduce((s, e) => s + e.amount, 0);
  const handleSave = (b: Budget) => { const ns = { ...state, budgets: editingId ? state.budgets.map(x => x.id === editingId ? b : x) : [...state.budgets, { ...b, id: generateId() }] }; setState(ns); saveState(ns); setEditingId(null); setShowAdd(false); };
  const handleDelete = (id: string) => { const ns = { ...state, budgets: state.budgets.filter(b => b.id !== id) }; setState(ns); saveState(ns); };
  return (
    <div className="page-content">
      <div className="page-header"><div><h1>Budgets</h1><p className="page-subtitle">Manage your spending categories</p></div><button className="btn-primary" onClick={() => setShowAdd(true)}><Icons.Plus /><span>Add Category</span></button></div>
      <div className="summary-cards"><div className="summary-card"><div className="summary-label">Total Allocated</div><div className="summary-value">{formatCurrency(totalAllocated)}</div></div><div className="summary-card"><div className="summary-label">Total Spent</div><div className="summary-value">{formatCurrency(totalSpent)}</div></div><div className="summary-card"><div className="summary-label">Remaining</div><div className={`summary-value ${totalAllocated - totalSpent < 0 ? 'danger' : ''}`}>{formatCurrency(totalAllocated - totalSpent)}</div></div></div>
      <div className="budgets-grid">{state.budgets.map(b => { 
        const spent = cycleEntries.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0); 
        const pct = b.allocated > 0 ? Math.min((spent / b.allocated) * 100, 100) : (spent > 0 ? 100 : 0); 
        const over = spent > b.allocated && b.allocated > 0; 
        const notSet = b.allocated === 0;
        return (
          <div
            key={b.id}
            className={`budget-item ${over ? 'over' : ''} ${notSet ? 'not-set' : ''}`}
            onClick={() => { if (notSet) { setEditingId(b.id); setShowAdd(false); } }}
          >
            <div className="budget-item-header">
              <div className="budget-color" style={{ background: b.color }}></div>
              <h4>{b.category}</h4>
              <div className="budget-item-actions">
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditingId(b.id); }}><Icons.Edit /></button>
                <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}><Icons.Trash /></button>
              </div>
            </div>
            <div className="budget-progress">
              <div className="budget-progress-bar" style={{ width: notSet ? '0%' : `${pct}%`, background: over ? '#ef4444' : b.color }}></div>
            </div>
            <div className="budget-item-footer">
              <span>{formatCurrency(spent)} / {notSet ? '--' : formatCurrency(b.allocated)}</span>
              <span className={over ? 'over-text' : notSet ? 'not-set-text' : ''}>
                {over ? 'Over budget!' : notSet ? 'Click to set budget' : `${formatCurrency(b.allocated - spent)} left`}
              </span>
            </div>
          </div>
        ); 
      })}</div>
      <Modal isOpen={showAdd || editingId !== null} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? 'Edit Budget' : 'Add Budget'}><BudgetForm budget={editingId ? state.budgets.find(b => b.id === editingId) : undefined} onSubmit={handleSave} onCancel={() => { setShowAdd(false); setEditingId(null); }} /></Modal>
    </div>
  );
}

function BudgetForm({ budget, onSubmit, onCancel }: { budget?: Budget; onSubmit: (b: Budget) => void; onCancel: () => void }) {
  const [category, setCategory] = useState(budget?.category || '');
  const [allocated, setAllocated] = useState(budget?.allocated?.toString() || '');
  const [color, setColor] = useState(budget?.color || '#8b5cf6');
  const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#06b6d4', '#ef4444'];
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ id: budget?.id || '', category, allocated: parseFloat(allocated) || 0, color }); };
  return (<form className="entry-form" onSubmit={handleSubmit}><div className="form-group"><label>Category Name</label><input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Groceries" required /></div><div className="form-group"><label>Budget Amount</label><input type="number" step="0.01" value={allocated} onChange={e => setAllocated(e.target.value)} placeholder="500.00" required /></div><div className="form-group"><label>Color</label><div className="color-picker">{colors.map(c => (<button key={c} type="button" className={`color-swatch ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />))}</div></div><div className="form-actions"><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="btn-primary">Save</button></div></form>);
}

// ============================================
// SETTINGS PAGE
// ============================================

function SettingsPage({ state, setState }: { state: AppState; setState: (s: AppState) => void }) {
  const [settings, setLocal] = useState(state.settings);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { const ns = { ...state, settings }; setState(ns); saveState(ns); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleReset = () => { if (confirm('Reset all data? This cannot be undone.')) { const ns = { entries: defaultEntries, budgets: defaultBudgets, holdings: defaultHoldings, bills: defaultBills, settings: defaultSettings }; setState(ns); saveState(ns); setLocal(defaultSettings); } };
  return (
    <div className="page-content">
      <div className="page-header"><div><h1>Settings</h1><p className="page-subtitle">Configure your budget preferences</p></div></div>
      <div className="settings-sections">
        <div className="settings-section"><h3>Profile</h3><div className="settings-grid"><div className="form-group"><label>Your Name</label><input type="text" value={settings.userName} onChange={e => setLocal({ ...settings, userName: e.target.value })} /></div></div></div>
        <div className="settings-section">
          <h3>Pay Cycle</h3>
          <p className="settings-description">Configure your pay schedule to track spending per paycheck.</p>
          <div className="settings-grid">
            <div className="form-group"><label>Pay Amount</label><input type="number" step="0.01" value={settings.payAmount || ''} onChange={e => setLocal({ ...settings, payAmount: parseFloat(e.target.value) || 0 })} placeholder="Enter your paycheck amount" /></div>
            <div className="form-group"><label>Pay Frequency</label><select value={settings.payFrequency} onChange={e => setLocal({ ...settings, payFrequency: e.target.value as any })}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option></select></div>
            <div className="form-group"><label>First Pay Date</label><input type="date" value={settings.firstPayDate} onChange={e => setLocal({ ...settings, firstPayDate: e.target.value })} /></div>
          </div>
        </div>
        <div className="settings-section">
          <h3>Savings Goals</h3>
          <p className="settings-description">Set your financial goals to track progress.</p>
          <div className="settings-grid">
            <div className="form-group"><label>Buffer Amount</label><input type="number" step="0.01" value={settings.bufferAmount || ''} onChange={e => setLocal({ ...settings, bufferAmount: parseFloat(e.target.value) || 0 })} placeholder="Emergency buffer" /></div>
            <div className="form-group"><label>Yearly Savings Goal</label><input type="number" step="0.01" value={settings.savingsGoal || ''} onChange={e => setLocal({ ...settings, savingsGoal: parseFloat(e.target.value) || 0 })} placeholder="Annual savings target" /></div>
          </div>
        </div>
        <div className="settings-section">
          <h3>Integrations</h3>
          <p className="settings-description">Connect external services for real-time data.</p>
          <div className="settings-grid">
            <div className="form-group full-width">
              <label>Finnhub API Key</label>
              <input type="password" value={settings.finnhubApiKey} onChange={e => setLocal({ ...settings, finnhubApiKey: e.target.value })} placeholder="Enter your Finnhub API key for stock prices" />
              <p className="form-hint">Get a free API key at <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer">finnhub.io</a> for real-time stock prices.</p>
            </div>
          </div>
        </div>
        <div className="settings-actions"><button className="btn-danger" onClick={handleReset}>Reset All Data</button><button className="btn-primary" onClick={handleSave}>{saved ? <><Icons.Check /> Saved!</> : 'Save Settings'}</button></div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [state, setState] = useState<AppState>(loadState);
  useEffect(() => { saveState(state); }, [state]);
  const pageTitles: { [k: string]: string } = { dashboard: 'Dashboard', holdings: 'Holdings', entries: 'Entries', budgets: 'Budgets', settings: 'Settings' };
  const goToSettings = () => setActiveNav('settings');
  return (
    <div className="app-container">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
      <main className="main-content">
        <Topbar userName={state.settings.userName} pageTitle={pageTitles[activeNav]} />
        {activeNav === 'dashboard' && <DashboardPage state={state} setState={setState} onGoToSettings={goToSettings} />}
        {activeNav === 'holdings' && <HoldingsPage state={state} setState={setState} />}
        {activeNav === 'entries' && <EntriesPage state={state} setState={setState} />}
        {activeNav === 'budgets' && <BudgetsPage state={state} setState={setState} />}
        {activeNav === 'settings' && <SettingsPage state={state} setState={setState} />}
      </main>
    </div>
  );
}

export default App;
