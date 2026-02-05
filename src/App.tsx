import { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react';
import './styles.css';
import { useAuth } from './auth';
import profileDefault from './assets/profile-default.svg';

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
  slug: string;
  type: BudgetType;
  allocated: number;
  rollover: boolean;
  priority: number;
  protected: boolean;
  overspendPolicy: OverspendPolicy;
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
  quantity?: number;
  costBasis?: number;
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
type BudgetType = 'core' | 'rollover' | 'fixed' | 'savings' | 'buffer' | 'bonus';
type OverspendPolicy = 'to_buffer' | 'block';

interface BudgetCycle {
  id: string;
  startDate: string;
  endDate: string;
  paycheckAmount: number;
}

interface EnvelopeCycleState {
  cycleId: string;
  budgetId: string;
  fundedAmount: number;
  spentAmount: number;
  availableStart: number;
  availableEnd: number;
}

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
  userName: '',
  payAmount: 0,
  payFrequency: 'biweekly',
  firstPayDate: '',
  bufferAmount: 0,
  savingsGoal: 0,
  finnhubApiKey: '',
};

const defaultBudgets: Budget[] = [
  { id: '1', category: 'Groceries (protected)', slug: 'groceries', type: 'core', allocated: 0, rollover: false, priority: 10, protected: true, overspendPolicy: 'to_buffer', color: '#22c55e' },
  { id: '2', category: 'Transportation', slug: 'transportation', type: 'core', allocated: 0, rollover: false, priority: 20, protected: false, overspendPolicy: 'to_buffer', color: '#3b82f6' },
  { id: '3', category: 'Subscriptions', slug: 'subscriptions', type: 'core', allocated: 0, rollover: false, priority: 30, protected: false, overspendPolicy: 'to_buffer', color: '#8b5cf6' },
  { id: '4', category: 'Clothing', slug: 'clothing', type: 'core', allocated: 0, rollover: false, priority: 40, protected: false, overspendPolicy: 'to_buffer', color: '#ec4899' },
  { id: '5', category: 'Alcohol', slug: 'alcohol', type: 'core', allocated: 0, rollover: false, priority: 50, protected: false, overspendPolicy: 'to_buffer', color: '#f97316' },
  { id: '6', category: 'Flexible Fun', slug: 'flexible-fun', type: 'core', allocated: 0, rollover: false, priority: 60, protected: false, overspendPolicy: 'to_buffer', color: '#eab308' },
  { id: '7', category: 'Health', slug: 'health', type: 'rollover', allocated: 0, rollover: true, priority: 10, protected: false, overspendPolicy: 'to_buffer', color: '#06b6d4' },
  { id: '8', category: 'Personal Care', slug: 'personal-care', type: 'rollover', allocated: 0, rollover: true, priority: 20, protected: false, overspendPolicy: 'to_buffer', color: '#ef4444' },
  { id: '9', category: 'Gifts', slug: 'gifts', type: 'rollover', allocated: 0, rollover: true, priority: 30, protected: false, overspendPolicy: 'to_buffer', color: '#22c55e' },
  { id: '10', category: 'Savings (locked)', slug: 'savings', type: 'savings', allocated: 0, rollover: false, priority: 10, protected: false, overspendPolicy: 'block', color: '#3b82f6' },
  { id: '11', category: 'Fixed bills', slug: 'fixed-bills', type: 'fixed', allocated: 0, rollover: false, priority: 10, protected: false, overspendPolicy: 'to_buffer', color: '#8b5cf6' },
  { id: '12', category: 'Buffer', slug: 'buffer', type: 'buffer', allocated: 0, rollover: true, priority: 10, protected: false, overspendPolicy: 'to_buffer', color: '#ec4899' },
  { id: '13', category: 'Bonuses', slug: 'bonuses', type: 'bonus', allocated: 0, rollover: false, priority: 10, protected: false, overspendPolicy: 'to_buffer', color: '#f97316' },
];

const defaultHoldings: Holding[] = [];

const defaultBills: Bill[] = [];

const defaultEntries: Entry[] = [];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const slugify = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const getCycleIntervalDays = (freq: Settings['payFrequency']): number => (freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30);
const toDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const parseDateKey = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};
const addDays = (d: Date, days: number): Date => { const nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; };
const typeOrder: BudgetType[] = ['savings', 'fixed', 'core', 'rollover', 'bonus', 'buffer'];
const defaultPriorityForType = (type: BudgetType): number => ({ savings: 10, fixed: 20, core: 30, rollover: 40, bonus: 50, buffer: 60 }[type]);
const inferTypeFromCategory = (category: string): BudgetType => {
  const name = category.toLowerCase();
  if (name.includes('savings')) return 'savings';
  if (name.includes('buffer')) return 'buffer';
  if (name.includes('fixed')) return 'fixed';
  if (name.includes('bonus')) return 'bonus';
  if (name.includes('health') || name.includes('personal care') || name.includes('gift')) return 'rollover';
  return 'core';
};

const getTypeBadgeLabel = (type: BudgetType): string => {
  if (type === 'core') return 'RESET';
  if (type === 'rollover') return 'ROLLOVER';
  if (type === 'fixed') return 'FIXED';
  if (type === 'savings') return 'LOCKED';
  if (type === 'buffer') return 'BUFFER';
  if (type === 'bonus') return 'BONUS';
  return '';
};

const normalizeBudget = (b: Budget): Budget => {
  const category = b.category || 'Unnamed';
  const type = b.type || inferTypeFromCategory(category);
  return {
    ...b,
    category,
    slug: b.slug || slugify(category),
    type,
    allocated: typeof b.allocated === 'number' ? b.allocated : 0,
    rollover: b.rollover ?? (type === 'rollover' || type === 'buffer'),
    priority: typeof b.priority === 'number' ? b.priority : defaultPriorityForType(type),
    protected: b.protected ?? category.toLowerCase().includes('groceries'),
    overspendPolicy: b.overspendPolicy || 'to_buffer',
    color: b.color || '#8b5cf6',
  };
};

const allocatePaycheck = (budgets: Budget[], paycheckAmount: number): Record<string, number> => {
  const ordered = [...budgets].sort((a, b) => {
    const orderDiff = typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    return orderDiff !== 0 ? orderDiff : a.priority - b.priority;
  });
  let remaining = paycheckAmount;
  const funded: Record<string, number> = {};
  ordered.forEach(b => {
    if (remaining <= 0) {
      funded[b.id] = 0;
      return;
    }
    if (b.type === 'buffer') {
      funded[b.id] = remaining;
      remaining = 0;
      return;
    }
    const cap = Math.max(0, b.allocated || 0);
    const amount = Math.min(cap, remaining);
    funded[b.id] = amount;
    remaining -= amount;
  });
  return funded;
};

