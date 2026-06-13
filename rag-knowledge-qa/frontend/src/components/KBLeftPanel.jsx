/**
 * KBLeftPanel - 知识库左侧面板（260px）
 *
 * 交互优化（乐观更新）:
 * - 创建：弹窗关闭后列表立刻插入「创建中」条目，后台 API 成功后转为正常态
 * - 删除：确认后条目立刻变为「删除中」态，API 成功后滑出消失
 * - 失败时自动回滚并 Toast 提示
 */
import React, { useState, useCallback, useRef } from 'react';
import { Plus, Database, Trash2, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import KBCreateModal from './KBCreateModal';
import KBDeleteConfirmModal from './KBDeleteConfirmModal';
import { useToast } from './Toast';

/** 临时乐观条目 ID 前缀 */
const OPTIMISTIC_ID_PREFIX = '__optimistic__';

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

  /* 乐观条目: { id, name, type: 'creating'|'deleting'|'error', errorMsg? } */
  const [optimisticItems, setOptimisticItems] = useState([]);
  const creatingLockRef = useRef(false); // 防重复创建
  const { showToast } = useToast();

  const totalDocs = knowledgeBases.reduce((sum, kb) => sum + (kb.doc_count || 0), 0);
  const totalVectors = knowledgeBases.reduce((sum, kb) => sum + (kb.vector_count || 0), 0);

  // ========== 创建逻辑 ==========

  const handleCreateSubmit = useCallback(async (name) => {
    if (creatingLockRef.current) return;
    creatingLockRef.current = true;

    const optimisticId = `${OPTIMISTIC_ID_PREFIX}create_${Date.now()}`;
    const optimisticItem = { id: optimisticId, name, type: 'creating' };

    // ① 立刻插入乐观条目
    setOptimisticItems(prev => [optimisticItem, ...prev]);

    try {
      const result = await onCreateKB(name);
      // ② 成功 → 移除乐观条目（真实列表会通过 fetchKnowledgeBases 刷新）
      setOptimisticItems(prev => prev.filter(item => item.id !== optimisticId));
      if (result) {
        showToast(`知识库「${name}」创建成功`, 'success');
        // 自动选中新知识库
        setTimeout(() => onSelectKB(name), 200);
      } else {
        // API 返回失败
        setOptimisticItems(prev =>
          prev.map(item =>
            item.id === optimisticId
              ? { ...item, type: 'error', errorMsg: '创建失败，请重试' }
              : item
          )
        );
        showToast(`知识库「${name}」创建失败，请重试`, 'error');
      }
    } catch {
      // ③ 网络异常
      setOptimisticItems(prev =>
        prev.map(item =>
          item.id === optimisticId
            ? { ...item, type: 'error', errorMsg: '网络异常，点击重试' }
            : item
        )
      );
      showToast(`知识库「${name}」创建失败，网络异常`, 'error');
    } finally {
      creatingLockRef.current = false;
    }
  }, [onCreateKB, onSelectKB, showToast]);

  /** 重试创建 */
  const handleRetryCreate = useCallback(async (item) => {
    // 移除旧错误条目，重新发起创建
    setOptimisticItems(prev => prev.filter(i => i.id !== item.id));
    // 延迟一帧后重新创建
    setTimeout(() => handleCreateSubmit(item.name), 50);
  }, [handleCreateSubmit]);

  // ========== 删除逻辑 ==========

  const handleDeleteClick = useCallback((e, name) => {
    e.stopPropagation();
    setDeleteTarget(name);
  }, []);

  const handleDeleteConfirm = useCallback(async (name) => {
    const optimisticId = `${OPTIMISTIC_ID_PREFIX}delete_${Date.now()}`;
    const optimisticItem = { id: optimisticId, name, type: 'deleting' };

    // ① 立刻插入乐观删除条目
    setOptimisticItems(prev => [...prev, optimisticItem]);

    // 如果当前正在查看该知识库，清空右侧面板
    if (selectedKBName === name) {
      onSelectKB(null);
    }

    try {
      const result = await onDeleteKB(name);
      if (result) {
        // ② 成功 → 条目滑出
        if (result.status === 'partial') {
          showToast(`知识库「${name}」${result.detail || '部分删除成功'}`, 'info');
        } else {
          showToast(`知识库「${name}」已删除`, 'success');
        }
        // 等待滑出动画完成后再移除乐观条目
        setTimeout(() => {
          setOptimisticItems(prev => prev.filter(item => item.id !== optimisticId));
        }, 400);
      } else {
        // API 返回失败
        setOptimisticItems(prev => prev.filter(item => item.id !== optimisticId));
        showToast(`知识库「${name}」删除失败，请重试`, 'error');
      }
    } catch {
      // ③ 网络异常
      setOptimisticItems(prev => prev.filter(item => item.id !== optimisticId));
      showToast(`知识库「${name}」删除失败，网络异常`, 'error');
    }
  }, [onDeleteKB, onSelectKB, selectedKBName, showToast]);

  // ========== 合并列表 ==========

  /** 真实列表 + 乐观条目，按插入顺序排列 */
  const mergedList = React.useMemo(() => {
    const realItems = knowledgeBases.map(kb => ({
      id: kb.name,
      name: kb.name,
      type: 'real',
      doc_count: kb.doc_count,
      vector_count: kb.vector_count,
    }));

    // 删除中的真实条目要被覆盖（显示为删除态）
    const deletingNames = new Set(
      optimisticItems.filter(o => o.type === 'deleting').map(o => o.name)
    );
    const filteredReal = realItems.filter(r => !deletingNames.has(r.name));

    // 已经出现在真实列表中的乐观条目（创建成功后 API 刷新了列表），不再重复显示
    const realNames = new Set(filteredReal.map(r => r.name));
    const optimisticForList = optimisticItems
      .filter(o => o.type !== 'deleting' && !realNames.has(o.name))
      .map(o => ({ ...o, doc_count: 0, vector_count: 0 }));

    // 删除中的条目
    const deletingItems = optimisticItems
      .filter(o => o.type === 'deleting')
      .map(o => ({ ...o, doc_count: 0, vector_count: 0 }));

    return [...optimisticForList, ...filteredReal, ...deletingItems];
  }, [knowledgeBases, optimisticItems]);

  // ========== 渲染列表项 ==========

  const renderItem = (kb) => {
    const isSelected = selectedKBName === kb.name && kb.type !== 'creating' && kb.type !== 'deleting';
    const isCreating = kb.type === 'creating';
    const isDeleting = kb.type === 'deleting';
    const isError = kb.type === 'error';

    return (
      <div
        key={kb.id}
        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
          isCreating ? 'kb-item-creating kb-item-enter' : ''
        } ${isDeleting ? 'kb-item-deleting kb-item-exit' : ''} ${
          isError ? 'kb-item-error border border-red-200' : ''
        } ${
          isSelected
            ? 'bg-brand-50 border border-brand-200'
            : !isCreating && !isError
              ? 'hover:bg-gray-100 border border-transparent'
              : 'border border-transparent'
        } ${!isDeleting && !isCreating && !isError ? 'cursor-pointer' : ''}`}
        onClick={() => {
          if (!isCreating && !isDeleting && !isError) onSelectKB(kb.name);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isError ? (
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            ) : isCreating ? (
              <div className="kb-spinner flex-shrink-0" />
            ) : (
              <Database size={14} className={isSelected ? 'text-brand-500' : isDeleting ? 'text-gray-300' : 'text-text-secondary'} />
            )}
            <span className={`text-body font-medium truncate ${
              isSelected ? 'text-brand-600' : isDeleting ? 'text-gray-400' : isCreating ? 'text-text-secondary' : 'text-text-primary'
            }`}>
              {kb.name}
            </span>
            {isCreating && (
              <span className="text-caption text-text-secondary flex-shrink-0">创建中...</span>
            )}
            {isDeleting && (
              <span className="text-caption text-gray-400 flex-shrink-0">删除中...</span>
            )}
          </div>
          {isError ? (
            <div className="flex items-center gap-2 mt-1 ml-6">
              <span className="text-caption text-red-500">{kb.errorMsg}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleRetryCreate(kb); }}
                className="inline-flex items-center gap-1 text-caption text-brand-500 hover:text-brand-600"
              >
                <RefreshCw size={10} />
                重试
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1 ml-6 text-caption text-text-secondary">
              <span>{kb.doc_count || 0} 文档</span>
              <span>{kb.vector_count || 0} 块</span>
            </div>
          )}
        </div>

        {/* 操作按钮：只有正常条目显示删除图标 */}
        {kb.type === 'real' && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleDeleteClick(e, kb.name)}
              className="p-1 rounded-md text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <ChevronRight size={14} className="text-text-secondary" />
          </div>
        )}
      </div>
    );
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
          {isKBLoading && optimisticItems.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : mergedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Database size={28} className="mb-2 opacity-40" />
              <p className="text-caption">暂无知识库</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {mergedList.map(renderItem)}
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
        onSubmit={handleCreateSubmit}
      />

      <KBDeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        kbName={deleteTarget || ''}
      />
    </>
  );
};

export default KBLeftPanel;
