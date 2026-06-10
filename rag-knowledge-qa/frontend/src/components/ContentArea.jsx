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
}) => {
  const chatViewProps = {
    messages, messagesEndRef,
    onRegenerate, onToggleFavorite,
    onOpenSourceDetail, retrievalPhase,
  };

  switch (activeTab) {
    case 'chat':
      return <ChatView {...chatViewProps} />;
    case 'knowledge':
      return <KnowledgeView knowledgeStats={knowledgeStats} isLoadingSystemData={isLoadingSystemData} />;
    case 'system':
      return <SystemView systemStatus={systemStatus} isLoadingSystemData={isLoadingSystemData} />;
    default:
      return <ChatView {...chatViewProps} />;
  }
};

export default ContentArea;
