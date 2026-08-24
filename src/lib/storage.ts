import { DEFAULT_MEMBERS } from './constants';
import { Expense, GroupState, Member, SettlementPeriod } from '@/types';
import { calculateDebtsByMode } from './settlement-algorithm';

const STORAGE_KEY = 'CHIA_TIEN_4_NGUOI_CLEAN_V2';

// Khởi đầu trống hoàn toàn (0 khoản chi giả)
const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_STATE: GroupState = {
  groupName: 'Nhóm Chi Tiêu 4 Người 🚀',
  members: DEFAULT_MEMBERS,
  expenses: INITIAL_EXPENSES,
  history: [],
  adminPin: '1234',
  settlementMode: 'PAIRWISE', // Bù trừ trực tiếp 1-1 theo từng người chi
};

export function getInitialState(): GroupState {
  if (typeof window === 'undefined') return INITIAL_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.members && parsed.members.length >= 4) {
        return {
          ...INITIAL_STATE,
          ...parsed,
          settlementMode: parsed.settlementMode || 'PAIRWISE',
        };
      }
    }
  } catch (err) {
    console.error('Failed to load from storage:', err);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
  } catch {
    // Ignore
  }
  return INITIAL_STATE;
}

export function saveState(state: GroupState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save to storage:', err);
  }
}

/**
 * Đóng kỳ hiện tại và lưu vào lịch sử
 */
export function archiveCurrentPeriod(
  state: GroupState,
  title: string
): GroupState {
  const totalAmount = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const debts = calculateDebtsByMode(
    state.members,
    state.expenses,
    state.settlementMode || 'PAIRWISE'
  );

  const newPeriod: SettlementPeriod = {
    id: `period_${Date.now()}`,
    title: title || `Kỳ kết toán ${new Date().toLocaleDateString('vi-VN')}`,
    startDate:
      state.expenses.length > 0
        ? state.expenses[state.expenses.length - 1].date
        : new Date().toISOString(),
    endDate: new Date().toISOString(),
    totalAmount,
    expenses: [...state.expenses],
    debts,
    status: 'COMPLETED',
    settledAt: new Date().toISOString(),
  };

  const newState: GroupState = {
    ...state,
    expenses: [], // Reset danh sách chi tiêu cho kỳ mới
    history: [newPeriod, ...state.history],
  };

  saveState(newState);
  return newState;
}