const isSavingsCategory = (category: string, budgets: Budget[]): boolean => {
  const budget = budgets.find(b => b.category === category);
  if (budget?.type === 'savings') return true;
  return category.toLowerCase().includes('savings');
};

const getSavingsAmount = (entry: Entry | null | undefined, budgets: Budget[]): number => {
  if (!entry) return 0;
  if (entry.type !== 'expense') return 0;
  return isSavingsCategory(entry.category, budgets) ? entry.amount : 0;
};

const applySavingsDelta = (holdings: Holding[], delta: number): Holding[] => {
  if (delta === 0) return holdings;
  const idx = holdings.findIndex(h => h.type === 'account' && h.name.toLowerCase() === 'savings');
  if (idx !== -1) {
    const existing = holdings[idx];
    const prevValue = existing.value;
    const nextValue = Math.max(0, prevValue + delta);
    const next = { ...existing, value: nextValue, previousValue: prevValue };
    return holdings.map((h, i) => (i === idx ? next : h));
  }
  if (delta <= 0) return holdings;
  return [
    {
      id: generateId(),
      name: 'Savings',
      type: 'account',
      value: delta,
      previousValue: 0,
      icon: '$',
      iconClass: 'savings',
    },
    ...holdings,
  ];
};

const buildCycles = (settings: Settings): BudgetCycle[] => {
  if (!settings.firstPayDate) return [];
  const interval = getCycleIntervalDays(settings.payFrequency);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let cursor = parseDateKey(settings.firstPayDate); cursor.setHours(0, 0, 0, 0);
  const cycles: BudgetCycle[] = [];
  if (cursor > today) {
    const endDate = addDays(cursor, interval - 1);
    cycles.push({ id: toDateKey(cursor), startDate: toDateKey(cursor), endDate: toDateKey(endDate), paycheckAmount: settings.payAmount });
    return cycles;
  }
  while (cursor <= today) {
    const startDate = toDateKey(cursor);
    const endDate = addDays(cursor, interval - 1);
    cycles.push({ id: startDate, startDate, endDate: toDateKey(endDate), paycheckAmount: settings.payAmount });
    cursor = addDays(cursor, interval);
  }
  return cycles;
};

const findCycleIdForDate = (date: string, cycles: BudgetCycle[]): string | null => {
  for (let i = cycles.length - 1; i >= 0; i--) {
    const cycle = cycles[i];
    if (date >= cycle.startDate && date <= cycle.endDate) return cycle.id;
  }
  return null;
};

const computeCurrentCycleData = (settings: Settings, budgets: Budget[], entries: Entry[]) => {
  const cycles = buildCycles(settings);
  if (cycles.length === 0) {
    return { currentCycle: null as BudgetCycle | null, statesByBudgetId: new Map<string, EnvelopeCycleState>(), states: [] as EnvelopeCycleState[] };
  }
  const currentCycle = cycles[cycles.length - 1];
  const budgetByCategory = new Map(budgets.map(b => [b.category, b]));
  const spendByCycleBudget = new Map<string, Map<string, number>>();
  entries.filter(e => e.type === 'expense').forEach(e => {
    const budget = budgetByCategory.get(e.category);
    if (!budget) return;
    const cycleId = findCycleIdForDate(e.date, cycles);
    if (!cycleId) return;
    const cycleMap = spendByCycleBudget.get(cycleId) || new Map<string, number>();
    cycleMap.set(budget.id, (cycleMap.get(budget.id) || 0) + e.amount);
    spendByCycleBudget.set(cycleId, cycleMap);
  });

  const fundedByBudgetId = allocatePaycheck(budgets, settings.payAmount || 0);
  let prevStates = new Map<string, EnvelopeCycleState>();
  let currentStates: EnvelopeCycleState[] = [];
  for (const cycle of cycles) {
    const spendMap = spendByCycleBudget.get(cycle.id) || new Map<string, number>();
    const states = budgets.map(b => {
      const fundedAmount = fundedByBudgetId[b.id] || 0;
      const carryIn = b.rollover ? (prevStates.get(b.id)?.availableEnd || 0) : 0;
      const baseBuffer = b.type === 'buffer' && prevStates.size === 0 ? (settings.bufferAmount || 0) : 0;
      const availableStart = carryIn + baseBuffer + fundedAmount;
      const spentAmount = spendMap.get(b.id) || 0;
      const availableEnd = Math.max(0, availableStart - spentAmount);
      return { cycleId: cycle.id, budgetId: b.id, fundedAmount, spentAmount, availableStart, availableEnd };
    });

    const bufferBudget = budgets.find(b => b.type === 'buffer');
    if (bufferBudget) {
      const bufferState = states.find(s => s.budgetId === bufferBudget.id);
      if (bufferState) {
        let overageTotal = 0;
        states.forEach(state => {
          if (state.budgetId === bufferBudget.id) return;
          const budget = budgets.find(b => b.id === state.budgetId);
          if (!budget || budget.overspendPolicy !== 'to_buffer') return;
          overageTotal += Math.max(0, state.spentAmount - state.availableStart);
        });
        if (overageTotal > 0) {
          bufferState.spentAmount += overageTotal;
          bufferState.availableEnd = Math.max(0, bufferState.availableStart - bufferState.spentAmount);
        }
      }
    }

    if (cycle.id === currentCycle.id) {
      currentStates = states;
      break;
    }
    prevStates = new Map(states.map(s => [s.budgetId, s]));
  }

  return { currentCycle, statesByBudgetId: new Map(currentStates.map(s => [s.budgetId, s])), states: currentStates };
};

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substr(2);
const formatCurrency = (v: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const formatDate = (d: string): string => d ? parseDateKey(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';
const formatDateLong = (d: string): string => d ? parseDateKey(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--';
const getDaysUntil = (d: string): number => {
  if (!d) return 0;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const target = parseDateKey(d);
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((targetMidnight.getTime() - t.getTime()) / 86400000);
};
const getPercentChange = (c: number, p: number): number => p === 0 ? 0 : ((c - p) / p) * 100;
const defaultTagColor = '#94a3b8';
const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const getCategoryColor = (category: string, budgets: Budget[]): string =>
  budgets.find(b => b.category === category)?.color || defaultTagColor;
const getPillStyle = (color: string, active = false) => ({
  backgroundColor: hexToRgba(color, active ? 0.28 : 0.14),
  borderColor: hexToRgba(color, active ? 0.6 : 0.35),
  color,
});

function getNextPayday(firstPayDate: string, freq: 'weekly' | 'biweekly' | 'monthly'): string {
  if (!firstPayDate) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  let payday = parseDateKey(firstPayDate); payday.setHours(0,0,0,0);
  const interval = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30;
  while (payday <= today) payday.setDate(payday.getDate() + interval);
  return toDateKey(payday);
}

function getCurrentCycleStart(firstPayDate: string, freq: 'weekly' | 'biweekly' | 'monthly'): string {
  if (!firstPayDate) return toDateKey(new Date());
  const today = new Date(); today.setHours(0,0,0,0);
  let cycleStart = parseDateKey(firstPayDate); cycleStart.setHours(0,0,0,0);
  const interval = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30;
  while (cycleStart.getTime() + interval * 86400000 <= today.getTime()) cycleStart.setDate(cycleStart.getDate() + interval);
  return toDateKey(cycleStart);
}

function getMonthStart(): string {
  const now = new Date();
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
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
const loadState = (): AppState => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      const budgets = Array.isArray(parsed.budgets) ? parsed.budgets.map((b: Budget) => normalizeBudget(b)) : defaultBudgets;
      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : defaultEntries,
        budgets,
        holdings: Array.isArray(parsed.holdings) ? parsed.holdings : defaultHoldings,
        bills: Array.isArray(parsed.bills) ? parsed.bills : defaultBills,
        settings: { ...defaultSettings, ...(parsed.settings || {}) },
      };
    }
  } catch {}
  return { entries: defaultEntries, budgets: defaultBudgets, holdings: defaultHoldings, bills: defaultBills, settings: defaultSettings };
};
const saveState = (state: AppState): void => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} };

