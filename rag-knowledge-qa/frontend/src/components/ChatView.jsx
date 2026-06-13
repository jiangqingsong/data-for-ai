/**
 * ChatView - 对话消息展示区
 *
 * 功能：消息气泡、引用标签解析、参考来源折叠面板、文本选中追问
 * 迭代7：line-clamp-8折叠、文本选中弹出追问按钮
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, Loader2, Copy, RotateCcw, Star, ChevronDown, FileText, MessageSquarePlus, SearchX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { copyToClipboard } from '../utils';
import { useToast } from './Toast';

const COLLAPSE_THRESHOLD = 500;

/** 引用标签正则: 匹配半角/全角括号的「参考资料N 第M页」 */
const REF_TAG_REGEX = /[（(]?参考资料(\d+)\s*第(\d+)页[）)]?/g;

/**
 * 将引用标签转换为 Markdown 链接，同时按段落去重：
 * 同一段落内相同文档+页码仅保留第1个标签，消除重复冗余。
 */
const convertRefTagsToMarkdownLinks = (content) => {
  const paragraphs = content.split(/\n\n+/);
  return paragraphs.map(paragraph => {
    const seen = new Set();
    return paragraph.replace(REF_TAG_REGEX, (match, refNum, pageNum) => {
      const key = `${refNum}-${pageNum}`;
      if (seen.has(key)) return '';
      seen.add(key);
      return `[参考资料${refNum} 第${pageNum}页](#ref-${refNum}-${pageNum})`;
    });
  }).join('\n\n');
};

const preprocessMath = (content) => {
  if (!content) return content;
  content = content.replace(/\\\(([^]*?)\\\)/g, (_, inner) => `$${inner.trim()}$`);
  content = content.replace(/\\\[([^]*?)\\\]/g, (_, inner) => `$$${inner.trim()}$$`);
  if (!/\$/.test(content)) {
    content = content.replace(/(\\frac\{[^}]+\}\{[^}]+\}|\\neq|\\sqrt\{[^}]+\}|\\times|\\div|\\pm|\\cdot|\\leq|\\geq|\\approx|\\infty|\\pi|\\alpha|\\beta|\\gamma|\\theta|\\sum|\\int|\\prod|\\left|\\right)/g, '$$$1$');
  }
  return content;
};

/**
 * MarkdownContent — React.memo 隔离的 Markdown 渲染组件
 * 避免父组件 selectionPopup 状态变化导致 ReactMarkdown 重建 DOM、丢失浏览器选中效果
 */
const MarkdownContent = React.memo(({ content, shouldCollapse, isLong, isStreaming, sources, onOpenSourceDetail, hitPagesFromSources, onToggleExpand, isExpanded }) => {
  const displayContent = content;

  const markdownComponents = useMemo(() => ({
    p: ({ children }) => (
      <p className="whitespace-pre-wrap break-words text-text-primary" style={{ lineHeight: '1.7', marginBottom: '0.75em' }}>{children}</p>
    ),
    strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
    em: ({ children }) => <em className="italic text-text-primary">{children}</em>,
    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mt-2 text-text-primary">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mt-2 text-text-primary">{children}</ol>,
    li: ({ children }) => <li className="text-text-primary">{children}</li>,
    code: ({ children }) => (
      <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-caption text-text-primary">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-900 text-white p-4 rounded-element overflow-x-auto my-4">{children}</pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-border pl-4 italic text-text-secondary my-4">{children}</blockquote>
    ),
    h1: ({ children }) => <h1 className="text-title text-text-primary mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-module text-text-primary mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-body font-bold text-text-primary mb-2">{children}</h3>,
    a: ({ href, children }) => {
      if (href && href.startsWith('#ref-')) {
        const parts = href.replace('#ref-', '').split('-');
        if (parts.length < 2) return <span className="text-text-secondary">{children}</span>;
        const refNum = parseInt(parts[0], 10);
        if (isNaN(refNum) || refNum < 1) return <span className="text-text-secondary">{children}</span>;
        if (!sources || refNum > sources.length) return <span className="text-text-secondary">{children}</span>;
        const source = sources[refNum - 1];
        if (!source || source.page == null) return <span className="text-text-secondary">{children}</span>;
        return (
          <span
            className="ref-tag"
            onClick={() => onOpenSourceDetail(source.source, source.page, source.snippet, hitPagesFromSources)}
            title={`${source.source} 第${source.page + 1}页`}
          >
            {children}
          </span>
        );
      }
      return <a href={href} className="text-brand-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
    },
  }), [sources, onOpenSourceDetail, hitPagesFromSources]);

  return (
    <>
      <div className={shouldCollapse ? 'line-clamp-8' : ''}>
        <ReactMarkdown
          children={convertRefTagsToMarkdownLinks(preprocessMath(displayContent))}
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        />
      </div>

      {isLong && !isStreaming && (
        <button onClick={onToggleExpand}
          className="mt-2 text-caption text-brand-500 hover:text-brand-600 hover:underline transition-colors">
          {isExpanded ? '收起' : `展开全文 (${content.length} 字)`}
        </button>
      )}
    </>
  );
});

