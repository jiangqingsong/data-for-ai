/**
 * InputBar - 中栏底部输入栏
 * 自适应高度输入框、清空按钮、快捷提问标签
 * 迭代5：代码注释完善
 */
import React, { useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, X } from 'lucide-react';

/** 快捷提问模板 */
const QUICK_QUESTIONS = [
  '什么是欧姆定律？',
  '牛顿第一定律是什么？',
  '什么是电路串联和并联？',
];

const InputBar = ({
  inputMessage,
  onInputChange,
  onSend,
  isLoading,
}) => {
  const textareaRef = useRef(null);
  const prevLoadingRef = useRef(isLoading);

  /** 自适应高度：1行 ~ 6行 */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = 22; // 14px font, ~22px line height
    const minHeight = 40;
    const maxHeight = lineHeight * 6 + 16; // 6行 + padding
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [inputMessage]);

  /** 加载完成后自动聚焦输入框 */
  useEffect(() => {
    if (prevLoadingRef.current === true && isLoading === false) {
      textareaRef.current?.focus();
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  };

  /** 清空输入 */
  const handleClear = () => {
    onInputChange('');
    textareaRef.current?.focus();
  };

  /** 点击快捷标签填充输入 */
  const handleQuickTag = (question) => {
    onInputChange(question);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-border p-4 bg-surface-white">
      <form onSubmit={onSend} className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          {/* 左侧：功能按钮区 */}
          <div className="flex items-center gap-1 pb-1">
            <button
              type="button"
              className="p-2 rounded-element text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
              title="附件"
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              className="p-2 rounded-element text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
              title="语音输入"
            >
              <Mic size={18} />
            </button>
          </div>

          {/* 中间：输入框 + 清空按钮 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入你的物理问题..."
              rows={1}
              style={{ minHeight: '40px', maxHeight: '148px', overflowY: 'hidden' }}
              className="w-full p-3 pr-8 border border-border rounded-element focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none transition-all duration-200 text-body text-text-primary placeholder:text-text-secondary"
              disabled={isLoading}
            />
            {/* 清空按钮 */}
            {inputMessage.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-3 p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors"
                title="清空输入"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* 右侧：发送按钮 */}
          <div className="pb-1">
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-element hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-body"
            >
              <span>发送</span>
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* 快捷提示行 */}
        <div className="flex items-center justify-between">
          {/* 快捷提问模板标签区 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-caption text-text-secondary">快捷提问:</span>
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => handleQuickTag(question)}
                className="px-2 py-0.5 text-caption bg-gray-50 text-text-secondary border border-border rounded-element cursor-pointer hover:bg-gray-100 hover:text-text-primary transition-colors"
              >
                {question}
              </button>
            ))}
          </div>

          <span className="text-caption text-text-secondary flex-shrink-0 ml-2">
            Enter 发送，Shift+Enter 换行
          </span>
        </div>
      </form>
    </div>
  );
};

export default InputBar;
