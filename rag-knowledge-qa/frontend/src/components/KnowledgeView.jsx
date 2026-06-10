/**
 * KnowledgeView - 知识库管理界面
 * 显示知识库统计、搜索入口和最近更新的知识块
 * 迭代5：禁用态样式、错误状态
 */
import React from 'react';

const KnowledgeView = ({ knowledgeStats, isLoadingSystemData, knowledgeError }) => {
  return (
    <div className="p-6 h-full overflow-y-auto bg-surface-white">
      <h2 className="text-title text-text-primary mb-6">知识库管理</h2>

      {knowledgeError ? (
        /* 错误状态 */
        <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-body text-text-primary mb-1">加载失败</p>
          <p className="text-caption text-text-secondary mb-4">{knowledgeError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-body bg-brand-500 text-white rounded-element hover:bg-brand-600 transition-colors"
          >
            刷新页面重试
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 知识库统计 */}
          <div className="p-4 bg-gray-50 rounded-element border border-border">
            <h3 className="text-body text-text-primary mb-3">知识库统计</h3>
            {isLoadingSystemData ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-3 bg-surface-white rounded-element border border-border">
                    <div className="text-2xl font-bold text-text-primary animate-pulse">...</div>
                    <div className="text-caption text-text-secondary mt-1 animate-pulse">加载中...</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-white rounded-element border border-border">
                  <div className="text-2xl font-bold text-brand-500">
                    {knowledgeStats?.vector_count || '0'}
                  </div>
                  <div className="text-caption text-text-secondary mt-1">知识块数量</div>
                </div>
                <div className="p-3 bg-surface-white rounded-element border border-border">
                  <div className="text-2xl font-bold text-brand-500">
                    {knowledgeStats?.document_count || '0'}
                  </div>
                  <div className="text-caption text-text-secondary mt-1">文档数量</div>
                </div>
              </div>
            )}
          </div>

          {/* 知识库搜索 */}
          <div>
            <h3 className="text-body text-text-primary mb-3">知识库搜索</h3>
            <div className="relative">
              <input type="text" placeholder="搜索知识库内容..."
                className="w-full p-3 pl-10 border border-border rounded-element focus:ring-2 focus:ring-brand-500 focus:border-transparent text-body text-text-primary placeholder:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled />
              <div className="absolute left-3 top-3 text-text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="text-caption text-text-secondary mt-2">搜索功能正在开发中...</div>
          </div>

          {/* 最近更新的知识块 */}
          <div>
            <h3 className="text-body text-text-primary mb-3">最近更新的知识块</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-surface-white rounded-element border border-border hover:bg-gray-50 transition-colors">
                  <div className="text-body text-text-primary">物理概念知识点 #{i}</div>
                  <div className="text-caption text-text-secondary mt-1">
                    2026-06-09 更新 • 来自《9年级物理-电子课本.pdf》
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button className="w-full py-2 px-4 bg-gray-100 text-text-primary rounded-element hover:bg-gray-200 transition-colors text-body disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              查看全部知识块
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeView;
