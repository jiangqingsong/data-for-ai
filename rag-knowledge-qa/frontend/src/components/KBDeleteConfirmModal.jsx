/**
 * KBDeleteConfirmModal - 删除知识库确认弹窗
 *
 * 交互逻辑：点击"确认删除"后弹窗立刻关闭，由父组件负责乐观更新和后台请求。
 * 弹窗只做确认提醒，不做等待。
 */
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const KBDeleteConfirmModal = ({ isOpen, onClose, onConfirm, kbName }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(kbName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-soft-lg w-[420px] p-6 animate-fadeIn">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-body font-semibold text-text-primary mb-1">删除知识库</h3>
            <p className="text-caption text-text-secondary leading-relaxed">
              此操作不可撤销。知识库 <span className="font-semibold text-text-primary">"{kbName}"</span> 中的所有文档和向量数据将被永久删除。
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-text-secondary flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-body text-text-secondary bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-body text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default KBDeleteConfirmModal;
