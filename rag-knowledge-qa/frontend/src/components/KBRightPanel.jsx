/**
 * KBRightPanel - 知识库右侧详情面板（flex-1）
 *
 * Pipeline 进度由 App 层全局管理，跨 tab 切换不丢失。
 * 本组件只负责展示和触发。
 */
import React, { useState, useCallback } from 'react';
import KBHeader from './KBHeader';
import KBStatsCards from './KBStatsCards';
import KBSearchBar from './KBSearchBar';
import KBTabList from './KBTabList';
import KBEmptyStates from './KBEmptyStates';
import { useToast } from './Toast';
import { CheckCircle, XCircle, Loader, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';
import apiClient from '../ApiClient.jsx';

const STEP_LABELS = {
  starting: '启动中',
  loading: '加载文档',
  cleaning: '文本清洗',
  splitting: '文档分块',
  embedding: '向量化',
  done: '完成',
  error: '失败',
};

/** Pipeline 详情卡片（在 KBRightPanel 中显示） */
const PipelineDetailCard = ({ status, kbName, onDismiss }) => {
  const [showDetail, setShowDetail] = useState(false);
  const [logs, setLogs] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  if (!status) return null;

  const isRunning = status.is_running;
  const isDone = status.step === 'done';
  const isError = status.step === 'error';
  const stepLabel = STEP_LABELS[status.step] || status.step || '未知';
  const progressPct = status.progress_pct ?? 0;

  const handleFetchLogs = async () => {
    setLogsLoading(true);
    try {
      const result = await apiClient.getPipelineLogs(kbName);
      setLogs(result);
      setShowLogs(true);
    } catch {
      setLogs({ logs: ['获取日志失败'] });
      setShowLogs(true);
    } finally {
      setLogsLoading(false);
    }
  };

  const colorScheme = isError
    ? { bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500', barBg: 'bg-red-100', text: 'text-red-700', subText: 'text-red-500' }
    : isDone
      ? { bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500', barBg: 'bg-green-100', text: 'text-green-700', subText: 'text-green-500' }
      : { bg: 'bg-brand-50', border: 'border-brand-200', bar: 'bg-brand-500', barBg: 'bg-brand-100', text: 'text-brand-700', subText: 'text-brand-500' };

  return (
    <div className={`p-4 rounded-lg border ${colorScheme.bg} ${colorScheme.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isRunning && <Loader size={16} className="animate-spin text-brand-500" />}
          {isDone && <CheckCircle size={16} className="text-green-500" />}
          {isError && <XCircle size={16} className="text-red-500" />}
          <span className={`text-caption font-semibold ${colorScheme.text}`}>
            {isRunning ? `${stepLabel}...` : stepLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && <span className={`text-caption font-mono ${colorScheme.subText}`}>{progressPct}%</span>}
          {(isError || isDone) && (
            <button onClick={onDismiss} className="p-0.5 rounded hover:bg-black/5 transition-colors">
              <X size={14} className={colorScheme.subText} />
            </button>
          )}
        </div>
      </div>

      {isRunning && (
        <div className={`w-full h-2 rounded-full overflow-hidden ${colorScheme.barBg}`}>
          <div className={`h-full rounded-full transition-all duration-700 ease-out ${colorScheme.bar}`}
            style={{ width: `${Math.max(progressPct, 2)}%` }} />
        </div>
      )}

      <p className={`text-caption mt-2 ${isError ? 'text-red-600' : isDone ? 'text-green-600' : 'text-brand-600'}`}>
        {status.message || ''}
      </p>

      {isError && status.error_detail && (
        <div className="mt-2">
          <button onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1 text-caption text-red-500 hover:text-red-600">
            {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            错误详情
          </button>
          {showDetail && (
            <pre className="mt-2 p-3 bg-red-100 rounded-md text-xs text-red-800 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {status.error_detail}
            </pre>
          )}
        </div>
      )}

      {(isError || isDone) && (
        <div className="mt-2">
          <button onClick={handleFetchLogs} disabled={logsLoading}
            className="flex items-center gap-1 text-caption text-text-secondary hover:text-text-primary transition-colors">
            <FileText size={14} />
            {logsLoading ? '加载中...' : showLogs ? '刷新日志' : '查看运行日志'}
          </button>
          {showLogs && logs && (
            <pre className="mt-2 p-3 bg-gray-100 rounded-md text-xs text-gray-700 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
              {logs.logs?.join('\n') || '暂无日志'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

const KBRightPanel = ({
  selectedKBName,
  selectedKBStats,
  knowledgeBases,
  onUploadDocument,
  onTriggerPipeline,
  onDeleteDocument,
  /* 全局 Pipeline 状态 */
  pipelineRunningKB,
  pipelineStatus,
  onDismissPipelineStatus,
}) => {
  const { showToast } = useToast();

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
    const result = await onTriggerPipeline(name);
    if (!result) {
      showToast('Pipeline 启动失败', 'error');
    }
  };

  const isThisKB = pipelineRunningKB === selectedKBName;
  const showPipelineCard = isThisKB && pipelineStatus;

  const documents = selectedKBStats?.documents || [];
  const chunks = selectedKBStats?.chunks || [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        <KBHeader
          kbName={selectedKBName}
          stats={selectedKBStats}
          onUpload={handleUpload}
          onTriggerPipeline={handleTriggerPipeline}
          isPipelineRunning={isThisKB && pipelineStatus?.is_running}
        />

        {/* Pipeline 详情卡片 — 使用全局状态 */}
        {showPipelineCard && (
          <PipelineDetailCard
            status={pipelineStatus}
            kbName={selectedKBName}
            onDismiss={onDismissPipelineStatus}
          />
        )}

        <KBStatsCards stats={selectedKBStats} />
        <KBSearchBar />
        <KBTabList chunks={chunks} documents={documents} kbName={selectedKBName} onDeleteDocument={onDeleteDocument} />
      </div>
    </div>
  );
};

export default KBRightPanel;
