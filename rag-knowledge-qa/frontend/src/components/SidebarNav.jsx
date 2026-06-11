/**
 * SidebarNav - 侧边栏上半区：全局导航菜单
 * 分为「核心功能」和「系统管理」两组，带分组标签
 * 选中态：品牌色背景 + 品牌色文字
 */
import React from 'react';
import { MessageSquare, BookOpen, Settings } from 'lucide-react';

const SidebarNav = ({ activeTab, onTabChange }) => {
  const coreItems = [
    { key: 'chat', label: '问答对话', icon: MessageSquare },
    { key: 'knowledge', label: '知识库管理', icon: BookOpen },
  ];

  const systemItems = [
    { key: 'system', label: '系统信息', icon: Settings },
  ];

  return (
    <nav className="py-4 px-2 space-y-4">
      {/* 核心功能分组 */}
      <div>
        <div className="px-3 py-1 text-caption text-text-secondary">
          核心功能
        </div>
        <div className="mt-1 space-y-0.5">
          {coreItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-body rounded-element transition-colors border-l-[3px] ${
                  isActive
                    ? 'bg-brand-50 text-brand-500 border-l-brand-500'
                    : 'text-text-primary hover:bg-gray-50 border-l-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-brand-500' : 'text-text-secondary'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 系统管理分组 */}
      <div>
        <div className="px-3 py-1 text-caption text-text-secondary">
          系统管理
        </div>
        <div className="mt-1 space-y-0.5">
          {systemItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-body rounded-element transition-colors border-l-[3px] ${
                  isActive
                    ? 'bg-brand-50 text-brand-500 border-l-brand-500'
                    : 'text-text-primary hover:bg-gray-50 border-l-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-brand-500' : 'text-text-secondary'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default SidebarNav;
