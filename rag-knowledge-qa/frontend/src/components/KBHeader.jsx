/**
 * KBHeader - 知识库头部（名称、标签、操作按钮）
 */
import React, { useRef } from 'react';
import { Upload, Play } from 'lucide-react';

const KBHeader = ({ kbName, stats, onUpload, onTriggerPipeline, isPipelineRunning }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUpload(kbName, file);
    e.target.value = '';
  };

  const docCount = stats?.doc_count ?? 0;
  const createdAt = stats?.created_at
    ? new Date(stats.created_at).toLocaleDateString('zh-CN')
    : '';

  return (
    <div className="pb-4 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-title text-text-primary font-semibold">{kbName}</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-caption text-brand-500 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
          >
            <Upload size={14} />
            上传 PDF
          </button>
          <button
            onClick={() => onTriggerPipeline(kbName)}
            disabled={isPipelineRunning || docCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-caption text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={14} />
            {isPipelineRunning ? '处理中...' : '运行 Pipeline'}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 text-caption text-text-secondary">
        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-md text-text-secondary">
          物理
        </span>
        {createdAt && <span>创建于 {createdAt}</span>}
        <span>{docCount} 个文档</span>
      </div>
    </div>
  );
};

export default KBHeader;
