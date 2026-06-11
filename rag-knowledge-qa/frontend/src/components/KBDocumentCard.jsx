/**
 * KBDocumentCard - 文档卡片
 */
import React from 'react';
import { FileText, Trash2 } from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes) return '未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const KBDocumentCard = ({ document: doc }) => {
  const filename = doc?.filename || doc?.name || '未知文件';
  const size = doc?.size || doc?.file_size || 0;
  const pages = doc?.pages || doc?.page_count || 0;
  const chunks = doc?.chunk_count ?? doc?.chunks ?? 0;
  const uploadedAt = doc?.uploaded_at || doc?.created_at;

  return (
    <div className="p-3 bg-white rounded-lg border border-border hover:border-brand-200 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
          <FileText size={16} className="text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body text-text-primary font-medium truncate">{filename}</p>
          <div className="flex items-center gap-3 mt-1 text-caption text-text-secondary">
            <span>{formatFileSize(size)}</span>
            {pages > 0 && <span>{pages} 页</span>}
            {chunks > 0 && <span>{chunks} 个知识块</span>}
            {uploadedAt && <span>{new Date(uploadedAt).toLocaleDateString('zh-CN')}</span>}
          </div>
        </div>
        <button className="flex-shrink-0 p-1 rounded-md text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default KBDocumentCard;
