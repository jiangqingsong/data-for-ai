/**
 * InputBar - 底部输入操作栏
 *
 * 布局：自适应多行输入框 + 蓝色发送按钮
 * 下方：快捷键提示 + 字数统计 + 快捷提问标签组
 */
import React, { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';

const MAX_CHARS = 2000;

const InputBar = ({
  inputMessage,
  onInputChange,
  onSend,
  isLoading,
  suggestedQuestions,
  suggestedQuestionsLoading,
}) => {
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const quickQuestions = (suggestedQuestions && suggestedQuestions.length > 0)
    ? suggestedQuestions
    : [];

  const placeholder = '请输入你的问题...';

  const charCount = inputMessage.length;
  const isOverLimit = charCount > MAX_CHARS;

  /* 自适应高度 */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = 24;
    const minHeight = 40;
    const maxHeight = lineHeight * 6 + 16;
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [inputMessage]);

  /* 发送后自动聚焦 */
  const prevLoadingRef = useRef(isLoading);
  useEffect(() => {
    if (prevLoadingRef.current === true && isLoading === false) {
      textareaRef.current?.focus();
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputMessage.trim() && !isLoading) onSend(e);
    }
  };

  const handleQuickTag = (question) => {
    onInputChange(question);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 0);
  };

  const canSend = inputMessage.trim() && !isLoading && !isOverLimit;

  return (
    <div className="border-t border-border bg-surface-white px-4 pb-3 pt-2">
      <div className="max-w-[740px] mx-auto">

        {/* 输入框 + 发送按钮 */}
        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-element bg-white transition-all duration-200 ${
          isFocused ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border hover:border-gray-300'
        }`}>
          {/* 输入框 */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              rows={1}
              disabled={isLoading}
              style={{ minHeight: '36px', maxHeight: '160px', overflowY: 'hidden' }}
              className="w-full py-1.5 resize-none text-body text-text-primary placeholder:text-text-secondary bg-transparent border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed leading-6"
            />
          </div>

          {/* 发送按钮 */}
          <button
            type="button"
            onClick={(e) => { if (canSend) onSend(e); }}
            disabled={!canSend}
            className="flex-shrink-0 self-end mb-1 inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-brand-500 text-white rounded-element hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-body font-medium min-w-[72px]"
          >
            <span>{isLoading ? '发送中' : '发送'}</span>
            <Send size={16} />
          </button>
        </div>

        {/* 快捷键提示 + 字数统计 */}
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-caption text-text-secondary opacity-50">
            Enter 发送，Shift+Enter 换行
          </span>
          <span className={`text-caption ${
            isOverLimit ? 'text-red-500 font-medium' : 'text-text-secondary opacity-50'
          }`}>
            {charCount}/{MAX_CHARS}字
          </span>
        </div>

        {/* 快捷提问标签组 */}
        {quickQuestions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-2.5">
            <span className="text-caption text-text-secondary flex-shrink-0">快捷提问:</span>
            {suggestedQuestionsLoading ? (
              <span className="text-caption text-text-secondary italic">加载中...</span>
            ) : (
              quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handleQuickTag(question)}
                  className="px-2.5 py-1 text-caption bg-gray-50 text-text-secondary border border-border rounded-full hover:bg-brand-50 hover:text-brand-500 hover:border-brand-200 transition-all cursor-pointer"
                >
                  {question}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InputBar;
