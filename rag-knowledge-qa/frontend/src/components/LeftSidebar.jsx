/**
 * LeftSidebar - 左侧侧边栏（240px 固定宽度）
 * 纯白背景，仅用分割线区分层级，无阴影
 * 组成：全局导航菜单 + 会话列表 + 底部版本/统计信息
 */
import React from 'react';
import { X } from 'lucide-react';
import SidebarNav from './SidebarNav';
import SessionList from './SessionList';
import SidebarFooter from './SidebarFooter';

const LeftSidebar = ({
  activeTab,
  onTabChange,
  sidebarOpen,
  onToggleSidebar,
  knowledgeStats,
  systemStatus,
  /* 会话管理 */
  sessions,
  currentSessionId,
  onCreateSession,
  onSwitchSession,
  onRenameSession,
  onDeleteSession,
}) => {
  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-surface-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 border-r border-border ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* 侧边栏头部 */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h1 className="text-title text-text-primary">
            RAG 知识库
          </h1>
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1 rounded-element text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 上半区：全局导航菜单 */}
        <SidebarNav activeTab={activeTab} onTabChange={onTabChange} />

        {/* 下半区：会话列表 */}
        <SessionList
          sessions={sessions}
          currentSessionId={currentSessionId}
          onCreateSession={onCreateSession}
          onSwitchSession={onSwitchSession}
          onRenameSession={onRenameSession}
          onDeleteSession={onDeleteSession}
        />

        {/* 底部：版本号 + 知识库统计 */}
        <SidebarFooter knowledgeStats={knowledgeStats} systemStatus={systemStatus} />
      </div>
    </div>
  );
};

export default LeftSidebar;
