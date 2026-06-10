/**
 * ThreeColumnLayout - 三栏布局外壳
 * 左栏 240px | 中栏 flex-1 | 右栏 380px（溯源面板，按需显示）
 */
import React from 'react';
import LeftSidebar from './LeftSidebar';
import MainContent from './MainContent';
import RightPanel from './RightPanel';
import { downloadPDF } from '../utils';

const ThreeColumnLayout = ({
  activeTab, onTabChange,
  sidebarOpen, onToggleSidebar,
  knowledgeStats, systemStatus,
  showAdvancedSettings, onToggleAdvanced,
  topK, onTopKChange,
  retrievalStrategy, onStrategyChange,
  messages, isLoading, messagesEndRef,
  inputMessage, onInputChange, onSend,
  isLoadingSystemData,
  sessions, currentSessionId,
  onCreateSession, onSwitchSession,
  onRenameSession, onDeleteSession,
  onExportSession, onRefreshContext,
  onRegenerate, onToggleFavorite,
  /* 迭代4: 溯源面板 */
  rightPanelOpen, selectedSourceData,
  onOpenSourceDetail, onCloseRightPanel,
  documents, onUnbindDocument,
  retrievalPhase,
}) => {
  return (
    <div className="flex h-screen bg-surface-page">
      {/* 左栏：侧边栏 240px */}
      <LeftSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        knowledgeStats={knowledgeStats}
        systemStatus={systemStatus}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onCreateSession={onCreateSession}
        onSwitchSession={onSwitchSession}
        onRenameSession={onRenameSession}
        onDeleteSession={onDeleteSession}
      />

      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={onToggleSidebar}
        />
      )}

      {/* 中栏：主内容区 flex-1 */}
      <MainContent
        activeTab={activeTab}
        showAdvancedSettings={showAdvancedSettings}
        onToggleAdvanced={onToggleAdvanced}
        topK={topK}
        onTopKChange={onTopKChange}
        retrievalStrategy={retrievalStrategy}
        onStrategyChange={onStrategyChange}
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        inputMessage={inputMessage}
        onInputChange={onInputChange}
        onSend={onSend}
        knowledgeStats={knowledgeStats}
        systemStatus={systemStatus}
        isLoadingSystemData={isLoadingSystemData}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onRenameSession={onRenameSession}
        onExportSession={onExportSession}
        onRefreshContext={onRefreshContext}
        onRegenerate={onRegenerate}
        onToggleFavorite={onToggleFavorite}
        documents={documents}
        onOpenSourceDetail={onOpenSourceDetail}
        onUnbindDocument={onUnbindDocument}
        retrievalPhase={retrievalPhase}
        rightPanelOpen={rightPanelOpen}
      />

      {/* 右栏：溯源面板 380px，按需显示 */}
      <RightPanel
        isOpen={rightPanelOpen}
        sourceData={selectedSourceData}
        onClose={onCloseRightPanel}
        onOpenFullDocument={downloadPDF}
      />
    </div>
  );
};

export default ThreeColumnLayout;
