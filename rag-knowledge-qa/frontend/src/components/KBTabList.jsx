/**
 * KBTabList - 知识块 / 文档 标签页切换
 */
import React, { useState } from 'react';
import KBChunkCard from './KBChunkCard';
import KBDocumentCard from './KBDocumentCard';

const TABS = [
  { key: 'chunks', label: '知识块' },
  { key: 'documents', label: '文档' },
];

const KBTabList = ({ chunks = [], documents = [] }) => {
  const [activeTab, setActiveTab] = useState('chunks');

  return (
    <div>
      {/* Tab 切换 */}
      <div className="flex items-center gap-1 mb-3 bg-gray-50 rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-1.5 text-caption rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-text-primary shadow-sm font-medium'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容列表 */}
      {activeTab === 'chunks' ? (
        chunks.length > 0 ? (
          <div className="space-y-2">
            {chunks.slice(0, 10).map((chunk, i) => (
              <KBChunkCard key={chunk.id || i} chunk={chunk} />
            ))}
            {chunks.length > 10 && (
              <button className="w-full py-2 text-caption text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
                查看全部 {chunks.length} 个知识块
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-caption text-text-secondary">
            暂无知识块，请先上传文档并运行 Pipeline
          </div>
        )
      ) : (
        documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <KBDocumentCard key={doc.filename || i} document={doc} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-caption text-text-secondary">
            暂无文档，请上传 PDF 文件
          </div>
        )
      )}
    </div>
  );
};

export default KBTabList;
