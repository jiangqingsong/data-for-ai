/**
 * KBDocumentCard - 文档卡片（支持预览、删除）
 */
import React, { useState } from 'react';
import { FileText, Eye, Trash2 } from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes) return '未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const KBDocumentCard = ({ document: doc, kbName, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const filename = doc?.filename || doc?.name || '未知文件';
  const size = doc?.size_bytes || doc?.size || doc?.file_size || 0;
  const pages = doc?.page_count || doc?.pages || 0;
  const chunks = doc?.chunk_count ?? doc?.chunks ?? 0;
  const uploadedAt = doc?.uploaded_at || doc?.created_at;
  const isPDF = filename.toLowerCase().endsWith('.pdf');

  const previewUrl = kbName
    ? `/api/knowledge-bases/${encodeURIComponent(kbName)}/documents/${encodeURIComponent(filename)}/raw`
    : null;

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    if (!window.confirm(`确定要删除文档「${filename}」吗？\n\n删除后相关的向量数据也将被清除。`)) return;
    setDeleting(true);
    try {
      await onDelete(kbName, filename);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`p-3 bg-white rounded-lg border border-border hover:border-brand-200 hover:shadow-sm transition-all group ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isPDF ? 'bg-red-50' : 'bg-blue-50'}`}>
          <FileText size={16} className={isPDF ? 'text-red-500' : 'text-blue-500'} />
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
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 预览按钮 */}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-text-secondary hover:text-brand-500 hover:bg-brand-50 transition-colors"
              title="预览文档"
            >
              <Eye size={14} />
            </a>
          )}
          {/* 删除按钮 */}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-md text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
              title="删除文档"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KBDocumentCard;
