/**
 * SidebarFooter - 侧边栏底部区域
 * 显示版本号和知识库统计信息
 */
import React from 'react';

const SidebarFooter = ({ knowledgeStats, systemStatus }) => {
  return (
    <div className="border-t border-border p-4">
      <div className="text-caption text-text-secondary">
        <div className="mb-1">版本 1.0.0</div>
        <div>
          向量: {systemStatus?.vector_count || knowledgeStats?.vector_count || '0'} 条
          {' · '}
          文档: {knowledgeStats?.document_count || '0'} 个
        </div>
      </div>
    </div>
  );
};

export default SidebarFooter;
