/**
 * Toast - 轻量级 Toast 通知系统
 *
 * 使用方式：
 *   import { useToast } from './Toast';
 *   const { showToast } = useToast();
 *   showToast('操作成功', 'success');
 *
 * 类型: 'success' | 'error' | 'info'
 * 自动消失: 2秒
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
};

const TOAST_CONFIG = {
  success: { icon: CheckCircle, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    timersRef.current[id] = setTimeout(() => removeToast(id), 2000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast 容器 — 固定在右上角 */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
          const Icon = config.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-element border shadow-soft-lg animate-toastIn ${config.bg} ${config.border} ${config.text} text-body`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 p-0.5 rounded hover:bg-black/5 transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
