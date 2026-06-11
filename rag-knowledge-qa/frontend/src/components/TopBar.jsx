/**
 * TopBar - 中栏顶部操作栏
 * 会话标题可点击编辑 | 知识库选择器 | 导出/刷新/高级设置
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Download, Settings, Database } from 'lucide-react';
import { useToast } from './Toast';

const TopBar = ({
  activeTab, showAdvancedSettings, onToggleAdvanced,
  topK, onTopKChange, retrievalStrategy, onStrategyChange,
  currentSession, onRenameSession, onExportSession, onRefreshContext,
  /* 问答知识库选择 */
  selectedChatKB, onChatKBChange, knowledgeBases = [],
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const { showToast } = useToast();

  const tabTitles = { chat: '问答对话', knowledge: '知识库管理', system: '系统信息' };
  const displayTitle = activeTab === 'chat' && currentSession
    ? currentSession.title : tabTitles[activeTab] || '问答对话';

  const startTitleEdit = () => {
    if (activeTab !== 'chat' || !currentSession) return;
    setEditTitle(currentSession.title);
    setIsEditingTitle(true);
  };

  const submitTitleEdit = () => {
    if (editTitle.trim() && currentSession) {
      onRenameSession(currentSession.id, editTitle.trim());
    }
    setIsEditingTitle(false);
    setEditTitle('');
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitTitleEdit(); }
    else if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitle(''); }
  };

  const handleExport = () => {
    onExportSession();
    showToast('对话已导出', 'success');
  };

  return (
    <div className="border-b border-border bg-surface-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* 左侧：会话标题 + 知识库选择器 */}
        <div className="flex items-center gap-3 min-w-0">
          {isEditingTitle ? (
            <input type="text" value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={submitTitleEdit} onKeyDown={handleTitleKeyDown}
              className="text-module text-text-primary bg-white border border-brand-500 rounded-element px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[120px]"
              autoFocus />
          ) : (
            <h2
              className={`text-module text-text-primary truncate ${
                activeTab === 'chat' && currentSession
                  ? 'cursor-pointer hover:text-brand-500 border-b border-dashed border-transparent hover:border-brand-300 transition-colors' : ''
              }`}
              onClick={startTitleEdit}
              title={activeTab === 'chat' ? '点击编辑会话名称' : ''}>
              {displayTitle}
            </h2>
          )}

          {/* 知识库选择器 — 仅在聊天页面显示 */}
          {activeTab === 'chat' && (
            <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-border">
              <Database size={14} className="text-text-secondary" />
              <select
                value={selectedChatKB || ''}
                onChange={(e) => onChatKBChange(e.target.value)}
                className="text-caption text-text-primary bg-gray-50 border border-border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer max-w-[140px]"
              >
                <option value="">默认知识库</option>
                {knowledgeBases.map(kb => (
                  <option key={kb.name} value={kb.name}>{kb.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 右侧：功能按钮区 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleExport}
            className="p-1.5 rounded-element text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
            title="导出对话">
            <Download size={16} />
          </button>
          <button onClick={onRefreshContext}
            className="p-1.5 rounded-element text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
            title="刷新上下文">
            <RefreshCw size={16} />
          </button>
          <button onClick={onToggleAdvanced}
            className="flex items-center gap-1 px-2 py-1 text-body text-text-secondary hover:text-text-primary hover:bg-gray-50 rounded-element transition-colors"
            title="高级设置">
            <Settings size={16} />
            <span>高级设置</span>
            {showAdvancedSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 高级设置面板 */}
      {showAdvancedSettings && (
        <div className="px-6 pb-4">
          <div className="p-4 bg-gray-50 rounded-element border border-border animate-fadeIn">
            <div className="space-y-4">
              <div>
                <label className="block text-body text-text-primary mb-2">检索数量 (Top-K)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="10" value={topK}
                    onChange={(e) => onTopKChange(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-element appearance-none cursor-pointer accent-brand-500" />
                  <span className="text-body text-text-primary w-8 text-center">{topK}</span>
                </div>
              </div>
              <div>
                <label className="block text-body text-text-primary mb-2">检索策略</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="retrievalStrategy" value="similarity"
                      checked={retrievalStrategy === 'similarity'}
                      onChange={(e) => onStrategyChange(e.target.value)}
                      className="text-brand-500 accent-brand-500" />
                    <span className="text-body text-text-primary">Similarity</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="retrievalStrategy" value="mmr"
                      checked={retrievalStrategy === 'mmr'}
                      onChange={(e) => onStrategyChange(e.target.value)}
                      className="text-brand-500 accent-brand-500" />
                    <span className="text-body text-text-primary">MMR</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;
