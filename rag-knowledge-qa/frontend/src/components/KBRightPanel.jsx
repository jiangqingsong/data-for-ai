/**
 * KBRightPanel - 知识库右侧详情面板（flex-1）
 * 编排 Module 1-5 + Pipeline 进度条
 */
import React, { useState, useEffect, useRef } from 'react';
import KBHeader from './KBHeader';
import KBStatsCards from './KBStatsCards';
import KBSearchBar from './KBSearchBar';
import KBTabList from './KBTabList';
import KBEmptyStates from './KBEmptyStates';
import { useToast } from './Toast';
import apiClient from '../ApiClient.jsx';

const STEP_LABELS = {
  starting: '启动中',
  loading: '加载 PDF',
  cleaning: '文本清洗',
  splitting: '文档分块',
  embedding: '向量化',
  done: '完成',
  error: '失败',
};

const KBRightPanel = ({
  selectedKBName,
  selectedKBStats,
  knowledgeBases,
  onUploadDocument,
  onTriggerPipeline,
}) => {
  const { showToast } = useToast();
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const pollTimerRef = useRef(null);

  // 轮询 Pipeline 状态
  useEffect(() => {
    if (isPipelineRunning && selectedKBName) {
      const poll = async () => {
        const status = await apiClient.getPipelineStatus(selectedKBName);
        if (status) {
          setPipelineStatus(status);
          if (!status.is_running) {
            setIsPipelineRunning(false);
            if (status.step === 'done') {
              showToast(status.message || 'Pipeline 执行完成', 'success');
            } else if (status.step === 'error') {
              showToast(status.message || 'Pipeline 执行失败', 'error');
            }
          }
        }
      };
      poll();
      pollTimerRef.current = setInterval(poll, 2000);
      return () => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }
  }, [isPipelineRunning, selectedKBName]);

  if (!selectedKBName) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <KBEmptyStates type={knowledgeBases.length === 0 ? 'noKBs' : 'noSelection'} />
      </div>
    );
  }

  const handleUpload = async (name, file) => {
    const result = await onUploadDocument(name, file);
    if (result) {
      showToast(`「${file.name}」上传成功`, 'success');
    } else {
      showToast('上传失败，请稍后重试', 'error');
    }
  };

  const handleTriggerPipeline = async (name) => {
    setIsPipelineRunning(true);
    setPipelineStatus({ step: 'starting', message: '正在启动 Pipeline...', progress_pct: 0 });
    const result = await onTriggerPipeline(name);
    if (!result) {
      setIsPipelineRunning(false);
      setPipelineStatus({ step: 'error', message: '启动 Pipeline 失败', progress_pct: 0 });
      showToast('Pipeline 启动失败', 'error');
    }
  };

  const documents = selectedKBStats?.documents || [];
  const chunks = selectedKBStats?.chunks || [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        {/* Module 1: 头部 */}
        <KBHeader
          kbName={selectedKBName}
          stats={selectedKBStats}
          onUpload={handleUpload}
          onTriggerPipeline={handleTriggerPipeline}
          isPipelineRunning={isPipelineRunning}
        />

        {/* Pipeline 进度条 */}
        {pipelineStatus && (
          <div className="p-4 bg-brand-50 rounded-lg border border-brand-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption font-medium text-brand-700">
                {STEP_LABELS[pipelineStatus.step] || pipelineStatus.step}
              </span>
              <span className="text-caption text-brand-500">
                {pipelineStatus.progress_pct}%
              </span>
            </div>
            <div className="w-full h-2 bg-brand-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pipelineStatus.progress_pct}%` }}
              />
            </div>
            <p className="text-caption text-brand-600 mt-2">{pipelineStatus.message}</p>
          </div>
        )}

        {/* Module 2: 统计卡片 */}
        <KBStatsCards stats={selectedKBStats} />

        {/* Module 3: 搜索栏 */}
        <KBSearchBar />

        {/* Module 4: 标签页列表 */}
        <KBTabList chunks={chunks} documents={documents} />
      </div>
    </div>
  );
};

export default KBRightPanel;
