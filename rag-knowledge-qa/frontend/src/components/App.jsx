/**
 * App - 应用根组件
 * 拥有所有全局状态和业务逻辑，通过 props 向下传递给子组件
 *
 * 状态架构（迭代4）:
 * - sessions[] + currentSessionId: 多会话管理
 * - rightPanelOpen + selectedSourceData: 右侧溯源面板
 * - retrievalPhase: 检索状态区分
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ThreeColumnLayout from './ThreeColumnLayout';
import { ToastProvider } from './Toast';
import apiClient from '../ApiClient.jsx';

/** 生成唯一 ID */
const generateId = () => crypto.randomUUID();

/** 创建默认会话 */
const createDefaultSession = () => ({
  id: generateId(),
  title: '新对话',
  messages: [
    {
      id: generateId(),
      role: 'assistant',
      content: '你好！我是你的知识问答助手，正在加载知识库信息...',
      timestamp: new Date().toLocaleTimeString(),
      favorite: false,
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * 根据当前知识库选择状态生成欢迎词
 * 场景1: 选中具体KB → 绑定【XXX】知识库
 * 场景2: 未选中但有可用KB → 已绑定多个知识库
 * 场景3: 无任何KB → 请先选择绑定知识库
 */
const getWelcomeText = (selectedChatKB, knowledgeBases) => {
  const kbCount = knowledgeBases?.length || 0;
  if (selectedChatKB) {
    return `你好！我是你的知识问答助手，当前会话已绑定【${selectedChatKB}】知识库，我会基于该库内容为你解答问题~`;
  } else if (kbCount > 0) {
    return '你好！我是你的知识问答助手，当前会话已绑定多个知识库，我会根据你的提问自动检索匹配的内容~';
  } else {
    return '你好！我是你的知识问答助手，请先选择绑定知识库，我才能为你解答相关问题哦~';
  }
};

/** 预生成默认会话，确保 sessions 和 currentSessionId 引用同一 ID */
const defaultSession = createDefaultSession();

const App = () => {
  // ========== 状态管理 ==========
  const [sessions, setSessions] = useState(() => [defaultSession]);
  const [currentSessionId, setCurrentSessionId] = useState(() => defaultSession.id);
  const [inputMessage, setInputMessage] = useState('');
  const sessionInputCache = useRef({}); // 会话级输入缓存
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [topK, setTopK] = useState(4);
  const [retrievalStrategy, setRetrievalStrategy] = useState('similarity');
  const [activeTab, setActiveTab] = useState('chat');
  const [systemStatus, setSystemStatus] = useState(null);
  const [knowledgeStats, setKnowledgeStats] = useState(null);
  const [isLoadingSystemData, setIsLoadingSystemData] = useState(true);

  /* 动态推荐问题 */
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [suggestedQuestionsLoading, setSuggestedQuestionsLoading] = useState(true);

  /* 迭代4新增: 右侧溯源面板 */
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [selectedSourceData, setSelectedSourceData] = useState(null);

  /* 迭代4新增: 检索阶段指示 */
  const [retrievalPhase, setRetrievalPhase] = useState(null);
  // null | "retrieving" | "generating"
  const phaseTimerRef = useRef(null);

  /* 迭代5: 知识库管理 */
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKBName, setSelectedKBName] = useState(null);
  const [selectedKBStats, setSelectedKBStats] = useState(null);
  const [isKBLoading, setIsKBLoading] = useState(false);
  const [selectedChatKB, setSelectedChatKB] = useState(null); // 问答界面选择的知识库

  /* Pipeline 全局状态（跨 tab 保持） */
  const [pipelineRunningKB, setPipelineRunningKB] = useState(null); // 正在运行的 KB 名
  const [pipelineStatus, setPipelineStatus] = useState(null);       // { step, message, progress_pct, error_detail }
  const pipelinePollRef = useRef(null);

  const messagesEndRef = useRef(null);

  // ========== 派生值 ==========

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession ? currentSession.messages : [];

  // ========== 会话消息更新辅助 ==========

  const updateCurrentSessionMessages = useCallback((updater) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: updater(s.messages), updatedAt: new Date().toISOString() }
          : s
      )
    );
  }, [currentSessionId]);

  // ========== API 调用 ==========

  const fetchSystemStatus = async () => {
    try {
      const data = await apiClient.getSystemStatus();
      if (data) setSystemStatus(data);
    } catch (error) {
      console.error('获取系统状态失败:', error);
    }
  };

  const fetchKnowledgeStats = async () => {
    try {
      const data = await apiClient.getKnowledgeStats();
      if (data) setKnowledgeStats(data);
    } catch (error) {
      console.error('获取知识库统计失败:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ========== 副作用 ==========

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchSystemStatus(), fetchKnowledgeStats(), fetchKnowledgeBases()]);
      setIsLoadingSystemData(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      setSuggestedQuestionsLoading(true);
      const data = await apiClient.getSuggestedQuestions();
      if (data?.questions?.length > 0) {
        setSuggestedQuestions(data.questions);
      }
      setSuggestedQuestionsLoading(false);
    };
    fetchQuestions();
  }, []);

  /**
   * 欢迎词动态适配逻辑
   * 响应 selectedChatKB 和 knowledgeBases 变化，覆盖3种场景。
   * 仅更新"新会话"（仅有1条assistant消息的会话），已有对话记录的不改动。
   */
  useEffect(() => {
    if (isLoadingSystemData) return;
    const welcomeText = getWelcomeText(selectedChatKB, knowledgeBases);
    setSessions(prev =>
      prev.map(s => {
        // 只更新仅有1条欢迎消息的新会话
        if (s.messages.length === 1 && s.messages[0].role === 'assistant') {
          return {
            ...s,
            messages: [{ ...s.messages[0], content: welcomeText }],
          };
        }
        return s;
      })
    );
  }, [selectedChatKB, knowledgeBases, isLoadingSystemData]);

  /** 关闭 Pipeline 进度条（手动关闭完成/失败提示） */
  const handleDismissPipelineStatus = useCallback(() => {
    setPipelineStatus(null);
  }, []);

  // ========== 溯源面板控制 ==========

  /** 打开右侧溯源面板，加载指定文档页的原文 */
  const handleOpenSourceDetail = useCallback(async (filename, page, snippet, hitPages = []) => {
    setRightPanelOpen(true);
    setSelectedSourceData({ filename, page, snippet, hitPages, pageText: null, loading: true });
    try {
      const data = await apiClient.getDocumentPage(filename, page);
      const pageText = data?.page_text || '该页无可提取文本（可能是扫描页）';
      const totalPages = data?.total_pages ?? null;
      setSelectedSourceData(prev => ({
        ...prev,
        pageText,
        totalPages,
        loading: false,
      }));
    } catch (err) {
      setSelectedSourceData(prev => ({
        ...prev,
        pageText: '加载页面内容失败，请稍后重试',
        loading: false,
      }));
    }
  }, []);

  /** 关闭右侧溯源面板 */
  const handleCloseRightPanel = useCallback(() => {
    setRightPanelOpen(false);
    setSelectedSourceData(null);
  }, []);

  /** 基于本段提问：将原文片段填入输入框 */
  const handleQuoteForQuestion = useCallback((snippet) => {
    setInputMessage(snippet);
  }, []);

  /** 收藏本段素材：存入 localStorage */
  const handleFavoriteSnippet = useCallback((filename, page, snippet) => {
    const key = 'favorite_snippets';
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const exists = existing.some(
        item => item.filename === filename && item.page === page
      );
      if (!exists) {
        existing.push({
          filename,
          page,
          snippet: snippet?.slice(0, 200) || '',
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch (e) {
      console.error('收藏失败:', e);
    }
  }, []);

  // ========== 聊天核心逻辑 ==========

  /** 执行流式聊天 */
  const executeChatStream = useCallback(async (questionText) => {
    const streamMessageId = generateId();
    const streamMessage = {
      id: streamMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true,
      favorite: false,
    };

    updateCurrentSessionMessages(msgs => [...msgs, streamMessage]);

    // 检索阶段指示
    setRetrievalPhase('retrieving');
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    phaseTimerRef.current = setTimeout(() => setRetrievalPhase('generating'), 1500);

    const onChunk = (currentText, meta = {}) => {
      updateCurrentSessionMessages(msgs =>
        msgs.map(msg =>
          msg.id === streamMessageId
            ? {
                ...msg,
                content: currentText,
                sources: meta.sources || msg.sources,
                context_docs: meta.context_docs || msg.context_docs,
              }
            : msg
        )
      );
    };

    const onComplete = (result) => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      setRetrievalPhase(null);
      updateCurrentSessionMessages(msgs =>
        msgs.map(msg =>
          msg.id === streamMessageId
            ? {
                ...msg,
                content: result.answer,
                sources: result.sources,
                context_docs: result.context_docs,
                isStreaming: false,
              }
            : msg
        )
      );
      setIsLoading(false);
    };

    const onError = (error) => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      setRetrievalPhase(null);
      console.error('流式聊天错误:', error);
      updateCurrentSessionMessages(msgs =>
        msgs.map(msg =>
          msg.id === streamMessageId
            ? { ...msg, content: `抱歉，出现了错误: ${error.message}。请稍后重试。`, isStreaming: false }
            : msg
        )
      );
      setIsLoading(false);
    };

    try {
      await apiClient.chatStream(questionText, topK, retrievalStrategy, onChunk, onComplete, onError, selectedChatKB);
    } catch (error) {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      setRetrievalPhase(null);
      console.error('聊天错误:', error);
      updateCurrentSessionMessages(msgs =>
        msgs.map(msg =>
          msg.id === streamMessageId
            ? { ...msg, content: `抱歉，出现了错误: ${error.message}。请稍后重试。`, isStreaming: false }
            : msg
        )
      );
      setIsLoading(false);
    }
  }, [topK, retrievalStrategy, selectedChatKB, updateCurrentSessionMessages]);

  /** 发送消息 */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const questionText = inputMessage;

    const userMessage = {
      id: generateId(),
      role: 'user',
      content: questionText,
      timestamp: new Date().toLocaleTimeString(),
      favorite: false,
    };

    updateCurrentSessionMessages(msgs => [...msgs, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    setSessions(prev =>
      prev.map(s => {
        if (s.id !== currentSessionId) return s;
        const isFirstQuestion = s.messages.filter(m => m.role === 'user').length === 0;
        if (isFirstQuestion) {
          const title = questionText.slice(0, 20) + (questionText.length > 20 ? '...' : '');
          return { ...s, title };
        }
        return s;
      })
    );

    await executeChatStream(questionText);
  };

  // ========== 会话管理 ==========

  const handleCreateSession = () => {
    sessionInputCache.current[currentSessionId] = inputMessage;
    const newSession = createDefaultSession();
    // 如果知识库数据已加载，新建会话时直接写入正确的欢迎词
    if (!isLoadingSystemData) {
      newSession.messages[0].content = getWelcomeText(selectedChatKB, knowledgeBases);
    }
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    setInputMessage('');
  };

  const handleSwitchSession = (sessionId) => {
    sessionInputCache.current[currentSessionId] = inputMessage;
    setCurrentSessionId(sessionId);
    setInputMessage(sessionInputCache.current[sessionId] || '');
  };

  const handleRenameSession = (sessionId, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId ? { ...s, title: trimmed, updatedAt: new Date().toISOString() } : s
      )
    );
  };

  const handleDeleteSession = (sessionId) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      if (sessionId === currentSessionId && filtered.length > 0) {
        setTimeout(() => setCurrentSessionId(filtered[0].id), 0);
      }
      return filtered;
    });
  };

  const handleExportSession = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;
    const text = session.messages
      .map(msg => `${msg.role === 'user' ? '【用户】' : '【AI】'}\n${msg.content}\n`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title || '对话记录'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefreshContext = () => {
    updateCurrentSessionMessages(() => [
      {
        id: generateId(),
        role: 'assistant',
        content: '上下文已清空，有什么新的问题需要我帮助解答吗？',
        timestamp: new Date().toLocaleTimeString(),
        favorite: false,
      }
    ]);
  };

  const handleRegenerate = async () => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;
    const msgs = session.messages;
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIndex = i; break; }
    }
    if (lastUserIndex === -1) return;
    const questionText = msgs[lastUserIndex].content;
    updateCurrentSessionMessages(() => msgs.slice(0, lastUserIndex + 1));
    setIsLoading(true);
    await executeChatStream(questionText);
  };

  const handleToggleFavorite = (messageId) => {
    updateCurrentSessionMessages(msgs =>
      msgs.map(msg => msg.id === messageId ? { ...msg, favorite: !msg.favorite } : msg)
    );
  };

  /** 文本选中追问：填入输入框 */
  const handleAskAboutSelection = useCallback((text) => {
    setInputMessage(text);
  }, []);

  /** 快捷提问：直接发送问题 */
  const handleSendQuickQuestion = useCallback((questionText) => {
    if (!questionText.trim()) return;
    const userMessage = {
      id: generateId(),
      role: 'user',
      content: questionText,
      timestamp: new Date().toLocaleTimeString(),
      favorite: false,
    };
    updateCurrentSessionMessages(msgs => [...msgs, userMessage]);
    setIsLoading(true);
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== currentSessionId) return s;
        const isFirstQuestion = s.messages.filter(m => m.role === 'user').length === 0;
        if (isFirstQuestion) {
          const title = questionText.slice(0, 20) + (questionText.length > 20 ? '...' : '');
          return { ...s, title };
        }
        return s;
      })
    );
    executeChatStream(questionText);
  }, [currentSessionId, updateCurrentSessionMessages, executeChatStream]);

  // ========== 知识库管理 ==========

  const fetchKnowledgeBases = useCallback(async () => {
    setIsKBLoading(true);
    const data = await apiClient.getKnowledgeBases();
    if (data?.knowledge_bases) setKnowledgeBases(data.knowledge_bases);
    setIsKBLoading(false);
  }, []);

  const handleCreateKB = useCallback(async (name) => {
    try {
      const result = await apiClient.createKnowledgeBase(name);
      if (result) await fetchKnowledgeBases();
      return result;
    } catch (e) {
      console.error('创建知识库失败:', e);
      return null;
    }
  }, [fetchKnowledgeBases]);

  const handleDeleteKB = useCallback(async (name) => {
    try {
      const result = await apiClient.deleteKnowledgeBase(name);
      if (result) {
        // 立即从本地状态移除，不依赖网络刷新
        setKnowledgeBases(prev => prev.filter(kb => kb.name !== name));
        if (selectedKBName === name) {
          setSelectedKBName(null);
          setSelectedKBStats(null);
        }
      }
      return result;
    } catch (e) {
      console.error('删除知识库失败:', e);
      return null;
    }
  }, [fetchKnowledgeBases, selectedKBName]);

  const handleSelectKB = useCallback(async (name) => {
    setSelectedKBName(name);
    if (!name) {
      setSelectedKBStats(null);
      return;
    }
    const stats = await apiClient.getKnowledgeBaseStats(name);
    setSelectedKBStats(stats);
  }, []);

  const handleUploadDocument = useCallback(async (name, file) => {
    const result = await apiClient.uploadDocumentToKB(name, file);
    if (result) {
      try {
        const stats = await apiClient.getKnowledgeBaseStats(name);
        setSelectedKBStats(stats);
      } catch (e) {
        console.error('获取知识库统计失败:', e);
      }
      await fetchKnowledgeBases();
    }
    return result;
  }, [fetchKnowledgeBases]);

  const handleTriggerPipeline = useCallback(async (name) => {
    const result = await apiClient.triggerPipeline(name);
    if (result) {
      // 启动全局轮询
      setPipelineRunningKB(name);
      setPipelineStatus({
        step: 'starting',
        message: '正在启动 Pipeline...',
        progress_pct: 0,
        error_detail: null,
        is_running: true,
      });
      // 稍后刷新统计
      setTimeout(async () => {
        try {
          const stats = await apiClient.getKnowledgeBaseStats(name);
          setSelectedKBStats(stats);
        } catch (e) {
          console.error('获取知识库统计失败:', e);
        }
        await fetchKnowledgeBases();
      }, 1000);
    }
    return result;
  }, [fetchKnowledgeBases]);

  const handleDeleteDocument = useCallback(async (kbName, filename) => {
    try {
      const result = await apiClient.deleteDocumentFromKB(kbName, filename);
      if (result) {
        // 刷新统计和知识库列表
        try {
          const stats = await apiClient.getKnowledgeBaseStats(kbName);
          setSelectedKBStats(stats);
        } catch (e) {
          console.error('获取知识库统计失败:', e);
        }
        await fetchKnowledgeBases();
        return true;
      }
      return false;
    } catch (e) {
      console.error('删除文档失败:', e);
      return false;
    }
  }, [fetchKnowledgeBases]);

  // Pipeline 全局轮询（跨 tab 保持进度，放在 fetchKnowledgeBases 后面避免 TDZ）
  useEffect(() => {
    if (!pipelineRunningKB) return;
    const poll = async () => {
      const status = await apiClient.getPipelineStatus(pipelineRunningKB);
      if (status) {
        setPipelineStatus(prev => ({ ...prev, ...status }));
        if (!status.is_running) {
          setPipelineRunningKB(null);
          try {
            const stats = await apiClient.getKnowledgeBaseStats(pipelineRunningKB);
            setSelectedKBStats(stats);
          } catch (e) {
            console.error('获取知识库统计失败:', e);
          }
          await fetchKnowledgeBases();
        }
      }
    };
    poll();
    pipelinePollRef.current = setInterval(poll, 2000);
    return () => {
      if (pipelinePollRef.current) {
        clearInterval(pipelinePollRef.current);
        pipelinePollRef.current = null;
      }
    };
  }, [pipelineRunningKB, fetchKnowledgeBases]);

  // ========== UI 事件处理 ==========

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleToggleSidebar = () => setSidebarOpen(prev => !prev);
  const handleTopKChange = (value) => setTopK(value);
  const handleStrategyChange = (value) => setRetrievalStrategy(value);
  const handleInputChange = (value) => setInputMessage(value);
  const handleChatKBChange = (value) => setSelectedChatKB(value || null);

  // ========== 渲染 ==========

  return (
    <ToastProvider>
      <ThreeColumnLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={handleToggleSidebar}
      knowledgeStats={knowledgeStats}
      systemStatus={systemStatus}
      messages={messages}
      topK={topK}
      onTopKChange={handleTopKChange}
      retrievalStrategy={retrievalStrategy}
      onStrategyChange={handleStrategyChange}
      isLoading={isLoading}
      messagesEndRef={messagesEndRef}
      inputMessage={inputMessage}
      onInputChange={handleInputChange}
      onSend={handleSendMessage}
      isLoadingSystemData={isLoadingSystemData}
      /* 会话管理 */
      sessions={sessions}
      currentSessionId={currentSessionId}
      onCreateSession={handleCreateSession}
      onSwitchSession={handleSwitchSession}
      onRenameSession={handleRenameSession}
      onDeleteSession={handleDeleteSession}
      onExportSession={handleExportSession}
      onRefreshContext={handleRefreshContext}
      onRegenerate={handleRegenerate}
      onToggleFavorite={handleToggleFavorite}
      /* 迭代4: 溯源面板 */
      rightPanelOpen={rightPanelOpen}
      selectedSourceData={selectedSourceData}
      onOpenSourceDetail={handleOpenSourceDetail}
      onCloseRightPanel={handleCloseRightPanel}
      retrievalPhase={retrievalPhase}
      onQuoteForQuestion={handleQuoteForQuestion}
      onFavoriteSnippet={handleFavoriteSnippet}
      onAskAboutSelection={handleAskAboutSelection}
      onSendEmpty={handleSendQuickQuestion}
      suggestedQuestions={suggestedQuestions}
      suggestedQuestionsLoading={suggestedQuestionsLoading}
      /* 迭代5: 知识库管理 */
      knowledgeBases={knowledgeBases}
      selectedKBName={selectedKBName}
      selectedKBStats={selectedKBStats}
      isKBLoading={isKBLoading}
      onCreateKB={handleCreateKB}
      onDeleteKB={handleDeleteKB}
      onSelectKB={handleSelectKB}
      onUploadDocument={handleUploadDocument}
      onTriggerPipeline={handleTriggerPipeline}
      onDeleteDocument={handleDeleteDocument}
      /* Pipeline 全局状态 */
      pipelineRunningKB={pipelineRunningKB}
      pipelineStatus={pipelineStatus}
      onDismissPipelineStatus={handleDismissPipelineStatus}
      /* 问答知识库选择 */
      selectedChatKB={selectedChatKB}
      onChatKBChange={handleChatKBChange}
    />
    </ToastProvider>
  );
};

export default App;
