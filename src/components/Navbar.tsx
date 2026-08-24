'use client';

import React, { useState } from 'react';
import { GroupState } from '@/types';
import {
  Users,
  History,
  Settings,
  Shield,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Database,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  state: GroupState;
  onUpdateState: (newState: GroupState) => void;
  onOpenMembers: () => void;
  onOpenHistory: () => void;
  onOpenSync: () => void;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (unlocked: boolean) => void;
  onResetDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  state,
  onUpdateState,
  onOpenMembers,
  onOpenHistory,
  onOpenSync,
  isAdminUnlocked,
  setIsAdminUnlocked,
  onResetDemo,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(state.groupName);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      onUpdateState({ ...state, groupName: tempTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleAdminToggle = () => {
    if (isAdminUnlocked) {
      setIsAdminUnlocked(false);
    } else {
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    }
  };

  const handleVerifyPin = () => {
    const correctPin = state.adminPin || '1234';
    if (pinInput === correctPin) {
      setIsAdminUnlocked(true);
      setShowPinModal(false);
    } else {
      setPinError(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          {/* Logo & Group Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    onBlur={handleSaveTitle}
                    autoFocus
                    className="bg-slate-800 border border-slate-700 text-white text-sm sm:text-base font-bold rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                  <h1 className="font-bold text-sm sm:text-lg truncate text-slate-100 group-hover:text-emerald-400 transition">
                    {state.groupName}
                  </h1>
                  <span className="text-xs text-slate-400 hidden sm:inline">✏️</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  4 Thành viên
                </span>
                <span>•</span>
                <span>Chốt sổ qua VietQR</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Admin Unlock Badge */}
            <button
              onClick={handleAdminToggle}
              title={isAdminUnlocked ? 'Đang mở quyền Admin (Bấm để khóa)' : 'Mở khóa quyền Admin (Mặc định PIN: 1234)'}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                isAdminUnlocked
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-medium'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isAdminUnlocked ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admin ON</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </>
              )}
            </button>

            {/* Member Settings */}
            <button
              onClick={onOpenMembers}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
              title="Quản lý thông tin 4 thành viên & Ngân hàng"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">4 Thành viên</span>
            </button>

            {/* Settlement History */}
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
              title="Lịch sử các kỳ chốt sổ"
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Lịch sử ({state.history.length})</span>
            </button>

            {/* Cloud Sync */}
            <button
              onClick={onOpenSync}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title="Đồng bộ Supabase & Sao lưu"
            >
              <Database className="w-4 h-4 text-teal-400" />
            </button>

            {/* Reset Demo */}
            <button
              onClick={onResetDemo}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 transition"
              title="Khôi phục dữ liệu mẫu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Admin PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xs w-full p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-lg mb-1">Mở khóa Quản Trị Viên</h3>
            <p className="text-center text-xs text-slate-400 mb-4">
              Nhập mã PIN để chốt sổ & kết toán nợ (Mặc định: <strong className="text-amber-400">1234</strong>)
            </p>

            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
              placeholder="Nhập mã PIN"
              autoFocus
              className="w-full text-center text-2xl tracking-widest font-mono bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 mb-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            {pinError && (
              <p className="text-rose-400 text-xs text-center mb-3">Mã PIN không đúng! Thử 1234</p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setShowPinModal(false)}
                className="py-2 px-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleVerifyPin}
                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition"
              >
                Mở khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
