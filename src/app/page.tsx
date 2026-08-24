'use client';

import React, { useState, useEffect } from 'react';
import { Expense, GroupState, Member } from '@/types';
import {
  getInitialState,
  saveState,
  archiveCurrentPeriod,
  INITIAL_STATE,
} from '@/lib/storage';
import { Navbar } from '@/components/Navbar';
import { BalanceOverview } from '@/components/BalanceOverview';
import { ExpenseList } from '@/components/ExpenseList';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { SettlementModal } from '@/components/SettlementModal';
import { MemberSettingsModal } from '@/components/MemberSettingsModal';
import { HistoryModal } from '@/components/HistoryModal';
import { CloudSyncModal } from '@/components/CloudSyncModal';

export default function Home() {
  const [state, setState] = useState<GroupState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  // Admin permission
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load initial state from LocalStorage on mount
  useEffect(() => {
    const loaded = getInitialState();
    setState(loaded);
    setIsLoaded(true);
  }, []);

  const updateState = (newState: GroupState) => {
    setState(newState);
    saveState(newState);
  };

  // Expense Handlers
  const handleSaveExpense = (
    expenseData: Omit<Expense, 'id'>,
    editId?: string
  ) => {
    if (editId) {
      const updated = state.expenses.map((e) =>
        e.id === editId ? { ...expenseData, id: editId } : e
      );
      updateState({ ...state, expenses: updated });
      showToast('Đã cập nhật khoản chi thành công! ✨');
    } else {
      const newExp: Expense = {
        ...expenseData,
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      updateState({
        ...state,
        expenses: [newExp, ...state.expenses],
      });
      showToast('Đã thêm khoản chi mới! 🎉');
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa khoản chi này?')) {
      const filtered = state.expenses.filter((e) => e.id !== expenseId);
      updateState({ ...state, expenses: filtered });
      showToast('Đã xóa khoản chi.');
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditExpense(expense);
    setIsAddExpenseOpen(true);
  };

  const handleAddNewExpenseClick = () => {
    setEditExpense(null);
    setIsAddExpenseOpen(true);
  };

  // Member Handlers
  const handleSaveMembers = (updatedMembers: Member[], newPin?: string) => {
    updateState({
      ...state,
      members: updatedMembers,
      adminPin: newPin || state.adminPin,
    });
    showToast('Đã lưu thông tin 4 thành viên & Ngân hàng! 💳');
  };

  const handleEditMemberClick = (member: Member) => {
    setSelectedMemberForEdit(member.id);
    setIsMembersOpen(true);
  };

  // Settlement Finalize
  const handleArchivePeriod = (title: string) => {
    const nextState = archiveCurrentPeriod(state, title);
    setState(nextState);
    showToast(`Đã chốt sổ "${title}" và lưu vào lịch sử! 🚀`);
  };

  // Reset Demo
  const handleResetDemo = () => {
    if (confirm('Bạn có muốn khôi phục dữ liệu chi tiêu mẫu ban đầu của 4 người?')) {
      updateState(INITIAL_STATE);
      showToast('Đã khôi phục dữ liệu mẫu! 🔄');
    }
  };

  // Import Backup
  const handleImportState = (imported: GroupState) => {
    updateState(imported);
    showToast('Đã nhập dữ liệu thành công!');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Đang tải dữ liệu nhóm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-xl animate-fadeIn text-xs sm:text-sm flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        state={state}
        onUpdateState={updateState}
        onOpenMembers={() => {
          setSelectedMemberForEdit(null);
          setIsMembersOpen(true);
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSync={() => setIsSyncOpen(true)}
        isAdminUnlocked={isAdminUnlocked}
        setIsAdminUnlocked={setIsAdminUnlocked}
        onResetDemo={handleResetDemo}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-6">
        {/* Realtime Balances & Quick Settlement Bar */}
        <BalanceOverview
          members={state.members}
          expenses={state.expenses}
          onOpenAddExpense={handleAddNewExpenseClick}
          onOpenSettlement={() => setIsSettlementOpen(true)}
          onEditMember={handleEditMemberClick}
        />

        {/* Expenses List & Filtering */}
        <ExpenseList
          expenses={state.expenses}
          members={state.members}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
          onOpenAddExpense={handleAddNewExpenseClick}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>
          Ứng dụng Chia Tiền &amp; Kết Toán Nợ Tự Động • Tích hợp VietQR Napas 247 • Sẵn sàng Deploy Vercel
        </p>
      </footer>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditExpense(null);
        }}
        onSave={handleSaveExpense}
        members={state.members}
        editExpense={editExpense}
      />

      <SettlementModal
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        state={state}
        onArchivePeriod={handleArchivePeriod}
        isAdminUnlocked={isAdminUnlocked}
        onUnlockAdmin={() => {
          setIsSettlementOpen(false);
          setIsAdminUnlocked(true);
          showToast('Đã mở quyền Admin!');
        }}
      />

      <MemberSettingsModal
        isOpen={isMembersOpen}
        onClose={() => {
          setIsMembersOpen(false);
          setSelectedMemberForEdit(null);
        }}
        members={state.members}
        onSaveMembers={handleSaveMembers}
        adminPin={state.adminPin}
        selectedMemberId={selectedMemberForEdit}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={state.history}
        members={state.members}
      />

      <CloudSyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        state={state}
        onImportState={handleImportState}
      />
    </div>
  );
}
