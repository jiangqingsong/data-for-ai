/**
 * KnowledgeView - 知识库管理双栏容器
 * 左栏 KBLeftPanel (260px) + 右栏 KBRightPanel (flex-1)
 */
import React from 'react';
import KBLeftPanel from './KBLeftPanel';
import KBRightPanel from './KBRightPanel';

const KnowledgeView = ({
  knowledgeBases = [],
  selectedKBName,
  selectedKBStats,
  isKBLoading,
  onCreateKB,
  onDeleteKB,
  onSelectKB,
  onUploadDocument,
  onTriggerPipeline,
  onDeleteDocument,
  pipelineRunningKB,
  pipelineStatus,
  onDismissPipelineStatus,
}) => {
  return (
    <div className="flex h-full">
      <KBLeftPanel
        knowledgeBases={knowledgeBases}
        selectedKBName={selectedKBName}
        onSelectKB={onSelectKB}
        onCreateKB={onCreateKB}
        onDeleteKB={onDeleteKB}
        isKBLoading={isKBLoading}
      />
      <KBRightPanel
        selectedKBName={selectedKBName}
        selectedKBStats={selectedKBStats}
        knowledgeBases={knowledgeBases}
        onUploadDocument={onUploadDocument}
        onTriggerPipeline={onTriggerPipeline}
        onDeleteDocument={onDeleteDocument}
        pipelineRunningKB={pipelineRunningKB}
        pipelineStatus={pipelineStatus}
        onDismissPipelineStatus={onDismissPipelineStatus}
      />
    </div>
  );
};

export default KnowledgeView;
