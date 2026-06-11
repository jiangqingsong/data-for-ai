/**
 * MainContent - 中栏主内容区（flex-1）
 * 组成：顶部操作栏 + 内容切换区 + 底部输入栏
 */
import React from 'react';
import TopBar from './TopBar';
import ContentArea from './ContentArea';
import InputBar from './InputBar';

const MainContent = ({
  activeTab,
  showAdvancedSettings, onToggleAdvanced,
  topK, onTopKChange,
  retrievalStrategy, onStrategyChange,
  messages, messagesEndRef,
  inputMessage, onInputChange, onSend,
  knowledgeStats, systemStatus, isLoadingSystemData,
  sessions, currentSessionId,
  onRenameSession, onExportSession, onRefreshContext,
  onRegenerate, onToggleFavorite,
  onOpenSourceDetail,
  retrievalPhase, rightPanelOpen,
  onAskAboutSelection, onSendEmpty,
  suggestedQuestions, suggestedQuestionsLoading,
  /* 迭代5: 知识库管理 */
  knowledgeBases, selectedKBName, selectedKBStats,
  isKBLoading, onCreateKB, onDeleteKB,
  onSelectKB, onUploadDocument, onTriggerPipeline,
  /* 问答知识库选择 */
  selectedChatKB, onChatKBChange,
}) => {
  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <TopBar
        activeTab={activeTab}
        showAdvancedSettings={showAdvancedSettings}
        onToggleAdvanced={onToggleAdvanced}
        topK={topK}
        onTopKChange={onTopKChange}
        retrievalStrategy={retrievalStrategy}
        onStrategyChange={onStrategyChange}
        currentSession={currentSession}
        onRenameSession={onRenameSession}
        onExportSession={onExportSession}
        onRefreshContext={onRefreshContext}
        /* 问答知识库选择 */
        selectedChatKB={selectedChatKB}
        onChatKBChange={onChatKBChange}
        knowledgeBases={knowledgeBases}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ContentArea
          activeTab={activeTab}
          messages={messages}
          messagesEndRef={messagesEndRef}
          knowledgeStats={knowledgeStats}
          systemStatus={systemStatus}
          isLoadingSystemData={isLoadingSystemData}
          onRegenerate={onRegenerate}
          onToggleFavorite={onToggleFavorite}
          onOpenSourceDetail={onOpenSourceDetail}
          retrievalPhase={retrievalPhase}
          onAskAboutSelection={onAskAboutSelection}
          currentSessionId={currentSessionId}
          onSendEmpty={onSendEmpty}
          suggestedQuestions={suggestedQuestions}
          /* 迭代5: 知识库管理 */
          knowledgeBases={knowledgeBases}
          selectedKBName={selectedKBName}
          selectedKBStats={selectedKBStats}
          isKBLoading={isKBLoading}
          onCreateKB={onCreateKB}
          onDeleteKB={onDeleteKB}
          onSelectKB={onSelectKB}
          onUploadDocument={onUploadDocument}
          onTriggerPipeline={onTriggerPipeline}
        />
      </div>

      {activeTab === 'chat' && (
        <InputBar
          inputMessage={inputMessage}
          onInputChange={onInputChange}
          onSend={onSend}
          isLoading={messages.some(m => m.isStreaming)}
          suggestedQuestions={suggestedQuestions}
          suggestedQuestionsLoading={suggestedQuestionsLoading}
        />
      )}
    </div>
  );
};

export default MainContent;
