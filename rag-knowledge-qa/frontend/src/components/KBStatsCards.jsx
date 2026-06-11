/**
 * KBStatsCards - 知识库统计卡片（文档数 + 知识块数）
 */
import React from 'react';
import { FileText, Grid3X3 } from 'lucide-react';

const KBStatsCards = ({ stats }) => {
  const docCount = stats?.doc_count ?? 0;
  const vectorCount = stats?.vector_count ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 bg-gray-50 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-1.5">
          <FileText size={16} className="text-brand-500" />
          <span className="text-caption text-text-secondary">文档</span>
        </div>
        <div className="text-xl font-bold text-text-primary">{docCount}</div>
      </div>
      <div className="p-3 bg-gray-50 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-1.5">
          <Grid3X3 size={16} className="text-brand-500" />
          <span className="text-caption text-text-secondary">知识块</span>
        </div>
        <div className="text-xl font-bold text-text-primary">{vectorCount}</div>
      </div>
    </div>
  );
};

export default KBStatsCards;
