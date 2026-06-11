/**
 * KBCreateModal - 新建知识库弹窗
 */
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const KBCreateModal = ({ isOpen, onClose, onCreate, isLoading }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入知识库名称');
      return;
    }
    if (trimmed.length > 50) {
      setError('名称不能超过50个字符');
      return;
    }
    if (/[\/\\]/.test(trimmed)) {
      setError('名称不能包含 / 或 \\');
      return;
    }
    const result = await onCreate(trimmed);
    if (result) {
      onClose();
    } else {
      setError('创建失败，请稍后重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-soft-lg w-[400px] p-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-body font-semibold text-text-primary">新建知识库</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-text-secondary">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-caption text-text-secondary mb-1.5">知识库名称</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="例如：高中物理、机器学习论文"
            className="w-full px-3 py-2 border border-border rounded-lg text-body text-text-primary placeholder:text-text-secondary focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            maxLength={50}
          />
          {error && <p className="text-caption text-red-500 mt-1.5">{error}</p>}
          <p className="text-caption text-text-secondary mt-1.5">支持中英文，不超过50个字符</p>
          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-body text-text-secondary bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-body text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KBCreateModal;