// ============================================
// COMPONENTS
// ============================================

function Sidebar({ activeNav, setActiveNav }: { activeNav: string; setActiveNav: (n: string) => void }) {
  const { user, authEnabled, signOut } = useAuth();
  const canSignOut = authEnabled && Boolean(user);
  const logoutTitle = !authEnabled
    ? 'Google login is not configured.'
    : user
      ? `Sign out${user.email ? ` ${user.email}` : ''}`
      : 'Sign in to enable logout.';
  const items = [{ id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard }, { id: 'holdings', label: 'Holdings', icon: Icons.Portfolio }, { id: 'entries', label: 'Entries', icon: Icons.Entries }, { id: 'budgets', label: 'Budgets', icon: Icons.Budgets }, { id: 'settings', label: 'Settings', icon: Icons.Settings }];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><h1>MoneyHub</h1></div>
      <div className="sidebar-section-label">User Panel</div>
      <nav className="sidebar-nav">{items.map(i => (<button key={i.id} className={`nav-item ${activeNav === i.id ? 'active' : ''}`} onClick={() => setActiveNav(i.id)}><i.icon /><span>{i.label}</span></button>))}</nav>
      <div className="sidebar-footer"><div className="sidebar-quote"><div className="quote-icon"><Icons.Lightbulb /></div><div className="quote-title">Biweekly Model</div><div className="quote-text">Budget resets every payday. Stay on track with envelope budgeting.</div></div></div>
      <button className="sidebar-logout" onClick={canSignOut ? signOut : undefined} disabled={!canSignOut} title={logoutTitle}>
        <Icons.Logout />
        <span>Logout</span>
      </button>
    </aside>
  );
}

