/**
 * SidebarFooter - 侧边栏底部区域
 * 显示版本号和知识库统计信息，默认折叠收起
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SidebarFooter = ({ knowledgeStats, systemStatus }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-border p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-caption text-text-secondary hover:text-text-primary transition-colors"
      >
        <span>系统信息</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div className="mt-2 text-caption text-text-secondary space-y-1">
          <div>版本 1.0.0</div>
          <div>
            向量: {systemStatus?.vector_count || knowledgeStats?.vector_count || '0'} 条
            {' · '}
            文档: {knowledgeStats?.document_count || '0'} 个
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarFooter;
