'use client';

import React, { useState } from 'react';
import { Member, UserAccount, UserRole } from '@/types';
import { X, UserPlus, Shield, User, Trash2, Key, Check, AlertCircle } from 'lucide-react';

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  members: Member[];
  onSaveUsers: (updatedUsers: UserAccount[]) => void;
  currentUser: UserAccount | null;
}

export const UserManagerModal: React.FC<UserManagerModalProps> = ({
  isOpen,
  onClose,
  users,
  members,
  onSaveUsers,
  currentUser,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('MEMBER');
  const [memberId, setMemberId] = useState<string>(members[0]?.id || 'mem_1');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự!');
      return;
    }
    if (!password || password.length < 4) {
      setError('Mật khẩu phải có ít nhất 4 ký tự!');
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      setError('Tên đăng nhập này đã tồn tại! Vui lòng chọn tên khác.');
      return;
    }

    const assignedMember = members.find((m) => m.id === memberId);
    const finalDisplayName = displayName.trim() || assignedMember?.name || cleanUsername;

    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      password,
      displayName: finalDisplayName,
      role,
      memberId,
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    onSaveUsers(updated);

    // Reset form
    setUsername('');
    setPassword('');
    setDisplayName('');
    setShowAddForm(false);
    setSuccessMsg(`Đã tạo tài khoản "${cleanUsername}" thành công! 🎉`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (targetUser.username === 'admin' || targetUser.id === currentUser?.id) {
      alert('Không thể xóa tài khoản Admin chính hoặc tài khoản đang đăng nhập!');
      return;
    }

    if (confirm(`Bạn có chắc muốn xóa tài khoản "${targetUser.username}"?`)) {
      const updated = users.filter((u) => u.id !== userId);
      onSaveUsers(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                Quản Lý Tài Khoản Người Dùng (Admin)
              </h2>
              <p className="text-[11px] text-slate-400">Tạo tài khoản và cấp quyền cho các thành viên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="overflow-y-auto py-3 space-y-4 flex-1 pr-1">
          {/* Create User Toggle Button */}
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tạo tài khoản mới cấp cho thành viên</span>
            </button>
          ) : (
            /* Add User Form */
            <form
              onSubmit={handleCreateUser}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Thông tin tài khoản mới
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Đóng form
                </button>
              </div>

              {error && (
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tên đăng nhập (Username) *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="VD: huy, mai, nam..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Mật khẩu *
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="VD: 123456"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Gán vào Thành viên
                  </label>
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.avatar} {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Vai trò (Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="MEMBER">Thành viên thông thường</option>
                    <option value="ADMIN">Quản Trị Viên (Toàn quyền)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tên hiển thị (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Để trống sẽ tự lấy tên thành viên"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow"
                >
                  Xác nhận tạo
                </button>
              </div>
            </form>
          )}

          {/* List of Existing Accounts */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Danh sách tài khoản ({users.length})
            </h3>

            <div className="space-y-2">
              {users.map((u) => {
                const assignedMember = members.find((m) => m.id === u.memberId);
                const isMainAdmin = u.username === 'admin';

                return (
                  <div
                    key={u.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm shrink-0">
                        {assignedMember?.avatar || '👤'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-200 truncate">
                            {u.displayName || u.username}
                          </span>
                          {u.role === 'ADMIN' ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold shrink-0">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold shrink-0">
                              Thành viên
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          user: <strong className="text-emerald-400">{u.username}</strong> | pass: <strong className="text-slate-300">{u.password}</strong>
                        </p>
                      </div>
                    </div>

                    {!isMainAdmin && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition shrink-0"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
