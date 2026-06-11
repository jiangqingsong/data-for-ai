/**
 * KBLeftPanel - 知识库左侧面板（260px）
 * 包含新建按钮、知识库列表、全局统计
 */
import React, { useState } from 'react';
import { Plus, Database, Trash2, ChevronRight } from 'lucide-react';
import KBCreateModal from './KBCreateModal';
import KBDeleteConfirmModal from './KBDeleteConfirmModal';

const KBLeftPanel = ({
  knowledgeBases = [],
  selectedKBName,
  onSelectKB,
  onCreateKB,
  onDeleteKB,
  isKBLoading,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalDocs = knowledgeBases.reduce((sum, kb) => sum + (kb.doc_count || 0), 0);
  const totalVectors = knowledgeBases.reduce((sum, kb) => sum + (kb.vector_count || 0), 0);

  const handleDeleteClick = (e, name) => {
    e.stopPropagation();
    setDeleteTarget(name);
  };

  return (
    <>
      <div className="w-[260px] flex-shrink-0 border-r border-border bg-gray-50 flex flex-col h-full">
        {/* 头部 */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-body font-medium"
          >
            <Plus size={18} />
            新建知识库
          </button>
        </div>

        {/* 知识库列表 */}
        <div className="flex-1 overflow-y-auto">
          {isKBLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Database size={28} className="mb-2 opacity-40" />
              <p className="text-caption">暂无知识库</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {knowledgeBases.map(kb => (
                <div
                  key={kb.name}
                  onClick={() => onSelectKB(kb.name)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    selectedKBName === kb.name
                      ? 'bg-brand-50 border border-brand-200'
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Database size={14} className={selectedKBName === kb.name ? 'text-brand-500' : 'text-text-secondary'} />
                      <span className={`text-body font-medium truncate ${selectedKBName === kb.name ? 'text-brand-600' : 'text-text-primary'}`}>
                        {kb.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-6 text-caption text-text-secondary">
                      <span>{kb.doc_count || 0} 文档</span>
                      <span>{kb.vector_count || 0} 块</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDeleteClick(e, kb.name)}
                      className="p-1 rounded-md text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={14} className="text-text-secondary" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className="p-3 border-t border-border bg-white">
          <div className="flex items-center justify-between text-caption text-text-secondary">
            <span>{knowledgeBases.length} 个知识库</span>
            <span>{totalDocs} 文档 / {totalVectors} 块</span>
          </div>
        </div>
      </div>

      <KBCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={onCreateKB}
      />

      <KBDeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async (name) => {
          await onDeleteKB(name);
          setDeleteTarget(null);
        }}
        kbName={deleteTarget || ''}
      />
    </>
  );
};

export default KBLeftPanel;