function Topbar({ userName, pageTitle }: { userName: string; pageTitle: string }) {
  const { user: authUser, authEnabled, signInWithGoogle, signOut } = useAuth();
  const displayName = userName?.trim() || 'there';

  return (
    <header className="topbar">
      <div className="topbar-left"><h2>Hello {displayName}</h2><span className="topbar-subtitle">{pageTitle}</span></div>
      <div className="topbar-right">
        <div className="search-bar"><Icons.Search /><input type="text" placeholder="Search transactions..." /></div>
        {authEnabled && (
          authUser ? (
            <button className="auth-chip" onClick={signOut} title={authUser.email || 'Signed in'}>
              <span className="auth-label">{authUser.email?.split('@')[0] || 'Signed in'}</span>
              <span className="auth-action">Sign out</span>
            </button>
          ) : (
            <button className="auth-chip" onClick={signInWithGoogle}>
              <span className="auth-label">Sign in</span>
              <span className="auth-action">Google</span>
            </button>
          )
        )}
        <button className="notification-btn"><Icons.Bell /><span className="notification-badge"></span></button>
        <div className="profile-chip"><img src={profileDefault} alt="Profile" /></div>
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
  const { currentCycle, statesByBudgetId } = useMemo(() => computeCurrentCycleData(state.settings, state.budgets, state.entries), [state.settings, state.budgets, state.entries]);
  
  const needsSetup = !state.settings.firstPayDate || state.settings.payAmount === 0;
  
  const nextPayday = getNextPayday(state.settings.firstPayDate, state.settings.payFrequency);
  const cycleStart = currentCycle?.startDate || getCurrentCycleStart(state.settings.firstPayDate, state.settings.payFrequency);
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
  
  const savingsCategories = state.budgets.filter(b => b.type === 'savings').map(b => b.category);
  const savingsYTD = savingsCategories.length > 0
    ? state.entries.filter(e => e.date >= yearStart && e.type === 'expense' && savingsCategories.includes(e.category)).reduce((s, e) => s + e.amount, 0)
    : state.entries.filter(e => e.date >= yearStart && e.type === 'income').reduce((s, e) => s + e.amount, 0) * 0.15;
  const totalHoldings = state.holdings.reduce((s, h) => s + h.value, 0);
  const categorySpending = state.budgets.map(b => {
    const spent = filteredEntries.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0);
    return { ...b, spent, remaining: b.allocated - spent };
  });
  const topCategory = [...categorySpending].sort((a, b) => b.spent - a.spent)[0];
  
  const monthlyData = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthEntries = state.entries.filter(e => e.date.startsWith(monthStr));
      months.push({
        month: monthName,
        income: monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
        expense: monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      });
    }
    return months;
  }, [state.entries]);

  const trendData = useMemo(() => {
    if (timeFilter === 'mtd') {
      const totalIncome = state.entries.filter(e => e.date >= monthStart && e.type === 'income').reduce((s, e) => s + e.amount, 0);
      const totalExpense = state.entries.filter(e => e.date >= monthStart && e.type === 'expense').reduce((s, e) => s + e.amount, 0);
      return [{ month: 'MTD', income: totalIncome, expense: totalExpense }];
    }
    if (timeFilter === 'ytd') {
      const totalIncome = state.entries.filter(e => e.date >= yearStart && e.type === 'income').reduce((s, e) => s + e.amount, 0);
      const totalExpense = state.entries.filter(e => e.date >= yearStart && e.type === 'expense').reduce((s, e) => s + e.amount, 0);
      return [{ month: 'YTD', income: totalIncome, expense: totalExpense }];
    }
    return monthlyData;
  }, [timeFilter, state.entries, monthStart, yearStart, monthlyData]);

  const handleAddEntry = (entry: Omit<Entry, 'id'>) => {
    const entryWithId = { ...entry, id: generateId() };
    const delta = getSavingsAmount(entryWithId, state.budgets);
    const ns = {
      ...state,
      entries: [entryWithId, ...state.entries],
      holdings: applySavingsDelta(state.holdings, delta),
    };
    setState(ns);
    saveState(ns);
    setShowAddEntry(false);
  };

  const bufferBudget = state.budgets.find(b => b.type === 'buffer');
  const bufferState = bufferBudget ? statesByBudgetId.get(bufferBudget.id) : undefined;
  const bufferAvailable = bufferState ? bufferState.availableEnd : state.settings.bufferAmount;

  const budgetCards = [
    { id: 'budget', label: 'Budget Remaining', value: formatCurrency(budgetRemaining), badge: `${budgetPercent}%`, color: 'purple', icon: Icons.Wallet, ticker: 'BUDGET', glow: false },
    { id: 'buffer', label: 'Buffer Available', value: formatCurrency(bufferAvailable), badge: 'LIVE', color: 'cyan', icon: Icons.Shield, ticker: 'BUFFER', glow: true },
    { id: 'savings', label: 'Savings YTD', value: formatCurrency(savingsYTD), badge: state.settings.savingsGoal > 0 ? `${((savingsYTD / state.settings.savingsGoal) * 100).toFixed(0)}%` : '0%', color: 'orange', icon: Icons.PiggyBank, ticker: 'SAVE', glow: true },
    { id: 'payday', label: 'Next Payday', value: nextPayday ? formatDate(nextPayday) : 'Not Set', badge: nextPayday ? `${daysUntilPayday}d` : '--', color: 'green', icon: Icons.Calendar, ticker: 'PAY', glow: false },
    { id: 'total', label: 'Total Holdings', value: formatCurrency(totalHoldings), badge: '+0.0%', color: 'pink', icon: Icons.DollarSign, ticker: 'TOTAL', glow: false },
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
        <div className="budget-cards-row">{budgetCards.map(c => (
          <div key={c.id} className={`budget-card ${c.color} ${c.glow ? 'glow' : ''}`}>
            <div className="budget-card-header">
              <div className="budget-card-icon"><c.icon /><span>{c.ticker}</span></div>
              <span className="budget-card-badge">{c.badge}</span>
            </div>
            <div className="budget-card-label">{c.label}</div>
            <div className="budget-card-value">{c.value}</div>
          </div>
        ))}</div>
      </div>
      <div className="holdings-section"><div className="section-title">Holdings</div>
        {state.holdings.length === 0 ? (
          <div className="empty-state-small">No holdings yet. Add accounts or stocks in the Holdings page.</div>
        ) : (
          <div className="holdings-grid">{state.holdings.slice(0, 4).map((h, index) => {
            const change = getPercentChange(h.value, h.previousValue);
            const accent = index % 4 === 0 ? 'accent-green' : index % 4 === 1 ? 'accent-blue' : index % 4 === 2 ? 'accent-orange' : 'accent-pink';
            return (
              <div key={h.id} className={`holding-card holding-card-${accent}`}>
                <div className="holding-header">
                  <div className={`holding-icon ${h.iconClass}`}>{h.icon}</div>
                  <div className="holding-info"><h4>{h.name}</h4><span>{h.type === 'stock' && h.symbol ? h.symbol : h.type}</span></div>
                </div>
                <div className="holding-value">{formatCurrency(h.value)}</div>
                <div className={`holding-change ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? <Icons.TrendingUp /> : <Icons.TrendingDown />}<span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span></div>
              </div>
            );
          })}</div>
        )}
      </div>
      <div className="panels-grid">
        <div className="panel balance-panel">
          <div className="panel-header"><span className="panel-title">{filterLabel}</span></div>
          <div className="balance-card primary"><div className="balance-card-label">{timeFilter === 'cycle' ? 'Cycle Budget' : 'Income'}</div><div className="balance-card-row"><div className="balance-card-amount">{formatCurrency(timeFilter === 'cycle' ? state.settings.payAmount : filteredIncome)}</div><span className="balance-card-badge">{timeFilter === 'cycle' ? state.settings.payFrequency : filterLabel}</span></div></div>
          <div className="balance-card secondary"><div className="balance-card-label">Spent {filterLabel}</div><div className="balance-card-row"><div className="balance-card-amount">{formatCurrency(filteredSpent)}</div><button className="balance-action-btn" onClick={() => setShowAddEntry(true)}><Icons.Plus /></button></div></div>
          {topCategory && topCategory.spent > 0 && (
            <div className="top-category">
              <div className="top-category-label">Top Category</div>
              <div className="category-item">
                <div className="category-icon" style={{ background: `linear-gradient(135deg, ${topCategory.color}, ${topCategory.color}88)` }}>{topCategory.category.slice(0, 2).toUpperCase()}</div>
                <div className="category-info">
                  <div className="category-title-row">
                    <h4>{topCategory.category}</h4>
                    <span className={`budget-badge ${topCategory.type}`}>{getTypeBadgeLabel(topCategory.type)}</span>
                  </div>
                  <div className="category-details">
                    <div className="category-detail"><span className="category-detail-label">Budget</span><span className="category-detail-value">{formatCurrency(topCategory.allocated)}</span></div>
                    <div className="category-detail"><span className="category-detail-label">Spent</span><span className="category-detail-value">{formatCurrency(topCategory.spent)}</span></div>
                  </div>
                </div>
                <div className="category-stats"><div className="category-ticker">{topCategory.category.slice(0, 4).toUpperCase()}</div><div className="category-change">-{formatCurrency(topCategory.spent)}</div></div>
              </div>
            </div>
          )}
        </div>
        <div className="panel chart-panel">
          <div className="panel-header"><span className="panel-title">Spending Trend</span><div className="panel-tabs">{['1D', '5D', '1M', '6M', '1Y'].map(t => (<button key={t} className={`panel-tab ${t === '1M' ? 'active' : ''}`}>{t}</button>))}</div></div>
          <div className="chart-container"><svg className="chart-svg" viewBox="0 0 500 100" preserveAspectRatio="none"><defs><linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" /><stop offset="100%" stopColor="rgba(139, 92, 246, 0)" /></linearGradient></defs>{(() => { const expenses = trendData.map(d => d.expense); const max = Math.max(...expenses, 1); const points = expenses.map((v, i) => `${(i / Math.max(expenses.length - 1, 1)) * 500},${100 - (v / max) * 80}`); const pathD = 'M ' + points.join(' L '); return (<><path className="chart-area" d={pathD + ' L 500,100 L 0,100 Z'} /><path className="chart-line" d={pathD} /></>); })()}</svg></div>
          <div className="chart-stats"><div className="chart-stat"><span className="chart-stat-label">This Month</span><span className="chart-stat-value">{formatCurrency(monthlyData[5]?.expense || 0)}</span></div><div className="chart-stat"><span className="chart-stat-label">Last Month</span><span className="chart-stat-value">{formatCurrency(monthlyData[4]?.expense || 0)}</span></div><div className="chart-stat"><span className="chart-stat-label">6 Mo Avg</span><span className="chart-stat-value">{formatCurrency(monthlyData.reduce((s, d) => s + d.expense, 0) / 6)}</span></div><div className="chart-stat"><span className="chart-stat-label">Cycle Start</span><span className="chart-stat-value">{formatDate(cycleStart)}</span></div></div>
        </div>
        <div className="panel snapshot-panel">
          <div className="panel-header"><span className="panel-title">Snapshot</span></div>
          <div className="snapshot-main"><div className="snapshot-value">{formatCurrency(budgetRemaining)}</div><div className="snapshot-label">Budget Remaining</div></div>
          <div className="snapshot-grid">
            <div className="snapshot-item"><div className="snapshot-item-label">Daily Limit</div><div className="snapshot-item-value">{formatCurrency(budgetRemaining / Math.max(daysUntilPayday, 1))}</div></div>
            <div className="snapshot-item"><div className="snapshot-item-label">Days Left</div><div className="snapshot-item-value highlight">{daysUntilPayday}</div></div>
            {categorySpending.filter(c => c.allocated > 0).slice(0, 2).map(c => (
              <div key={c.id} className="snapshot-item">
                <div className="snapshot-item-label snapshot-label-row">
                  <span>{c.category}</span>
                  <span className={`budget-badge ${c.type} snapshot-badge`}>{getTypeBadgeLabel(c.type)}</span>
                </div>
                <div className={`snapshot-item-value ${c.remaining < 0 ? 'danger' : c.remaining < c.allocated * 0.2 ? 'warning' : ''}`}>{formatCurrency(c.remaining)}</div>
              </div>
            ))}
            <div className="snapshot-range"><div className="range-labels"><span className="range-label">Cycle Start</span><span className="range-label">Cycle End</span></div><div className="range-values"><span className="range-value">$0</span><span className="range-value">{formatCurrency(state.settings.payAmount)}</span></div><div className="range-bar"><div className="range-indicator" style={{ left: `${Math.min(100, state.settings.payAmount > 0 ? (cycleSpent / state.settings.payAmount) * 100 : 0)}%` }}></div></div><div className="range-current">{formatCurrency(budgetRemaining)} left</div></div>
          </div>
        </div>
      </div>
      <div className="bottom-grid">
        <div className="panel analytics-panel">
          <div className="panel-header"><span className="panel-title">Cash Flow Analytics</span></div>
          <div className="chart-container"><div className="bar-chart">{trendData.map((d, i) => { const max = Math.max(...trendData.flatMap(m => [m.income, m.expense]), 1); return (<div key={i} className="bar-item"><div className="bar income" style={{ height: `${(d.income / max) * 180}px` }}></div><div className="bar expense" style={{ height: `${(d.expense / max) * 180}px` }}></div><span className="bar-label">{d.month}</span></div>); })}</div></div>
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
  const [date, setDate] = useState(initialData?.date || toDateKey(new Date()));
  const selectedBudget = budgets.find(b => b.category === category);
  const selectedBadge = selectedBudget ? getTypeBadgeLabel(selectedBudget.type) : '';
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!amount || !description) return; onSubmit({ type, amount: parseFloat(amount), description, category: type === 'income' ? 'Income' : category, date }); };
  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Type</label>
          <div className="toggle-group">
            <button type="button" className={`toggle-btn ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')}>Expense</button>
            <button type="button" className={`toggle-btn ${type === 'income' ? 'active' : ''}`} onClick={() => setType('income')}>Income</button>
          </div>
        </div>
      </div>
      {type === 'expense' && (
        <div className="form-group">
          <label className="form-label-row">
            <span>Category</span>
            {selectedBadge && selectedBudget && <span className={`budget-badge ${selectedBudget.type} form-badge`}>{selectedBadge}</span>}
          </label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {budgets.map(b => (<option key={b.id} value={b.category}>{b.category}</option>))}
          </select>
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label>Amount</label>
          <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <input type="text" placeholder="What was this for?" value={description} onChange={e => setDescription(e.target.value)} required />
      </div>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">Save Entry</button>
      </div>
    </form>
  );
}

// ============================================
// HOLDINGS PAGE
// ============================================

function HoldingsPage({ state, setState }: { state: AppState; setState: (s: AppState) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const totalValue = state.holdings.reduce((s, h) => {
    if (h.type === 'stock') {
      const qty = h.quantity || 0;
      return s + (qty > 0 ? h.value * qty : h.value);
    }
    return s + h.value;
  }, 0);
  const totalPrev = state.holdings.reduce((s, h) => {
    if (h.type === 'stock') {
      const qty = h.quantity || 0;
      return s + (qty > 0 ? h.previousValue * qty : h.previousValue);
    }
    return s + h.previousValue;
  }, 0);
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
          <div className="holdings-list">{stockHoldings.map(h => {
            const change = getPercentChange(h.value, h.previousValue);
            const qty = h.quantity || 0;
            const marketValue = qty > 0 ? h.value * qty : h.value;
            const alloc = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;
            const metaParts = [];
            if (h.name) metaParts.push(h.name);
            if (qty > 0) metaParts.push(`${qty} sh @ ${formatCurrency(h.value)}`);
            if (h.costBasis && qty > 0) metaParts.push(`Basis ${formatCurrency(h.costBasis)}`);
            return (
              <div key={h.id} className="holding-list-item">
                <div className={`holding-icon stock`}><Icons.Stock /></div>
                <div className="holding-details"><h4>{h.symbol}</h4><span>{metaParts.join(' • ')}</span></div>
                <div className="holding-allocation"><div className="allocation-bar"><div className="allocation-fill" style={{ width: `${alloc}%` }}></div></div><span>{alloc.toFixed(1)}% of portfolio</span></div>
                <div className="holding-values"><div className="holding-current">{formatCurrency(marketValue)}</div><div className={`holding-change ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</div></div>
                <div className="holding-actions"><button className="icon-btn" onClick={() => setEditingId(h.id)}><Icons.Edit /></button><button className="icon-btn danger" onClick={() => handleDelete(h.id)}><Icons.Trash /></button></div>
              </div>
            );
          })}</div>
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
  const [quantity, setQuantity] = useState(holding?.quantity?.toString() || '');
  const [costBasis, setCostBasis] = useState(holding?.costBasis?.toString() || '');
  const [icon, setIcon] = useState(holding?.icon || '💰');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (holdingType === 'stock') {
      onSubmit({
        id: holding?.id || '',
        name: name || symbol.toUpperCase(),
        type: 'stock',
        symbol: symbol.toUpperCase(),
        quantity: parseFloat(quantity) || 0,
        costBasis: parseFloat(costBasis) || 0,
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
              <label>Quantity (shares)</label>
              <input type="number" step="0.0001" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="100" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Current Price (per share)</label>
              <input type="number" step="0.0001" value={value} onChange={e => setValue(e.target.value)} placeholder="150.00" />
            </div>
            <div className="form-group">
              <label>Cost Basis (per share)</label>
              <input type="number" step="0.0001" value={costBasis} onChange={e => setCostBasis(e.target.value)} placeholder="120.00" />
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const categories = useMemo(() => {
    const set = new Set<string>();
    state.budgets.forEach(b => set.add(b.category));
    state.entries.forEach(e => set.add(e.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [state.budgets, state.entries]);
  const normalizedQuery = query.trim().toLowerCase();
  const hasActiveFilters = filter !== 'all' || selectedCategories.length > 0 || normalizedQuery.length > 0;
  const filtered = state.entries
    .filter(e => {
      const matchesType = filter === 'all' || e.type === filter;
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(e.category);
      const matchesQuery = !normalizedQuery
        || e.description.toLowerCase().includes(normalizedQuery)
        || e.category.toLowerCase().includes(normalizedQuery);
      return matchesType && matchesCategory && matchesQuery;
    })
    .sort((a, b) => parseDateKey(b.date).getTime() - parseDateKey(a.date).getTime());
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => (prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]));
  };
  const clearFilters = () => {
    setFilter('all');
    setSelectedCategories([]);
    setQuery('');
  };
  const handleAdd = (entry: Omit<Entry, 'id'>) => {
    const entryWithId = { ...entry, id: generateId() };
    const delta = getSavingsAmount(entryWithId, state.budgets);
    const ns = {
      ...state,
      entries: [entryWithId, ...state.entries],
      holdings: applySavingsDelta(state.holdings, delta),
    };
    setState(ns);
    saveState(ns);
    setShowAdd(false);
  };
  const handleEdit = (entry: Omit<Entry, 'id'>) => {
    const prevEntry = state.entries.find(e => e.id === editingId) || null;
    const nextEntry = { ...entry, id: editingId || '' };
    const prevAmount = getSavingsAmount(prevEntry, state.budgets);
    const nextAmount = getSavingsAmount(nextEntry, state.budgets);
    const delta = nextAmount - prevAmount;
    const ns = {
      ...state,
      entries: state.entries.map(e => e.id === editingId ? nextEntry : e),
      holdings: applySavingsDelta(state.holdings, delta),
    };
    setState(ns);
    saveState(ns);
    setEditingId(null);
  };
  const handleDelete = (id: string) => {
    const prevEntry = state.entries.find(e => e.id === id) || null;
    const delta = -getSavingsAmount(prevEntry, state.budgets);
    const ns = {
      ...state,
      entries: state.entries.filter(e => e.id !== id),
      holdings: applySavingsDelta(state.holdings, delta),
    };
    setState(ns);
    saveState(ns);
  };
  return (
    <div className="page-content budgets-page">
      <div className="page-header"><div><h1>Entries</h1><p className="page-subtitle">View and manage your transactions</p></div><button className="btn-primary" onClick={() => setShowAdd(true)}><Icons.Plus /><span>Add Entry</span></button></div>
      <div className="filter-tabs"><button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button><button className={`filter-tab ${filter === 'expense' ? 'active' : ''}`} onClick={() => setFilter('expense')}>Expenses</button><button className={`filter-tab ${filter === 'income' ? 'active' : ''}`} onClick={() => setFilter('income')}>Income</button></div>
      <div className="entries-toolbar">
        <label className="entries-search">
          <Icons.Search />
          <input
            type="search"
            placeholder="Search description or category"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </label>
        {hasActiveFilters && (
          <button className="btn-secondary btn-clear-filters" onClick={clearFilters}>Clear filters</button>
        )}
      </div>
      <div className="category-filters">
        <button className={`category-pill-filter ${selectedCategories.length === 0 ? 'active' : ''}`} onClick={() => setSelectedCategories([])}>All categories</button>
        {categories.map(cat => {
          const color = getCategoryColor(cat, state.budgets);
          return (
            <button
              key={cat}
              className={`category-pill-filter ${selectedCategories.includes(cat) ? 'active' : ''}`}
              style={getPillStyle(color, selectedCategories.includes(cat))}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        state.entries.length === 0 ? (
          <div className="empty-state">
            <Icons.Entries />
            <h3>No entries yet</h3>
            <p>Start tracking your income and expenses by adding your first entry.</p>
            <button className="btn-primary" onClick={() => setShowAdd(true)}><Icons.Plus /><span>Add Entry</span></button>
          </div>
        ) : (
          <div className="empty-state">
            <Icons.Search />
            <h3>No entries match your filters</h3>
            <p>Try clearing filters or adjusting your search.</p>
            <button className="btn-secondary" onClick={clearFilters}>Clear filters</button>
          </div>
        )
      ) : (
        <div className="entries-list">{filtered.map(e => {
          const color = getCategoryColor(e.category, state.budgets);
          return (
            <div key={e.id} className="entry-item">
              <div className={`entry-icon ${e.type}`}>{e.type === 'income' ? <Icons.TrendingUp /> : <Icons.TrendingDown />}</div>
              <div className="entry-details">
                <h4>{e.description}</h4>
                <div className="entry-meta">
                  <span className="entry-date">{formatDateLong(e.date)}</span>
                  <span className="category-pill" style={getPillStyle(color)}>{e.category}</span>
                </div>
              </div>
              <div className="entry-amount-col"><div className={`entry-amount ${e.type}`}>{e.type === 'income' ? '+' : '-'}{formatCurrency(e.amount)}</div></div>
              <div className="entry-actions"><button className="icon-btn" onClick={() => setEditingId(e.id)}><Icons.Edit /></button><button className="icon-btn danger" onClick={() => handleDelete(e.id)}><Icons.Trash /></button></div>
            </div>
          );
        })}</div>
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
  const [sortBy, setSortBy] = useState<'priority' | 'category' | 'allocated' | 'spent' | 'remaining'>('priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { currentCycle, statesByBudgetId } = useMemo(() => computeCurrentCycleData(state.settings, state.budgets, state.entries), [state.settings, state.budgets, state.entries]);
  const cycleStart = currentCycle?.startDate || getCurrentCycleStart(state.settings.firstPayDate, state.settings.payFrequency);
  const cycleEnd = currentCycle?.endDate || '';
  const daysUntilCycleEnd = cycleEnd ? getDaysUntil(cycleEnd) : 0;
  const cycleEntries = state.entries.filter(e => e.type === 'expense' && e.date >= cycleStart && (!cycleEnd || e.date <= cycleEnd));
  const totalAllocated = state.budgets.reduce((s, b) => s + (statesByBudgetId.get(b.id)?.fundedAmount || 0), 0);
  const totalSpent = cycleEntries.reduce((s, e) => s + e.amount, 0);
  const totalBudgeted = state.budgets.filter(b => b.type !== 'buffer').reduce((s, b) => s + (b.allocated || 0), 0);
  const paycheckAmount = state.settings.payAmount || 0;
  const budgetGap = paycheckAmount - totalBudgeted;
  const budgetGapLabel = paycheckAmount > 0
    ? budgetGap >= 0
      ? `Unassigned ${formatCurrency(budgetGap)}`
      : `Over by ${formatCurrency(Math.abs(budgetGap))}`
    : 'Set paycheck amount to compare';
  const budgetGapClass = paycheckAmount > 0 ? (budgetGap >= 0 ? 'positive' : 'negative') : '';
  const overBudgetCount = state.budgets.reduce((count, b) => {
    const cycleState = statesByBudgetId.get(b.id);
    if (!cycleState) return count;
    return cycleState.spentAmount > cycleState.availableStart && cycleState.availableStart > 0 ? count + 1 : count;
  }, 0);
  const notSetCount = state.budgets.filter(b => b.allocated === 0 && b.type !== 'buffer').length;
  const rolloverCount = state.budgets.filter(b => b.rollover).length;
  const sortedBudgets = useMemo(() => {
    const items = [...state.budgets];
    const dir = sortDir === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      if (sortBy === 'category') return a.category.localeCompare(b.category) * dir;
      if (sortBy === 'allocated') return ((a.allocated || 0) - (b.allocated || 0)) * dir;
      if (sortBy === 'spent') {
        const aSpent = statesByBudgetId.get(a.id)?.spentAmount || 0;
        const bSpent = statesByBudgetId.get(b.id)?.spentAmount || 0;
        return (aSpent - bSpent) * dir;
      }
      if (sortBy === 'remaining') {
        const aRemain = statesByBudgetId.get(a.id)?.availableEnd || 0;
        const bRemain = statesByBudgetId.get(b.id)?.availableEnd || 0;
        return (aRemain - bRemain) * dir;
      }
      return (a.priority - b.priority) * dir;
    });
    return items;
  }, [state.budgets, sortBy, sortDir, statesByBudgetId]);
  const handleSave = (b: Budget) => {
    const nextBudget = normalizeBudget(b);
    const ns = {
      ...state,
      budgets: editingId ? state.budgets.map(x => x.id === editingId ? nextBudget : x) : [...state.budgets, { ...nextBudget, id: generateId() }],
    };
    setState(ns);
    saveState(ns);
    setEditingId(null);
    setShowAdd(false);
  };
  const handleDelete = (id: string) => { const ns = { ...state, budgets: state.budgets.filter(b => b.id !== id) }; setState(ns); saveState(ns); };
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <p className="page-subtitle">Manage your spending categories</p>
          {cycleEnd && <p className="page-subtitle cycle-hint">Cycle ends in {daysUntilCycleEnd} days</p>}
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Icons.Plus /><span>Add Category</span></button>
      </div>
      <div className="budget-tools">
        <div className="budget-tools-label">Sort by</div>
        <div className="budget-tools-controls">
          <select className="budget-tools-select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="priority">Priority</option>
            <option value="category">Category</option>
            <option value="allocated">Allocated</option>
            <option value="spent">Spent (cycle)</option>
            <option value="remaining">Remaining</option>
          </select>
          <button className="btn-secondary btn-sort" onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}>
            {sortDir === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Budgeted (Cycle Cap)</div>
          <div className={`summary-value ${paycheckAmount > 0 && budgetGap < 0 ? 'danger' : ''}`}>{formatCurrency(totalBudgeted)}</div>
          <div className={`summary-change ${budgetGapClass}`}>{budgetGapLabel}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Funded (Cycle)</div>
          <div className="summary-value">{formatCurrency(totalAllocated)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Spent (Cycle)</div>
          <div className="summary-value">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Remaining</div>
          <div className={`summary-value ${totalAllocated - totalSpent < 0 ? 'danger' : ''}`}>{formatCurrency(totalAllocated - totalSpent)}</div>
        </div>
      </div>
      <div className="budget-insights">
        <div className="budget-meter">
          <div className="budget-meter-header">
            <h4>Budgeted vs Paycheck</h4>
            <span className={`budget-meter-value ${paycheckAmount > 0 && budgetGap < 0 ? 'danger' : ''}`}>
              {paycheckAmount > 0 ? `${formatCurrency(totalBudgeted)} / ${formatCurrency(paycheckAmount)}` : 'Set paycheck amount'}
            </span>
          </div>
          <div className="budget-meter-bar">
            <div
              className={`budget-meter-fill ${paycheckAmount > 0 && budgetGap < 0 ? 'over' : ''}`}
              style={{ width: paycheckAmount > 0 ? `${Math.min((totalBudgeted / paycheckAmount) * 100, 100)}%` : '0%' }}
            ></div>
          </div>
          <div className="budget-meter-footer">
            <span>{budgetGapLabel}</span>
            <span>{notSetCount} not set</span>
          </div>
        </div>
        <div className="budget-stats">
          <div className="budget-stat"><span>Categories</span><strong>{state.budgets.length}</strong></div>
          <div className="budget-stat"><span>Rollover</span><strong>{rolloverCount}</strong></div>
          <div className="budget-stat"><span>Over</span><strong>{overBudgetCount}</strong></div>
          <div className="budget-stat"><span>Protected</span><strong>{state.budgets.filter(b => b.protected).length}</strong></div>
        </div>
      </div>
      <div className="budgets-grid">{sortedBudgets.map(b => { 
        const cycleState = statesByBudgetId.get(b.id);
        const funded = cycleState?.fundedAmount || 0;
        const availableStart = cycleState?.availableStart || 0;
        const spent = cycleState?.spentAmount || 0;
        const availableEnd = cycleState?.availableEnd || 0;
        const carryIn = Math.max(0, availableStart - funded);
        const pctBase = availableStart > 0 ? availableStart : (b.allocated > 0 ? b.allocated : 0);
        const pct = pctBase > 0 ? Math.min((spent / pctBase) * 100, 100) : (spent > 0 ? 100 : 0); 
        const over = spent > availableStart && availableStart > 0; 
        const notSet = b.allocated === 0 && b.type !== 'buffer';
        const badgeLabel = getTypeBadgeLabel(b.type);
        const primaryLabel = b.type === 'buffer'
          ? `Balance ${formatCurrency(availableEnd)}`
          : b.type === 'savings'
            ? `Funded ${formatCurrency(funded)} (locked)`
            : b.rollover
              ? `Carry ${formatCurrency(carryIn)} • Funded ${formatCurrency(funded)}`
              : `Funded ${formatCurrency(funded)} / Cycle Cap ${formatCurrency(b.allocated)}`;
        const secondaryLabel = over
          ? 'Over budget!'
          : b.type === 'buffer'
            ? `This cycle ${availableEnd - availableStart >= 0 ? '+' : ''}${formatCurrency(availableEnd - availableStart)}`
            : notSet
              ? 'Click to set budget'
              : b.type === 'savings'
                ? 'Locked'
                : b.rollover && b.allocated > 0 && funded < b.allocated
                  ? `Target ${formatCurrency(b.allocated)} · Funded ${formatCurrency(funded)}`
                  : b.rollover
                    ? `${formatCurrency(availableEnd)} available`
                    : `${formatCurrency(availableEnd)} left`;
        return (
          <div
            key={b.id}
            className={`budget-item ${over ? 'over' : ''} ${notSet ? 'not-set' : ''}`}
            style={{ '--budget-accent': b.color } as CSSProperties}
            onClick={() => { if (notSet) { setEditingId(b.id); setShowAdd(false); } }}
          >
            <div className="budget-item-header">
              <div className="budget-color" style={{ background: b.color }}></div>
              <h4>{b.category}</h4>
              {badgeLabel && <span className={`budget-badge ${b.type}`}>{badgeLabel}</span>}
              <div className="budget-item-actions">
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditingId(b.id); }}><Icons.Edit /></button>
                <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}><Icons.Trash /></button>
              </div>
            </div>
            {b.type !== 'buffer' && (
              <div className="budget-progress">
                <div className="budget-progress-bar" style={{ width: notSet ? '0%' : `${pct}%`, background: over ? '#ef4444' : b.color }}></div>
              </div>
            )}
            <div className="budget-item-footer">
              <span>{primaryLabel}</span>
              <span className={over ? 'over-text' : notSet ? 'not-set-text' : ''}>{secondaryLabel}</span>
            </div>
            {b.rollover && <div className="budget-item-note">Carries forward automatically</div>}
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inferredType = budget?.type || inferTypeFromCategory(category);
    onSubmit({
      id: budget?.id || '',
      category,
      slug: slugify(category),
      type: inferredType,
      allocated: parseFloat(allocated) || 0,
      rollover: budget?.rollover ?? (inferredType === 'rollover' || inferredType === 'buffer'),
      priority: budget?.priority ?? defaultPriorityForType(inferredType),
      protected: budget?.protected ?? category.toLowerCase().includes('groceries'),
      overspendPolicy: budget?.overspendPolicy || 'to_buffer',
      color,
    });
  };
  return (<form className="entry-form" onSubmit={handleSubmit}><div className="form-group"><label>Category Name</label><input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Groceries" required /></div><div className="form-group"><label>Cap / Target (per paycheck)</label><input type="number" step="0.01" value={allocated} onChange={e => setAllocated(e.target.value)} placeholder="500.00" required /></div><div className="form-group"><label>Color</label><div className="color-picker">{colors.map(c => (<button key={c} type="button" className={`color-swatch ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />))}</div></div><div className="form-actions"><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="btn-primary">Save</button></div></form>);
}

// ============================================
// SETTINGS PAGE
// ============================================

function SettingsPage({ state, setState }: { state: AppState; setState: (s: AppState) => void }) {
  const [settings, setLocal] = useState(state.settings);
  const [saved, setSaved] = useState(false);
  const { user: authUser, authEnabled, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const exportData = () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moneyhub-backup-${toDateKey(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const imported: AppState = {
          entries: Array.isArray(parsed.entries) ? parsed.entries : defaultEntries,
          budgets: Array.isArray(parsed.budgets) ? parsed.budgets.map((b: Budget) => normalizeBudget(b)) : defaultBudgets,
          holdings: Array.isArray(parsed.holdings) ? parsed.holdings : defaultHoldings,
          bills: Array.isArray(parsed.bills) ? parsed.bills : defaultBills,
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
        };
        setState(imported);
        saveState(imported);
        setLocal(imported.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        alert('Import failed. Please select a valid MoneyHub JSON backup file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
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
        <div className="settings-section">
          <h3>Sign In</h3>
          <p className="settings-description">Optional Google login. Use this to link your data to a single identity.</p>
          {!authEnabled ? (
            <p className="settings-description">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (optional VITE_SUPABASE_REDIRECT_URL) to enable Google sign-in.</p>
          ) : authLoading ? (
            <p className="settings-description">Checking sign-in status...</p>
          ) : authUser ? (
            <div className="settings-auth-row">
              <div>
                <div className="settings-auth-label">Signed in as</div>
                <div className="settings-auth-value">{authUser.email || 'Unknown user'}</div>
              </div>
              <button className="btn-secondary" onClick={signOut}>Sign out</button>
            </div>
          ) : (
            <button className="btn-secondary" onClick={signInWithGoogle}>Sign in with Google</button>
          )}
        </div>
        <div className="settings-section">
          <h3>Data Backup</h3>
          <p className="settings-description">Export your data to move it to another device, or import a previous backup.</p>
          <div className="settings-actions settings-actions-inline">
            <button className="btn-secondary" onClick={exportData}>Export Data</button>
            <label className="btn-secondary file-upload">
              Import Data
              <input type="file" accept="application/json" onChange={importData} />
            </label>
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
