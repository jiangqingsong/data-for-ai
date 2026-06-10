/**
 * RightPanel - 右侧溯源详情面板
 * 从右侧滑出，显示文档页的原文内容
 *
 * 迭代5：集成 Toast、退出动画、工具函数
 */
import React, { useState, useRef } from 'react';
import { X, Loader2, Copy, FileText } from 'lucide-react';
import { copyToClipboard } from '../utils';
import { useToast } from './Toast';

const RightPanel = ({ isOpen, sourceData, onClose, onOpenFullDocument }) => {
  const [closing, setClosing] = useState(false);
  const { showToast } = useToast();

  /** 带退出动画的关闭 */
  const handleClose = () => {
    setClosing(true);
  };

  /** 退出动画完成后真正关闭 */
  const handleAnimationEnd = () => {
    if (closing) {
      setClosing(false);
      onClose();
    }
  };

  /** 复制原文到剪贴板 */
  const handleCopyText = async () => {
    if (!sourceData?.pageText) return;
    const ok = await copyToClipboard(sourceData.pageText);
    showToast(ok ? '原文已复制' : '复制失败', ok ? 'success' : 'error');
  };

  if (!isOpen && !closing) return null;

  return (
    <div
      className={`w-[380px] border-l border-border bg-surface-white flex-shrink-0 shadow-soft-lg ${closing ? 'right-panel-exit' : 'right-panel-enter'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="flex flex-col h-full">
        {/* 顶部：文档名 + 关闭按钮 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-text-secondary flex-shrink-0" />
            <h3 className="text-body text-text-primary truncate" title={sourceData?.filename}>
              {sourceData?.filename || '溯源详情'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-element text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* 页码标签 */}
        {sourceData && (
          <div className="px-4 py-2 border-b border-border bg-gray-50">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-caption bg-brand-50 text-brand-500 rounded-element border border-brand-100 transition-colors">
              第 {sourceData.page + 1} 页
              {sourceData.total_pages != null && (
                <span className="text-text-secondary">/ {sourceData.total_pages}</span>
              )}
            </span>
          </div>
        )}

        {/* 中部：原文预览区 */}
        <div className="flex-1 overflow-y-auto p-4">
          {sourceData?.loading ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-2">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-caption">加载页面内容...</span>
            </div>
          ) : sourceData?.pageText ? (
            <div className="text-body text-text-primary whitespace-pre-wrap leading-relaxed">
              {sourceData.pageText}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
              <FileText size={32} className="mb-2 opacity-30" />
              <p className="text-body">选择来源查看原文详情</p>
            </div>
          )}
        </div>

        {/* 底部：操作按钮区 */}
        <div className="border-t border-border p-3 flex gap-2">
          <button
            onClick={handleCopyText}
            disabled={!sourceData?.pageText || sourceData?.loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-caption border border-border rounded-element text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy size={14} />
            <span>复制原文</span>
          </button>
          <button
            onClick={() => sourceData?.filename && onOpenFullDocument(sourceData.filename)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-caption bg-brand-500 text-white rounded-element hover:bg-brand-600 transition-colors"
          >
            <FileText size={14} />
            <span>打开完整文档</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
