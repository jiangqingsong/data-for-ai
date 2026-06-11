/**
 * RightPanel - 右侧溯源详情面板
 *
 * 功能：文档原文预览、页码切换、高亮匹配、基于本段提问、收藏素材
 * 迭代6：全链路重构 — 元信息区、页码下拉、文本高亮、新操作按钮
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Loader2, Copy, FileText, ChevronDown, ChevronLeft, Bookmark, MessageSquarePlus } from 'lucide-react';
import { copyToClipboard } from '../utils';
import { useToast } from './Toast';

/**
 * 在页面文本中高亮匹配 snippet
 * 返回 React 元素数组，匹配部分包裹浅黄色背景
 */
const highlightSnippetInText = (pageText, snippet) => {
  if (!pageText || !snippet) return pageText;

  // 取 snippet 前60字做匹配关键词
  const key = snippet.slice(0, 60).replace(/[!#$%&*]/g, '').trim();
  if (key.length < 6) return pageText;

  // 尝试精确子串匹配
  const idx = pageText.indexOf(key);
  if (idx === -1) {
    // 降级：尝试匹配前30字
    const shortKey = key.slice(0, 30);
    const idx2 = pageText.indexOf(shortKey);
    if (idx2 === -1) return pageText;
    return (
      <>
        {pageText.slice(0, idx2)}
        <mark className="bg-yellow-100 text-text-primary rounded-sm px-0.5">{pageText.slice(idx2, idx2 + shortKey.length)}</mark>
        {pageText.slice(idx2 + shortKey.length)}
      </>
    );
  }

  return (
    <>
      {pageText.slice(0, idx)}
      <mark className="bg-yellow-100 text-text-primary rounded-sm px-0.5">{pageText.slice(idx, idx + key.length)}</mark>
      {pageText.slice(idx + key.length)}
    </>
  );
};

const RightPanel = ({ isOpen, sourceData, onClose, onOpenFullDocument, onQuoteForQuestion, onFavoriteSnippet, onOpenSourceDetail }) => {
  const [closing, setClosing] = useState(false);
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { showToast } = useToast();

  // 点击外部关闭下拉
  useEffect(() => {
    if (!pageDropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setPageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pageDropdownOpen]);

  const handleClose = () => setClosing(true);

  const handleAnimationEnd = () => {
    if (closing) {
      setClosing(false);
      onClose();
    }
  };

  const handleCopyText = async () => {
    if (!sourceData?.pageText) return;
    const ok = await copyToClipboard(sourceData.pageText);
    showToast(ok ? '原文已复制' : '复制失败', ok ? 'success' : 'error');
  };

  const handleQuoteForQuestion = () => {
    if (!sourceData?.snippet) return;
    onQuoteForQuestion?.(sourceData.snippet);
    showToast('已填入输入框，可编辑后发送', 'success');
  };

  const handleFavorite = () => {
    if (!sourceData?.filename) return;
    onFavoriteSnippet?.(sourceData.filename, sourceData.page, sourceData.snippet);
    showToast('已收藏本段素材', 'success');
  };

  /** 构建命中文档页码列表 */
  const hitPages = useMemo(() => {
    if (!sourceData?.hitPages || sourceData.hitPages.length === 0) return [];
    const pages = sourceData.hitPages.filter(p => p != null && !isNaN(p));
    return [...new Set(pages)].sort((a, b) => a - b);
  }, [sourceData?.hitPages]);

  /** 页码跳转 */
  const handleJumpToPage = (page) => {
    setPageDropdownOpen(false);
    if (!sourceData?.filename) return;
    onOpenSourceDetail?.(sourceData.filename, page, sourceData.snippet, sourceData.hitPages);
  };

  /** 当前命中的页码对应的引用编号 */
  const hitRefIndex = useMemo(() => {
    if (!sourceData?.hitPages || sourceData?.page == null) return null;
    const idx = sourceData.hitPages.indexOf(sourceData.page);
    return idx >= 0 ? idx + 1 : null;
  }, [sourceData?.hitPages, sourceData?.page]);

  if (!isOpen && !closing) return null;

  return (
    <div
      className={`w-[380px] border-l border-border bg-surface-white flex-shrink-0 shadow-soft-lg ${closing ? 'right-panel-exit' : 'right-panel-enter'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="flex flex-col h-full">
        {/* 顶部：收起按钮 + 文档名 + 关闭按钮 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <button
            onClick={handleClose}
            className="p-1 rounded-element text-text-secondary hover:text-brand-500 hover:bg-brand-50 transition-colors flex-shrink-0"
            title="收起面板"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
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

        {/* 元信息区：页码 + 下拉跳转 + 提示 */}
        {sourceData && (
          <div className="px-4 py-2 border-b border-border bg-gray-50 space-y-2">
            {/* 页码标签 + 下拉跳转 */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-caption bg-brand-50 text-brand-500 rounded-element border border-brand-100">
                第 {sourceData.page + 1} 页
                {sourceData.totalPages != null && (
                  <span className="text-text-secondary">/ {sourceData.totalPages}</span>
                )}
              </span>

              {/* 命中文档页码下拉 */}
              {hitPages.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
                    className="flex items-center gap-1 px-2 py-0.5 text-caption text-text-secondary bg-white border border-border rounded-element hover:border-brand-300 hover:text-brand-500 transition-colors"
                  >
                    <span>跳转页码</span>
                    <ChevronDown size={12} className={`transition-transform ${pageDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {pageDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-border rounded-element shadow-soft z-20 max-h-48 overflow-y-auto">
                      {hitPages.map(p => (
                        <button
                          key={p}
                          onClick={() => handleJumpToPage(p)}
                          className={`block w-full text-left px-3 py-1.5 text-caption hover:bg-brand-50 transition-colors ${
                            p === sourceData.page ? 'bg-brand-50 text-brand-500 font-medium' : 'text-text-primary'
                          }`}
                        >
                          第 {p + 1} 页
                          {p === sourceData.page ? ' (当前)' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 关联提示 */}
            {hitRefIndex != null && (
              <p className="text-caption text-text-secondary">
                本段原文对应对话中
                <span className="text-brand-500 font-medium mx-0.5">参考资料{hitRefIndex} 第{sourceData.page + 1}页</span>
                引用内容
              </p>
            )}
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
              {highlightSnippetInText(sourceData.pageText, sourceData.snippet)}
            </div>
          ) : sourceData && !sourceData.loading ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-3 px-4 text-center">
              <FileText size={32} className="opacity-30" />
              <p className="text-body">文档解析异常，可重新上传或打开完整文档查看</p>
              {sourceData.filename && (
                <button
                  onClick={() => onOpenFullDocument(sourceData.filename)}
                  className="px-3 py-1.5 text-caption bg-brand-500 text-white rounded-element hover:bg-brand-600 transition-colors"
                >
                  打开完整文档
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
              <FileText size={32} className="mb-2 opacity-30" />
              <p className="text-body">选择来源查看原文详情</p>
            </div>
          )}
        </div>

        {/* 底部：操作按钮区 */}
        <div className="border-t border-border p-3 space-y-2">
          <div className="flex gap-2">
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
          <div className="flex gap-2">
            <button
              onClick={handleQuoteForQuestion}
              disabled={!sourceData?.snippet}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-caption border border-brand-200 text-brand-500 rounded-element hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquarePlus size={14} />
              <span>基于本段提问</span>
            </button>
            <button
              onClick={handleFavorite}
              disabled={!sourceData?.filename}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-caption border border-yellow-200 text-yellow-600 rounded-element hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bookmark size={14} />
              <span>收藏本段素材</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
