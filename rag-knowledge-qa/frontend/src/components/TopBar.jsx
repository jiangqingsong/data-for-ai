/**
 * TopBar - 中栏顶部操作栏
 * 会话标题可点击编辑 | 知识库选择器 | 按 Tab 差异化的操作按钮
 */
import React, { useState } from 'react';
import { RefreshCw, Download, Database, Loader } from 'lucide-react';
import { useToast } from './Toast';

const TopBar = ({
  activeTab,
  currentSession, onRenameSession, onExportSession, onRefreshContext,
  /* 问答知识库选择 */
  selectedChatKB, onChatKBChange, knowledgeBases = [],
  /* Pipeline 全局状态 */
  pipelineRunningKB, pipelineStatus,
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
      {/* Pipeline 全局进度条 — 跨所有 tab 可见 */}
      {pipelineStatus && (
        <div className={`px-6 py-2 text-caption font-medium flex items-center gap-2 ${
          pipelineStatus.step === 'error' ? 'bg-red-50 text-red-700' :
          pipelineStatus.step === 'done' ? 'bg-green-50 text-green-700' :
          'bg-brand-50 text-brand-700'
        }`}>
          {pipelineStatus.step !== 'error' && pipelineStatus.step !== 'done' && (
            <Loader size={14} className="animate-spin" />
          )}
          <span className="flex-1">
            {pipelineStatus.step === 'error' ? '❌' : pipelineStatus.step === 'done' ? '✅' : ''}
            {' '}知识库「{pipelineRunningKB}」: {pipelineStatus.message}
          </span>
          {pipelineStatus.step !== 'error' && pipelineStatus.step !== 'done' && (
            <span className="text-xs">{pipelineStatus.progress_pct}%</span>
          )}
        </div>
      )}

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
              <Database size={14} className="text-text-secondary flex-shrink-0" />
              <select
                value={selectedChatKB || ''}
                onChange={(e) => onChatKBChange(e.target.value)}
                className="text-caption text-text-primary bg-gray-50 border border-border rounded-element px-2.5 py-1.5 outline-none
                  hover:border-gray-300 hover:bg-gray-100
                  focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white
                  cursor-pointer min-w-[120px] max-w-[180px]
                  transition-colors duration-200"
              >
                <option value="">默认知识库</option>
                {knowledgeBases.map(kb => (
                  <option key={kb.name} value={kb.name}>{kb.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 右侧：功能按钮区 — 按 Tab 差异化 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {activeTab === 'chat' && (
            <>
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
            </>
          )}
          {activeTab === 'system' && (
            <button onClick={onRefreshContext}
              className="p-1.5 rounded-element text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
              title="刷新">
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