MarkdownContent.displayName = 'MarkdownContent';

const SkeletonBubble = ({ align }) => (
  <div className={`flex items-start gap-2 py-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
    <div className={`rounded-bubble animate-pulse max-w-[75%] ${
      align === 'right'
        ? 'bubble-user min-w-[160px]'
        : 'bubble-ai min-w-[240px]'
    }`}>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200/40 rounded w-3/4" />
        <div className="h-3 bg-gray-200/40 rounded w-1/2" />
        <div className="h-3 bg-gray-200/40 rounded w-5/6" />
      </div>
    </div>
  </div>
);

/** 文本选中追问弹出按钮 */
const SelectionPopup = ({ position, selectedText, onAsk, onClose, popupRef }) => {
  if (!position) return null;
  return (
    <div
      ref={popupRef}
      className="fixed z-50"
      style={{ top: position.top - 36, left: position.left }}
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAsk(selectedText); }}
        className="flex items-center gap-1 px-2 py-1 text-caption bg-white border border-brand-200 text-brand-500 rounded-element shadow-soft hover:bg-brand-50 transition-colors whitespace-nowrap"
      >
        <MessageSquarePlus size={13} />
        <span>针对选中内容追问</span>
      </button>
    </div>
  );
};

/**
 * MessageBubble - 单条消息气泡
 */
const MessageBubble = ({ message, onRegenerate, onToggleFavorite, onOpenSourceDetail, retrievalPhase, onAskAboutSelection }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [selectionPopup, setSelectionPopup] = useState(null);
  const contentRef = useRef(null);
  const popupRef = useRef(null);
  const { showToast } = useToast();

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isStreaming = message.isStreaming;
  const isLong = isAssistant && !isStreaming && message.content.length > COLLAPSE_THRESHOLD;
  const shouldCollapse = isLong && !isExpanded;

  const toggleExpand = useCallback(() => setIsExpanded(v => !v), []);

  /** 文本选中处理 — mouseup 时记录选中位置和文字 */
  const handleTextSelection = useCallback(() => {
    if (!isAssistant || isStreaming) return;
    // 延迟让浏览器先完成选择
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setSelectionPopup(null);
        return;
      }
      const selectedText = selection.toString().trim();
      if (selectedText.length < 3) { setSelectionPopup(null); return; }

      if (contentRef.current && !contentRef.current.contains(selection.anchorNode)) {
        setSelectionPopup(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPopup({
        top: rect.top + window.scrollY,
        left: rect.right + window.scrollX - 80,
        text: selectedText,
      });
    }, 0);
  }, [isAssistant, isStreaming]);

  /** 点击外部区域关闭弹窗，但点击弹窗内部不关闭 */
  useEffect(() => {
    const handler = (e) => {
      if (!selectionPopup) return;
      // 点击弹窗内部不关闭
      if (popupRef.current?.contains(e.target)) return;
      setSelectionPopup(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectionPopup]);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  /** 追问：将选中文字填入输入框 */
  const handleAskSelection = (text) => {
    if (text) {
      onAskAboutSelection?.(text);
      showToast('已填入输入框', 'success');
    }
    setSelectionPopup(null);
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    const ok = await copyToClipboard(message.content);
    showToast(ok ? '已复制到剪贴板' : '复制失败', ok ? 'success' : 'error');
  };

  const handleRegenerate = (e) => { e.stopPropagation(); onRegenerate(); };

  const handleToggleFav = (e) => {
    e.stopPropagation();
    onToggleFavorite(message.id);
    showToast(message.favorite ? '已取消收藏' : '已收藏', 'success');
  };

  const hitPagesFromSources = useMemo(
    () => message.sources?.map(s => s.page).filter(p => p != null) || [],
    [message.sources]
  );

  const groupedSources = message.sources?.reduce((acc, s) => {
    if (!acc[s.source]) acc[s.source] = [];
    acc[s.source].push(s);
    return acc;
  }, {}) || {};

  const loadingText = retrievalPhase === 'retrieving'
    ? '正在检索知识库文档...'
    : retrievalPhase === 'generating'
    ? '正在生成回答...'
    : '正在思考...';

  return (
    <>
      <div
        className={`flex items-start gap-2 py-1 ${isUser ? 'justify-end' : 'justify-start'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ---- 用户提问气泡 ---- */}
        {isUser && (
          <div className="bubble-user relative max-w-[75%]">
            {/* 头像 */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-caption font-medium text-brand-500">你</span>
              </div>
            </div>
            {/* 正文 */}
            <div>
              <p className="whitespace-pre-wrap break-words text-[#1D2129]" style={{ lineHeight: '1.6', fontSize: '14px' }}>{message.content}</p>
            </div>
            {/* 悬浮操作栏 */}
            {!isStreaming && isHovered && (
              <div className="bubble-toolbar absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full z-10">
                <button onClick={handleCopy} className="toolbar-btn" title="复制">
                  <Copy size={16} />
                </button>
                <button onClick={handleToggleFav}
                  className={`toolbar-btn ${message.favorite ? 'toolbar-btn-fav-active' : ''}`}
                  title={message.favorite ? '取消收藏' : '收藏'}>
                  <Star size={16} className={message.favorite ? 'fill-yellow-500' : ''} />
                </button>
              </div>
            )}
            {/* hover时在气泡底部外侧显示时间戳 */}
            {isHovered && (
              <span className="bubble-timestamp-hover">{message.timestamp}</span>
            )}
          </div>
        )}

        {/* ---- AI 回答气泡 ---- */}
        {isAssistant && (
          <div className="bubble-ai relative max-w-[75%]">
            {/* 头像 */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageSquare size={15} className="text-text-secondary" />
              </div>
            </div>
            {/* 正文 */}
            <div className="text-text-primary" ref={contentRef}>
              {isStreaming && (!message.content || message.content.length === 0) && (
                <div className="flex items-center gap-1.5 text-text-secondary mb-3">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="text-caption">{loadingText}</span>
                </div>
              )}

              {message.content ? (
                <MarkdownContent
                  content={message.content}
                  shouldCollapse={shouldCollapse}
                  isLong={isLong}
                  isStreaming={isStreaming}
                  sources={message.sources}
                  onOpenSourceDetail={onOpenSourceDetail}
                  hitPagesFromSources={hitPagesFromSources}
                  onToggleExpand={toggleExpand}
                  isExpanded={isExpanded}
                />
              ) : null}

              {/* 检索无结果兜底提示 */}
              {isAssistant && !isStreaming && message.content && Array.isArray(message.sources) && message.sources.length === 0 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-caption text-text-secondary">
                  <SearchX size={14} className="flex-shrink-0" />
                  <span>😅 我在绑定的知识库中没有找到相关资料，你可以试试调整提问关键词，或者补充绑定相关文档哦~</span>
                </div>
              )}
            </div>

            {/* 参考来源折叠面板 */}
            {message.sources && message.sources.length > 0 && !isStreaming && (
              <div className="mt-3 pt-3 border-t border-[#F0F0F0]">
                <button
                  onClick={() => setSourcesExpanded(!sourcesExpanded)}
                  className="source-toggle-btn"
                >
                  <ChevronDown size={14} className={`chevron-icon ${sourcesExpanded ? 'expanded' : ''}`} />
                  <span>
                    {sourcesExpanded ? '收起参考来源' : `展开全部参考来源 (${message.sources.length})`}
                  </span>
                </button>

                {sourcesExpanded && (
                  <div className="mt-2 space-y-2">
                    {Object.entries(groupedSources).map(([docName, sources]) => (
                      <div key={docName}>
                        <div className="flex items-center gap-1 text-caption text-text-primary mb-1">
                          <FileText size={12} className="text-text-secondary" />
                          <span className="truncate">{docName}</span>
                        </div>
                        <div className="ml-4 space-y-0.5">
                          {sources.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => onOpenSourceDetail(s.source, s.page, s.snippet, hitPagesFromSources)}
                              className="block w-full text-left text-caption text-brand-500 hover:text-brand-600 hover:underline transition-colors"
                            >
                              第 {s.page + 1} 页
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 悬浮操作栏 */}
            {!isStreaming && isHovered && (
              <div className="bubble-toolbar absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full z-10">
                <button onClick={handleCopy} className="toolbar-btn" title="复制">
                  <Copy size={16} />
                </button>
                <button onClick={handleRegenerate}
                  className="toolbar-btn" title="重新生成">
                  <RotateCcw size={16} />
                </button>
                <button onClick={handleToggleFav}
                  className={`toolbar-btn ${message.favorite ? 'toolbar-btn-fav-active' : ''}`}
                  title={message.favorite ? '取消收藏' : '收藏'}>
                  <Star size={16} className={message.favorite ? 'fill-yellow-500' : ''} />
                </button>
              </div>
            )}
            {/* hover时在气泡底部外侧显示时间戳 */}
            {isHovered && (
              <span className="bubble-timestamp-hover">{message.timestamp}</span>
            )}
          </div>
        )}
      </div>

      {/* 选中文字追问弹窗 */}
      <SelectionPopup
        position={selectionPopup}
        selectedText={selectionPopup?.text}
        onAsk={handleAskSelection}
        popupRef={popupRef}
      />
    </>
  );
};

/**
 * ChatView - 对话消息列表
 */
const ChatView = ({ messages, messagesEndRef, onRegenerate, onToggleFavorite, onOpenSourceDetail, retrievalPhase, onAskAboutSelection, currentSessionId, onSendEmpty, suggestedQuestions }) => {
  const hasStreamingMessage = messages.some(m => m.isStreaming);
  const isInitialLoading = hasStreamingMessage && messages.filter(m => m.role === 'assistant').length <= 1;

  const QUICK_QUESTIONS = (suggestedQuestions && suggestedQuestions.length > 0)
    ? suggestedQuestions
    : ['知识库能做什么？', '怎么绑定文档？', '如何使用知识问答助手？'];

  return (
    <div className="h-full overflow-y-auto p-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6" key={currentSessionId}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary py-12 animate-fadeIn">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-module text-text-primary mb-2">开始对话</p>
            <p className="text-body text-text-secondary mb-2">在下方输入你的问题，AI 将为你解答</p>
            <p className="text-caption text-text-secondary mb-6">💡 先点击顶部「默认知识库」下拉，选择要绑定的知识库吧</p>
            <div className="flex flex-wrap justify-center gap-3">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => onSendEmpty?.(q)}
                  className="px-4 py-2 text-body bg-surface-white border border-border rounded-element text-text-primary hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-all duration-200 shadow-soft"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : isInitialLoading ? (
          <div className="space-y-6">
            <SkeletonBubble align="right" />
            <SkeletonBubble align="left" />
            <SkeletonBubble align="left" />
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={onRegenerate}
                onToggleFavorite={onToggleFavorite}
                onOpenSourceDetail={onOpenSourceDetail}
                retrievalPhase={retrievalPhase}
                onAskAboutSelection={onAskAboutSelection}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
