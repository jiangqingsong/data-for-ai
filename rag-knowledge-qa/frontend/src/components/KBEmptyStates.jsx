/**
 * KBEmptyStates - 知识库空状态组件
 *
 * 三种状态：
 * 1. noKBs — 还没有任何知识库
 * 2. noDocs — 当前知识库还没有文档
 * 3. noSelection — 未选中任何知识库
 */
import React from 'react';
import { Database, FileText, FolderOpen } from 'lucide-react';

const states = {
  noSelection: {
    icon: FolderOpen,
    title: '选择一个知识库',
    description: '从左侧列表中选择一个知识库，或新建一个开始使用',
  },
  noKBs: {
    icon: Database,
    title: '还没有知识库',
    description: '点击左侧「新建知识库」按钮创建你的第一个知识库',
  },
  noDocs: {
    icon: FileText,
    title: '知识库中没有文档',
    description: '上传文档后运行 Pipeline 即可生成知识块',
  },
};

const KBEmptyStates = ({ type = 'noSelection' }) => {
  const config = states[type] || states.noSelection;
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <Icon size={28} className="text-text-secondary" />
      </div>
      <h3 className="text-body font-medium text-text-primary mb-1.5">{config.title}</h3>
      <p className="text-caption text-text-secondary max-w-[280px]">{config.description}</p>
    </div>
  );
};

export default KBEmptyStates;
