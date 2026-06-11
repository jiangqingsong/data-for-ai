/**
 * KBChunkCard - 知识块卡片
 */
import React from 'react';
import { FileText } from 'lucide-react';

const STATUS_MAP = {
  completed: { label: '已完成', className: 'bg-green-50 text-green-600' },
  processing: { label: '处理中', className: 'bg-orange-50 text-orange-500' },
  error: { label: '失败', className: 'bg-red-50 text-red-500' },
};

const KBChunkCard = ({ chunk }) => {
  const sourceDoc = chunk?.metadata?.source || chunk?.source || '未知文档';
  const content = chunk?.content || chunk?.text || '';
  const status = chunk?.status || 'completed';
  const statusConfig = STATUS_MAP[status] || STATUS_MAP.completed;

  return (
    <div className="p-3 bg-white rounded-lg border border-border hover:border-brand-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-body text-text-primary line-clamp-2 flex-1 leading-relaxed">
          {content.slice(0, 120)}{content.length > 120 ? '...' : ''}
        </p>
        <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-caption text-text-secondary">
        <FileText size={12} />
        <span className="truncate">{sourceDoc}</span>
      </div>
    </div>
  );
};

export default KBChunkCard;
