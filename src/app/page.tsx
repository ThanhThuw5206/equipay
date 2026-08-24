'use client';

import React, { useState, useEffect } from 'react';
import { Expense, GroupState, Member, UserAccount } from '@/types';
import {
  getInitialState,
  saveState,
  archiveCurrentPeriod,
  getCurrentUser,
  setCurrentUser,
  INITIAL_STATE,
} from '@/lib/storage';
import {
  fetchCloudState,
  pushCloudState,
  subscribeToCloudChanges,
} from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { TabNavigation, AppTab } from '@/components/TabNavigation';
import { HomeTab } from '@/components/tabs/HomeTab';
import { OverviewTab } from '@/components/tabs/OverviewTab';
import { ExpensesTab } from '@/components/tabs/ExpensesTab';
import { DebtsTab } from '@/components/tabs/DebtsTab';
import { PaymentTab } from '@/components/tabs/PaymentTab';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { MemberSettingsModal } from '@/components/MemberSettingsModal';
import { HistoryModal } from '@/components/HistoryModal';
import { CloudSyncModal } from '@/components/CloudSyncModal';
import { UserManagerModal } from '@/components/UserManagerModal';
import { LoginScreen } from '@/components/LoginScreen';
import { calculatePairwiseDebts } from '@/lib/settlement-algorithm';

export default function Home() {
  const [state, setState] = useState<GroupState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(null);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<AppTab>('HOME');

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = useState(false);

  // Admin permission
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load initial state and attempt Cloud Database fetch on mount
  useEffect(() => {
    const loaded = getInitialState();
    setState(loaded);
    const user = getCurrentUser();
    setCurrentUserState(user);
    if (user?.role === 'ADMIN') {
      setIsAdminUnlocked(true);
    }
    setIsLoaded(true);

    // Tự động tải dữ liệu từ Supabase Cloud DB nếu đã kết nối
    fetchCloudState().then((res) => {
      if (res.state && res.state.members && res.state.members.length >= 4) {
        setState(res.state);
        saveState(res.state);
      } else {
        // Nếu trên Supabase chưa có dữ liệu (0 bản ghi), tự động đẩy dữ liệu hiện tại lên ngay!
        pushCloudState(loaded);
      }
    });

    // Lắng nghe thay đổi Realtime từ Supabase (khi người khác thêm chi tiêu)
    const unsubscribe = subscribeToCloudChanges((remoteState) => {
      if (remoteState && remoteState.members) {
        setState(remoteState);
        saveState(remoteState);
        showToast('Dữ liệu vừa được cập nhật từ thiết bị khác! 🔄');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const updateState = (newState: GroupState) => {
    setState(newState);
    saveState(newState);

    // Tự động đẩy dữ liệu lên Supabase Cloud DB ngầm
    pushCloudState(newState).catch((err) =>
      console.warn('Cloud sync background error:', err)
    );
  };

  // Auth Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUserState(user);
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      setIsAdminUnlocked(true);
    }
    showToast(`Xin chào, ${user.displayName}! 🎉`);
    // Đảm bảo dữ liệu nhóm được đẩy lên Supabase
    pushCloudState(state);
  };

  const handleLogout = () => {
    setCurrentUserState(null);
    setCurrentUser(null);
    setIsAdminUnlocked(false);
    showToast('Đã đăng xuất tài khoản an toàn.');
  };

  const handleSaveUsers = (updatedUsers: UserAccount[]) => {
    updateState({ ...state, users: updatedUsers });
    showToast('Đã cập nhật danh sách tài khoản!');
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
        createdBy: currentUser?.displayName || undefined,
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
    if (!isAdmin && currentUser?.memberId && member.id !== currentUser.memberId) {
      showToast('🔒 Bạn chỉ có quyền chỉnh sửa thông tin của chính mình!');
      setSelectedMemberForEdit(currentUser.memberId);
    } else {
      setSelectedMemberForEdit(member.id);
    }
    setIsMembersOpen(true);
  };

  // Settlement Finalize
  const handleArchivePeriod = (title: string) => {
    const nextState = archiveCurrentPeriod(state, title);
    setState(nextState);
    showToast(`Đã chốt sổ "${title}" và lưu vào lịch sử! 🚀`);
    setActiveTab('HOME');
  };

  // Reset Demo
  const handleResetDemo = () => {
    if (confirm('Bạn có muốn khôi phục trạng thái ban đầu?')) {
      updateState(INITIAL_STATE);
      showToast('Đã khôi phục trạng thái ban đầu! 🔄');
    }
  };

  // Import Backup
  const handleImportState = (imported: GroupState) => {
    updateState(imported);
    showToast('Đã nhập dữ liệu thành công!');
  };

  const isAdmin = currentUser?.role === 'ADMIN' || isAdminUnlocked;
  const debts = calculatePairwiseDebts(state.members, state.expenses);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Đang tải EquiPay...</p>
        </div>
      </div>
    );
  }

  // BẮT BUỘC ĐĂNG NHẬP: Nếu chưa đăng nhập, hiển thị màn hình LoginScreen toàn trang
  if (!currentUser) {
    return (
      <LoginScreen
        users={state.users || []}
        onLoginSuccess={handleLoginSuccess}
      />
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
        onOpenUserManager={() => setIsUserManagerOpen(true)}
        onOpenLogin={() => {}}
        currentUser={currentUser}
        onLogout={handleLogout}
        isAdminUnlocked={isAdmin}
        setIsAdminUnlocked={setIsAdminUnlocked}
        onResetDemo={handleResetDemo}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-4">
        {/* 5 Tab Navigation Bar */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          expenseCount={state.expenses.length}
          debtCount={debts.length}
        />

        {/* Tab Content Display */}
        {activeTab === 'HOME' && (
          <HomeTab
            members={state.members}
            expenses={state.expenses}
            currentUser={currentUser}
            onOpenAddExpense={handleAddNewExpenseClick}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'OVERVIEW' && (
          <OverviewTab
            members={state.members}
            expenses={state.expenses}
            onEditMember={handleEditMemberClick}
            onNavigateToDebts={() => setActiveTab('DEBTS')}
          />
        )}

        {activeTab === 'EXPENSES' && (
          <ExpensesTab
            expenses={state.expenses}
            members={state.members}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onOpenAddExpense={handleAddNewExpenseClick}
          />
        )}

        {activeTab === 'DEBTS' && (
          <DebtsTab
            members={state.members}
            expenses={state.expenses}
            currentUser={currentUser}
            onNavigateToPayment={() => setActiveTab('PAYMENT')}
          />
        )}

        {activeTab === 'PAYMENT' && (
          <PaymentTab
            state={state}
            currentUser={currentUser}
            onArchivePeriod={handleArchivePeriod}
            isAdminUnlocked={isAdmin}
            onUnlockAdmin={() => {
              setIsAdminUnlocked(true);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>
          💎 EquiPay • Quản Lý &amp; Kết Toán Chi Tiêu Nhóm 4 Người • VietQR Napas 247
        </p>
      </footer>

      {/* Modals */}
      <UserManagerModal
        isOpen={isUserManagerOpen}
        onClose={() => setIsUserManagerOpen(false)}
        users={state.users || []}
        members={state.members}
        onSaveUsers={handleSaveUsers}
        currentUser={currentUser}
      />

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
        currentUser={currentUser}
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
