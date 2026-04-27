import React, { useState, useEffect, useRef } from "react";
import { loginAdmin } from "@/lib/admin-auth";

interface Props {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function AdminLoginModal({ open, onSuccess, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loginAdmin(password)) {
      setPassword("");
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setPassword("");
      inputRef.current?.focus();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-80 rounded-lg border border-[#3a3a4a] bg-[#1a1a2a] p-6 shadow-2xl transition-all ${shake ? "animate-[shake_0.3s_ease-in-out]" : ""}`}>
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600/20 text-blue-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-200">Доступ к редактору</div>
            <div className="text-[11px] text-gray-500">Только для администраторов</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] text-gray-500">Пароль администратора</label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              placeholder="Введите пароль..."
              className={`w-full rounded border bg-[#0e0e1a] px-3 py-2 text-sm text-gray-200 outline-none transition-colors placeholder-gray-700
                ${error ? "border-red-500 focus:border-red-400" : "border-[#2a2a3a] focus:border-blue-500"}`}
              autoComplete="current-password"
            />
            {error && (
              <p className="mt-1.5 text-[11px] text-red-400">Неверный пароль</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-[#2a2a3a] py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 rounded bg-blue-700 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
