/**
 * ContentArea - 中栏内容切换区
 * 根据 activeTab 切换显示 ChatView / KnowledgeView / SystemView
 */
import React from 'react';
import ChatView from './ChatView';
import KnowledgeView from './KnowledgeView';
import SystemView from './SystemView';

const ContentArea = ({
  activeTab,
  messages, messagesEndRef,
  knowledgeStats, systemStatus, isLoadingSystemData,
  onRegenerate, onToggleFavorite,
  onOpenSourceDetail, retrievalPhase,
  onAskAboutSelection, currentSessionId, onSendEmpty,
  suggestedQuestions,
  /* 迭代5: 知识库管理 */
  knowledgeBases, selectedKBName, selectedKBStats,
  isKBLoading, onCreateKB, onDeleteKB,
  onSelectKB, onUploadDocument, onTriggerPipeline,
}) => {
  const chatViewProps = {
    messages, messagesEndRef,
    onRegenerate, onToggleFavorite,
    onOpenSourceDetail, retrievalPhase,
    onAskAboutSelection, currentSessionId, onSendEmpty,
    suggestedQuestions,
  };

  switch (activeTab) {
    case 'chat':
      return <ChatView {...chatViewProps} />;
    case 'knowledge':
      return <KnowledgeView
        knowledgeBases={knowledgeBases}
        selectedKBName={selectedKBName}
        selectedKBStats={selectedKBStats}
        isKBLoading={isKBLoading}
        onCreateKB={onCreateKB}
        onDeleteKB={onDeleteKB}
        onSelectKB={onSelectKB}
        onUploadDocument={onUploadDocument}
        onTriggerPipeline={onTriggerPipeline}
      />;
    case 'system':
      return <SystemView systemStatus={systemStatus} isLoadingSystemData={isLoadingSystemData} />;
    default:
      return <ChatView {...chatViewProps} />;
  }
};

export default ContentArea;
