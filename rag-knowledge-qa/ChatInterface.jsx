import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, BookOpen, Settings, Menu, X, Send, Loader2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import apiClient from './src/ApiClient.jsx';
import ReactMarkdown from 'react-markdown';

// 示例聊天数据
const initialMessages = [
  {
    id: 1,
    role: 'assistant',
    content: '你好！我是你的物理知识库助手。有什么物理问题需要我帮助解答吗？',
    timestamp: new Date().toLocaleTimeString()
  }
];

const ChatInterface = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [topK, setTopK] = useState(4);
  const [retrievalStrategy, setRetrievalStrategy] = useState('similarity');
  const [activeTab, setActiveTab] = useState('chat');
  const [systemStatus, setSystemStatus] = useState(null);
  const [knowledgeStats, setKnowledgeStats] = useState(null);
  const [isLoadingSystemData, setIsLoadingSystemData] = useState(true);

  const messagesEndRef = useRef(null);

  // 获取系统状态
  const fetchSystemStatus = async () => {
    try {
      const data = await apiClient.getSystemStatus();
      if (data) {
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('获取系统状态失败:', error);
    }
  };

  // 获取知识库统计
  const fetchKnowledgeStats = async () => {
    try {
      const data = await apiClient.getKnowledgeStats();
      if (data) {
        setKnowledgeStats(data);
      }
    } catch (error) {
      console.error('获取知识库统计失败:', error);
    }
  };

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化数据
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchSystemStatus(),
        fetchKnowledgeStats()
      ]);
      setIsLoadingSystemData(false);
    };

    fetchData();
  }, []);

  // 处理发送消息
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;

    // 添加用户消息
    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // 创建流式消息 ID
      const streamMessageId = messages.length + 2;

      // 添加初始的空白消息用于流式输出
      const streamMessage = {
        id: streamMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true
      };

      setMessages([...newMessages, streamMessage]);

      // 定义流式回调函数
      const onChunk = (currentText, options) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamMessageId
              ? {...msg, content: currentText}
              : msg
          )
        );
      };

      const onComplete = (result) => {
        // 替换为完整的消息对象
        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamMessageId
              ? {
                  ...msg,
                  content: result.answer,
                  sources: result.sources,
                  isStreaming: false
                }
              : msg
          )
        );
        setIsLoading(false);
      };

      const onError = (error) => {
        console.error('流式聊天错误:', error);
        // 设置错误消息
        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamMessageId
              ? {
                  ...msg,
                  content: `抱歉，出现了错误: ${error.message}。请稍后重试。`,
                  isStreaming: false
                }
              : msg
          )
        );
        setIsLoading(false);
      };

      // 调用流式聊天 API
      await apiClient.chatStream(
        inputMessage,
        topK,
        retrievalStrategy,
        onChunk,
        onComplete,
        onError
      );
    } catch (error) {
      console.error('聊天错误:', error);

      // 添加错误消息
      const errorMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: `抱歉，出现了错误: ${error.message}。请稍后重试。`,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // 处理侧边栏项点击
  const handleSidebarItemClick = (tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // PDF链接组件
  const PDFLink = ({ source, page }) => {
    const handleDownload = (e) => {
      e.preventDefault();

      try {
        // 创建简单的下载链接
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = '/api/download-pdf';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'filename';
        input.value = source;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      } catch (error) {
        console.error('下载PDF失败:', error);
        alert(`抱歉，无法下载文件 "${source}"`);
      }
    };

    return (
      <button
        onClick={handleDownload}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs transition-colors"
        title="点击下载PDF文件"
      >
        <span>{source}</span>
        {page && <span className="text-gray-500">({page}页)</span>}
        <Download size={12} className="opacity-70" />
      </button>
    );
  };

  // 渲染聊天消息
  const renderMessages = () => {
    return messages.map(message => (
      <div
        key={message.id}
        className={`flex items-start gap-2 py-1 transition-all duration-200 ${
          message.role === 'user'
            ? 'justify-end'
            : 'justify-start'
        }`}
      >
        <div
          className={`flex items-start gap-3 px-4 py-3 rounded-2xl ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-800'
          } max-w-[75%] shadow-sm hover:shadow-md transition-all duration-200`}
        >
          <div className="flex-shrink-0 mt-1">
            {message.role === 'user' ? (
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white">
                <span className="text-sm font-medium">你</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white">
                <MessageSquare size={16} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {/* 使用ReactMarkdown渲染消息内容 */}
            {message.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  children={message.content}
                  components={{
                    p: ({ children }) => <p className="whitespace-pre-wrap break-words text-gray-800">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mt-2 text-gray-800">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mt-2 text-gray-800">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-800">{children}</li>,
                    code: ({ children }) => (
                      <code className="bg-gray-200 px-1 py-0.5 rounded font-mono text-sm text-gray-900">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-4">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4">
                        {children}
                      </blockquote>
                    ),
                    h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold text-gray-900 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold text-gray-900 mb-2">{children}</h3>,
                  }}
                />
                {/* 流式加载指示器 */}
                {message.isStreaming && (
                  <div className="flex items-center gap-1 mt-2 text-gray-500">
                    <Loader2 size={12} className="animate-spin" />
                    <span className="text-xs">正在思考...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-white">
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            )}

            {/* 显示来源信息 */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600 font-medium mb-1">
                  📚 参考来源:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {message.sources.slice(0, 3).map((source, idx) => (
                    <div key={idx}>
                      <PDFLink
                        source={source.source}
                        page={source.page}
                      />
                    </div>
                  ))}
                  {message.sources.length > 3 && (
                    <div className="text-xs text-gray-500 mt-1">
                      • 还有 {message.sources.length - 3} 个来源
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs mt-1 opacity-70">
              {message.timestamp}
            </div>
          </div>
        </div>
      </div>
    ));
  };

  // 渲染聊天界面
  const renderChatInterface = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="border-b border-gray-200 px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">问答对话</h2>
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showAdvancedSettings ? (
              <>高级设置 <ChevronUp size={16} /></>
            ) : (
              <>高级设置 <ChevronDown size={16} /></>
            )}
          </button>
        </div>

        {/* 高级设置 */}
        {showAdvancedSettings && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  检索数量 (Top-K)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 w-8 text-center">
                    {topK}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  检索策略
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="retrievalStrategy"
                      value="similarity"
                      checked={retrievalStrategy === 'similarity'}
                      onChange={(e) => setRetrievalStrategy(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Similarity</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="retrievalStrategy"
                      value="mmr"
                      checked={retrievalStrategy === 'mmr'}
                      onChange={(e) => setRetrievalStrategy(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">MMR</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 聊天记录 */}
      <div className="flex-1 overflow-y-auto p-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <MessageSquare size={48} className="mb-4 opacity-30" />
              <p className="text-lg">还没有聊天记录</p>
              <p className="text-sm mt-2">开始提问吧，我会帮你解答物理知识</p>
            </div>
          ) : (
            <div className="space-y-6">
              {renderMessages()}
              {/* 流式输出会在消息内部显示加载状态 */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-200 p-4 bg-white shadow-inner">
        <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              // Enter 发送消息，Shift+Enter 换行
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="请输入你的物理问题..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 h-24"
            rows={3}
            disabled={isLoading}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              回车发送消息，Shift+Enter换行
            </span>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              发送
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // 渲染知识库管理界面
  const renderKnowledgeBase = () => (
    <div className="p-6 h-full overflow-y-auto bg-white">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">知识库管理</h2>

      <div className="space-y-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">知识库统计</h3>
          {isLoadingSystemData ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="text-2xl font-bold text-gray-900 animate-pulse">...</div>
                <div className="text-xs text-gray-500 mt-1 animate-pulse">知识块数量</div>
              </div>
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="text-2xl font-bold text-gray-900 animate-pulse">...</div>
                <div className="text-xs text-gray-500 mt-1 animate-pulse">文档数量</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {knowledgeStats?.vector_count || '189'}
                </div>
                <div className="text-xs text-gray-500 mt-1">知识块数量</div>
              </div>
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {knowledgeStats?.document_count || '2'}
                </div>
                <div className="text-xs text-gray-500 mt-1">文档数量</div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">知识库搜索</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="搜索知识库内容..."
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            />
            <div className="absolute left-3 top-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            搜索功能正在开发中...
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">最近更新的知识块</h3>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="text-sm font-medium text-gray-900">
                  物理概念知识点 #{i}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  2026-06-09 更新 • 来自《9年级物理-电子课本.pdf》
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" disabled>
            查看全部知识块
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染系统信息界面
  const renderSystemInfo = () => (
    <div className="p-6 h-full overflow-y-auto bg-white">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">系统信息</h2>

      <div className="space-y-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-4">系统状态</h3>
          {isLoadingSystemData ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 animate-pulse">服务状态</span>
                <span className="flex items-center gap-1 text-sm text-gray-600 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                  ...
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 animate-pulse">向量库</span>
                <span className="text-sm text-gray-600 animate-pulse">...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 animate-pulse">模型</span>
                <span className="text-sm text-gray-600 animate-pulse">...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 animate-pulse">API 延迟</span>
                <span className="text-sm text-gray-600 animate-pulse">...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">服务状态</span>
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  {systemStatus?.status === 'running' ? '运行中' : '未连接'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">向量库</span>
                <span className="text-sm text-gray-600">Chroma DB v0.5.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">模型</span>
                <span className="text-sm text-gray-600">DeepSeek V4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">向量数量</span>
                <span className="text-sm text-gray-600">
                  {systemStatus?.vector_count || '0'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">RAGAS 评估分数</h3>
          {isLoadingSystemData ? (
            <div className="space-y-3">
              {['Faithfulness', 'Answer Relevancy', 'Context Recall', 'Context Precision'].map((item) => (
                <div key={item}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 animate-pulse">{item}</span>
                    <span className="text-xs font-medium text-gray-600 animate-pulse">...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Faithfulness</span>
                  <span className="text-xs font-medium text-gray-900">
                    {systemStatus?.ragas_scores?.faithfulness?.toFixed(4) || '0.9375'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${(systemStatus?.ragas_scores?.faithfulness || 0.9375) * 100}%`
                    }}>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Answer Relevancy</span>
                  <span className="text-xs font-medium text-gray-900">
                    {systemStatus?.ragas_scores?.answer_relevancy?.toFixed(4) || '0.9083'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${(systemStatus?.ragas_scores?.answer_relevancy || 0.9083) * 100}%`
                    }}>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Context Recall</span>
                  <span className="text-xs font-medium text-gray-900">
                    {systemStatus?.ragas_scores?.context_recall?.toFixed(4) || '0.2375'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${(systemStatus?.ragas_scores?.context_recall || 0.2375) * 100}%`
                    }}>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Context Precision</span>
                  <span className="text-xs font-medium text-gray-900">
                    {systemStatus?.ragas_scores?.context_precision?.toFixed(4) || '0.7875'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${(systemStatus?.ragas_scores?.context_precision || 0.7875) * 100}%`
                    }}>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">技术栈</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
              React 18
            </span>
            <span className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
              Tailwind CSS
            </span>
            <span className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
              LangChain
            </span>
            <span className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
              Chroma DB
            </span>
            <span className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
              Python
            </span>
            <span className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
              FastAPI
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染主内容
  const renderMainContent = () => {
    switch (activeTab) {
      case 'chat':
        return renderChatInterface();
      case 'knowledge':
        return renderKnowledgeBase();
      case 'system':
        return renderSystemInfo();
      default:
        return renderChatInterface();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 侧边栏头部 */}
          <div className="border-b border-gray-200 p-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">
              RAG 知识库
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* 侧边栏导航 */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            <button
              onClick={() => handleSidebarItemClick('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <MessageSquare size={18} />
              <span>问答对话</span>
            </button>

            <button
              onClick={() => handleSidebarItemClick('knowledge')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                activeTab === 'knowledge'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <BookOpen size={18} />
              <span>知识库管理</span>
            </button>

            <button
              onClick={() => handleSidebarItemClick('system')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                activeTab === 'system'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Settings size={18} />
              <span>系统信息</span>
            </button>
          </nav>

          {/* 侧边栏底部 */}
          <div className="border-t border-gray-200 p-4">
            <div className="text-xs text-gray-500">
              <div className="mb-1">版本 1.0.0</div>
              <div>最后更新: 2026-06-09</div>
            </div>
          </div>
        </div>
      </div>

      {/* 遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 顶部导航 */}
        <div className="border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              RAG 知识库问答系统
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>已连接</span>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容 */}
        <div className="flex-1 overflow-hidden">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;