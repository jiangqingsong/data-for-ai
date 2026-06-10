/**
 * ChatView - 对话消息展示区
 *
 * 功能：消息气泡、引用标签解析、参考来源折叠面板、检索状态区分
 * 迭代5：集成 Toast、工具函数、骨架屏加载、ref tag 边界校验
 */
import React, { useState } from 'react';
import { MessageSquare, Loader2, Download, Copy, RotateCcw, Star, ChevronDown, ChevronUp, FileText, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { copyToClipboard } from '../utils';
import { useToast } from './Toast';

/** 折叠阈值 */
const COLLAPSE_THRESHOLD = 500;
const COLLAPSE_PREVIEW_LENGTH = 150;

/** 引用标签正则: (参考资料N 第M页) */
const REF_TAG_REGEX = /\(参考资料(\d+)\s*第(\d+)页\)/g;

/**
 * 将引用标签转为 markdown 链接
 * (参考资料1 第25页) → [参考资料1 第25页](#ref-1-25)
 */
const convertRefTagsToMarkdownLinks = (content) => {
  return content.replace(REF_TAG_REGEX, (match, refNum, pageNum) => {
    return `[参考资料${refNum} 第${pageNum}页](#ref-${refNum}-${pageNum})`;
  });
};

/** 骨架屏消息占位 */
const SkeletonBubble = ({ align }) => (
  <div className={`flex items-start gap-2 py-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
    <div className={`flex items-start gap-3 px-4 py-3 rounded-bubble animate-pulse ${
      align === 'right'
        ? 'bg-brand-100 max-w-[40%]'
        : 'bg-gray-100 max-w-[70%]'
    }`}>
      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-[200px]">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  </div>
);

/**
 * PDFLink - PDF 下载链接
 */
const PDFLink = ({ source, page }) => {
  const handleDownload = (e) => {
    e.preventDefault();
    try {
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = '/api/download-pdf';
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'filename';
      input.value = source;
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (error) {
      console.error('下载PDF失败:', error);
    }
  };

  return (
    <button onClick={handleDownload}
      className="flex items-center gap-1 text-brand-500 hover:text-brand-600 hover:underline text-caption transition-colors"
      title="点击下载PDF文件">
      <span>{source}</span>
      {page != null && <span className="text-text-secondary">(第{page + 1}页)</span>}
      <Download size={12} className="opacity-70" />
    </button>
  );
};

/**
 * MessageBubble - 单条消息气泡
 */
const MessageBubble = ({ message, onRegenerate, onToggleFavorite, onOpenSourceDetail, retrievalPhase }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const { showToast } = useToast();

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isStreaming = message.isStreaming;
  const isLong = isAssistant && !isStreaming && message.content.length > COLLAPSE_THRESHOLD;
  const shouldCollapse = isLong && !isExpanded;

  const displayContent = shouldCollapse
    ? message.content.slice(0, COLLAPSE_PREVIEW_LENGTH) + '...'
    : message.content;

  /** 复制消息内容 */
  const handleCopy = async (e) => {
    e.stopPropagation();
    const ok = await copyToClipboard(message.content);
    showToast(ok ? '已复制到剪贴板' : '复制失败', ok ? 'success' : 'error');
  };

  /** 重新生成 */
  const handleRegenerate = (e) => { e.stopPropagation(); onRegenerate(); };

  /** 切换收藏 */
  const handleToggleFav = (e) => {
    e.stopPropagation();
    onToggleFavorite(message.id);
    showToast(message.favorite ? '已取消收藏' : '已收藏', 'success');
  };

  /** 处理引用标签点击 — 含边界校验 */
  const handleRefTagClick = (refNum) => {
    // 校验 refNum 合法性
    if (isNaN(refNum) || refNum < 1) return;
    const sources = message.sources;
    if (!sources || refNum > sources.length) return;
    const source = sources[refNum - 1];
    if (!source || source.page == null) return;
    onOpenSourceDetail(source.source, source.page, source.snippet);
  };

  /** 分组来源 */
  const groupedSources = message.sources?.reduce((acc, s) => {
    if (!acc[s.source]) acc[s.source] = [];
    acc[s.source].push(s);
    return acc;
  }, {}) || {};

  /** 加载状态文案 */
  const loadingText = retrievalPhase === 'retrieving'
    ? '正在检索知识库文档...'
    : retrievalPhase === 'generating'
    ? '正在生成回答...'
    : '正在思考...';

  return (
    <div
      className={`flex items-start gap-2 py-1 ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative flex items-start gap-3 px-4 py-3 ${
          isUser
            ? 'bg-brand-500 text-white rounded-bubble shadow-soft'
            : 'bg-surface-white text-text-primary border border-border rounded-bubble shadow-soft'
        } max-w-[75%]`}
      >
        {/* 头像 */}
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white">
              <span className="text-caption font-medium">你</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-text-secondary">
              <MessageSquare size={16} />
            </div>
          )}
        </div>

        {/* 消息内容 */}
        <div className="flex-1 min-w-0">
          {isAssistant ? (
            <div className="prose prose-sm max-w-none">
              {/* 思考过程区域 — 流式时默认展开，完成后自动折叠但保留内容 */}
              {message.content && message.content.length > 0 && (
                <details className="group mb-3" open={isStreaming}>
                  <summary className="flex items-center gap-1.5 text-caption text-text-secondary hover:text-text-primary cursor-pointer transition-colors list-none">
                    <Brain size={14} className="text-brand-500" />
                    <span>{isStreaming ? '思考中...' : '思考过程'}</span>
                    {isStreaming && <Loader2 size={12} className="animate-spin" />}
                    <ChevronDown size={12} className="group-open:rotate-180 transition-transform ml-auto" />
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-element border border-border text-caption text-text-secondary whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
                    {message.content}
                  </div>
                </details>
              )}

              {/* 无内容时的加载指示器 */}
              {isStreaming && (!message.content || message.content.length === 0) && (
                <div className="flex items-center gap-1.5 text-text-secondary mb-3">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="text-caption">{loadingText}</span>
                </div>
              )}

              {/* 最终答案 — 流式时实时流式渲染，完成后渲染完整 Markdown */}
              {message.content ? (
                <>
                  <ReactMarkdown
                    children={convertRefTagsToMarkdownLinks(displayContent)}
                    components={{
                    p: ({ children }) => (
                      <p className="whitespace-pre-wrap break-words text-text-primary" style={{ lineHeight: '1.7' }}>{children}</p>
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
                        const sources = message.sources;
                        if (!sources || refNum > sources.length) return <span className="text-text-secondary">{children}</span>;
                        const source = sources[refNum - 1];
                        if (!source || source.page == null) return <span className="text-text-secondary">{children}</span>;
                        return (
                          <span
                            className="inline text-brand-500 cursor-pointer hover:text-brand-600 hover:underline font-medium transition-colors"
                            onClick={() => onOpenSourceDetail(source.source, source.page, source.snippet)}
                            title={`${source.source} 第${source.page + 1}页`}
                          >
                            {children}
                          </span>
                        );
                      }
                      return <a href={href} className="text-brand-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
                    },
                  }}
                />

                {/* 折叠/展开 */}
                {isLong && !isStreaming && (
                  <button onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 text-caption text-brand-500 hover:text-brand-600 hover:underline transition-colors">
                    {isExpanded ? '收起' : `展开 (${message.content.length} 字)`}
                  </button>
                )}
              </>
            ) : null}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-white">
              <p className="whitespace-pre-wrap break-words" style={{ lineHeight: '1.7' }}>{message.content}</p>
            </div>
          )}

          {/* 参考来源折叠面板 */}
          {message.sources && message.sources.length > 0 && !isStreaming && (
            <div className="mt-3 pt-2 border-t border-border">
              <button
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="flex items-center gap-1 text-caption text-text-secondary hover:text-brand-500 transition-colors"
              >
                {sourcesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
                            onClick={() => onOpenSourceDetail(s.source, s.page, s.snippet)}
                            className="block w-full text-left text-caption text-brand-500 hover:text-brand-600 hover:underline transition-colors"
                          >
                            第 {s.page + 1} 页
                            {s.snippet && (
                              <span className="text-text-secondary ml-1">— {s.snippet.slice(0, 60)}{s.snippet.length > 60 ? '...' : ''}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 时间戳 + 收藏标记 */}
          <div className="flex items-center gap-2 text-caption mt-1 opacity-70">
            <span>{message.timestamp}</span>
            {message.favorite && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
          </div>
        </div>

        {/* Hover 悬浮操作栏 */}
        {!isStreaming && isHovered && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full flex flex-col gap-0.5 bg-white border border-border rounded-element shadow-soft p-1 z-10">
            <button onClick={handleCopy}
              className="p-1.5 rounded text-text-secondary hover:text-brand-500 hover:bg-brand-50 transition-colors"
              title="复制">
              <Copy size={14} />
            </button>
            {isAssistant && (
              <button onClick={handleRegenerate}
                className="p-1.5 rounded text-text-secondary hover:text-brand-500 hover:bg-brand-50 transition-colors"
                title="重新生成">
                <RotateCcw size={14} />
              </button>
            )}
            <button onClick={handleToggleFav}
              className={`p-1.5 rounded transition-colors ${
                message.favorite
                  ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                  : 'text-text-secondary hover:text-yellow-500 hover:bg-yellow-50'
              }`}
              title={message.favorite ? '取消收藏' : '收藏'}>
              <Star size={14} className={message.favorite ? 'fill-yellow-500' : ''} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ChatView - 对话消息列表
 *
 * @param {Array} messages - 消息列表
 * @param {React.Ref} messagesEndRef - 滚动锚点
 * @param {Function} onRegenerate - 重新生成回调
 * @param {Function} onToggleFavorite - 切换收藏回调
 * @param {Function} onOpenSourceDetail - 打开溯源面板回调
 * @param {string|null} retrievalPhase - 检索阶段: 'retrieving' | 'generating' | null
 */
const ChatView = ({ messages, messagesEndRef, onRegenerate, onToggleFavorite, onOpenSourceDetail, retrievalPhase }) => {
  const hasStreamingMessage = messages.some(m => m.isStreaming);
  const isInitialLoading = hasStreamingMessage && messages.filter(m => m.role === 'assistant').length <= 1;

  return (
    <div className="h-full overflow-y-auto p-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 ? (
          /* 空对话引导区 */
          <div className="flex flex-col items-center justify-center h-full text-text-secondary py-12">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-module text-text-primary mb-2">开始对话</p>
            <p className="text-body text-text-secondary">在下方输入你的物理问题，AI 将为你解答</p>
          </div>
        ) : isInitialLoading ? (
          /* 骨架屏加载 */
          <div className="space-y-6">
            <SkeletonBubble align="right" />
            <SkeletonBubble align="left" />
            <SkeletonBubble align="left" />
          </div>
        ) : (
          /* 对话气泡列表 */
          <div className="space-y-6">
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={onRegenerate}
                onToggleFavorite={onToggleFavorite}
                onOpenSourceDetail={onOpenSourceDetail}
                retrievalPhase={retrievalPhase}
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
