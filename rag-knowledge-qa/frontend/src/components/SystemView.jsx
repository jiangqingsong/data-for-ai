/**
 * SystemView - 系统信息界面
 * 显示系统状态、RAGAS 评估分数和技术栈信息
 * 迭代5：hover 过渡动画、错误状态处理
 */
import React from 'react';

const SystemView = ({ systemStatus, isLoadingSystemData, systemError }) => {
  return (
    <div className="p-6 h-full overflow-y-auto bg-surface-white">
      <h2 className="text-title text-text-primary mb-6">系统信息</h2>

      {systemError ? (
        /* 错误状态 */
        <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-body text-text-primary mb-1">加载失败</p>
          <p className="text-caption text-text-secondary mb-4">{systemError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-body bg-brand-500 text-white rounded-element hover:bg-brand-600 transition-colors"
          >
            刷新页面重试
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 系统状态卡片 */}
          <div className="p-4 bg-gray-50 rounded-element border border-border">
            <h3 className="text-body text-text-primary mb-4">系统状态</h3>
            {isLoadingSystemData ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-body text-text-primary animate-pulse">...</span>
                    <span className="text-body text-text-primary animate-pulse">...</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-body text-text-primary">服务状态</span>
                  <span className="flex items-center gap-1 text-body text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    {systemStatus?.status === 'running' ? '运行中' : '未连接'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body text-text-primary">向量库</span>
                  <span className="text-body text-text-secondary">Chroma DB v0.5.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body text-text-primary">模型</span>
                  <span className="text-body text-text-secondary">DeepSeek V4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body text-text-primary">向量数量</span>
                  <span className="text-body text-text-secondary">{systemStatus?.vector_count || '0'}</span>
                </div>
              </div>
            )}
          </div>

          {/* RAGAS 评估分数 */}
          <div>
            <h3 className="text-body text-text-primary mb-3">RAGAS 评估分数</h3>
            {isLoadingSystemData ? (
              <div className="space-y-3">
                {['Faithfulness', 'Answer Relevancy', 'Context Recall', 'Context Precision'].map((item) => (
                  <div key={item}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-caption text-text-primary animate-pulse">{item}</span>
                      <span className="text-caption text-text-primary animate-pulse">...</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gray-400 h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'faithfulness', label: 'Faithfulness', color: 'bg-green-600', score: systemStatus?.ragas_scores?.faithfulness ?? 0.9375 },
                  { key: 'answer_relevancy', label: 'Answer Relevancy', color: 'bg-green-600', score: systemStatus?.ragas_scores?.answer_relevancy ?? 0.9083 },
                  { key: 'context_recall', label: 'Context Recall', color: 'bg-red-500', score: systemStatus?.ragas_scores?.context_recall ?? 0.2375 },
                  { key: 'context_precision', label: 'Context Precision', color: 'bg-yellow-500', score: systemStatus?.ragas_scores?.context_precision ?? 0.7875 },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-caption text-text-primary">{item.label}</span>
                      <span className="text-caption text-text-primary">{item.score.toFixed(4)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full`}
                        style={{ width: `${item.score * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 技术栈 */}
          <div className="p-4 bg-gray-50 rounded-element border border-border">
            <h3 className="text-body text-text-primary mb-3">技术栈</h3>
            <div className="flex flex-wrap gap-2">
              {['React 18', 'Tailwind CSS', 'LangChain', 'Chroma DB', 'Python', 'FastAPI'].map((tech) => (
                <span key={tech}
                  className="px-2 py-1 bg-surface-white border border-border rounded-element text-caption text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemView;
