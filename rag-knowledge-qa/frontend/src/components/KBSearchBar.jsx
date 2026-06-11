/**
 * KBSearchBar - 知识库内搜索栏（当前为禁用态占位）
 */
import React from 'react';
import { Search } from 'lucide-react';

const KBSearchBar = () => {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
      <input
        type="text"
        placeholder="搜索知识块或文档..."
        disabled
        className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-body text-text-primary placeholder:text-text-secondary bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed outline-none"
      />
    </div>
  );
};

export default KBSearchBar;
