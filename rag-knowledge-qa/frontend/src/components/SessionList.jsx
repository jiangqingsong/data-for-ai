/**
 * SessionList - 会话列表区域
 * 支持：新建对话、切换会话、hover 显示操作按钮、点击标题编辑、删除确认
 * 迭代5：集成 Toast、删除确认对话框
 */
import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from './Toast';

const SessionList = ({
  sessions, currentSessionId,
  onCreateSession, onSwitchSession,
  onRenameSession, onDeleteSession,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const { showToast } = useToast();

  /** 进入编辑模式 */
  const startEditing = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  /** 提交重命名 */
  const submitRename = () => {
    if (editTitle.trim() && editingId) {
      onRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  /** 编辑键盘事件 */
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitRename(); }
    else if (e.key === 'Escape') { setEditingId(null); setEditTitle(''); }
  };

  /** 删除会话 — 确认后删除 */
  const handleDelete = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个会话吗？此操作不可撤销。')) {
      onDeleteSession(sessionId);
      showToast('会话已删除', 'info');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {/* 新建对话按钮 */}
      <button onClick={onCreateSession}
        className="w-full flex items-center gap-2 px-3 py-2 text-body text-text-primary hover:bg-gray-50 rounded-element transition-colors">
        <Plus size={16} className="text-text-secondary" />
        <span>新建对话</span>
      </button>

      {/* 历史会话列表 */}
      <div className="mt-3 space-y-1">
        <div className="px-3 py-1.5 text-caption text-text-secondary">历史会话</div>

        {sessions.length === 0 ? (
          <div className="px-3 py-2 text-caption text-text-secondary italic bg-gray-50 rounded-element">
            暂无历史会话
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === currentSessionId;
            const isHovered = hoveredId === session.id;
            const isEditing = editingId === session.id;

            return (
              <div key={session.id}
                onClick={() => onSwitchSession(session.id)}
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`group relative px-3 py-2 rounded-element cursor-pointer transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-500' : 'text-text-primary hover:bg-gray-50'
                }`}>
                {isEditing ? (
                  <input type="text" value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={submitRename}
                    onKeyDown={handleEditKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-body text-text-primary bg-white border border-brand-500 rounded-element px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    autoFocus />
                ) : (
                  <>
                    <div className="text-body truncate pr-12">
                      <span className="cursor-pointer hover:underline"
                        onClick={(e) => startEditing(e, session)}
                        title="点击编辑名称">
                        {session.title}
                      </span>
                    </div>
                    <div className="text-caption text-text-secondary mt-0.5">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>

                    {/* Hover 操作按钮 */}
                    {isHovered && (
                      <div className="absolute right-2 top-2 flex items-center gap-0.5">
                        <button
                          onClick={(e) => startEditing(e, session)}
                          className="p-1 rounded text-text-secondary hover:text-brand-500 hover:bg-brand-50 transition-colors"
                          title="重命名">
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, session.id)}
                          className="p-1 rounded text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="删除">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SessionList;
