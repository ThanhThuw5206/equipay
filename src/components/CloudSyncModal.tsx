'use client';

import React, { useRef, useState } from 'react';
import { GroupState } from '@/types';
import { X, Database, Download, Upload, Cloud, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GroupState;
  onImportState: (importedState: GroupState) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  state,
  onImportState,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ChiaTien_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.members && parsed.expenses) {
          onImportState(parsed);
          alert('Khôi phục dữ liệu sao lưu thành công!');
          onClose();
        } else {
          alert('Tệp sao lưu không đúng định dạng!');
        }
      } catch {
        alert('Lỗi đọc tệp sao lưu JSON!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-100">
                Đồng Bộ & Sao Lưu Dữ Liệu
              </h2>
              <p className="text-xs text-slate-400">Sao lưu file JSON hoặc kết nối Supabase Cloud DB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 py-4">
          {/* JSON Backup & Restore Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>💾</span>
              <span>Sao lưu & Khôi phục (Tức thì)</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Toàn bộ dữ liệu của 4 thành viên đang được lưu trữ an toàn trong trình duyệt của bạn. Bạn có thể tải file sao lưu về máy để gửi cho bạn bè hoặc nhập vào thiết bị khác.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Tải file Sao lưu (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Khôi phục từ file</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Vercel Deployment & Supabase Realtime Info */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Cloud className="w-4 h-4" />
                <span>Triển khai lên Vercel (100% Miễn Phí)</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                0 VNĐ / Tháng
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Để cả 4 người cùng truy cập trên điện thoại mọi lúc mọi nơi:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 pl-1">
              <li>Đẩy code lên <strong>GitHub</strong> của bạn.</li>
              <li>Truy cập <strong className="text-emerald-400">vercel.com</strong> ➔ Bấm <strong>Add New Project</strong> ➔ Chọn repo này.</li>
              <li>Bấm <strong>Deploy</strong> (Chỉ mất 30 giây là có link web dạng <code className="text-teal-300">chiatien-nhom4.vercel.app</code>).</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
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
