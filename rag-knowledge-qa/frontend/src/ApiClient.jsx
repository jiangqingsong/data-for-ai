import chatCache from './ChatCache';

const DEFAULT_TIMEOUT = 30000; // 30秒超时
const DEFAULT_RETRIES = 1; // 重试次数
const API_BASE_URL = '/api';

class ApiClient {
    constructor(timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES) {
        this.timeout = timeout;
        this.retries = retries;
    }

    /**
     * 带超时的 fetch
     */
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请稍后重试');
            }
            throw error;
        }
    }

    /**
     * 带重试的请求
     */
    async requestWithRetry(url, options = {}) {
        let lastError;

        for (let i = 0; i <= this.retries; i++) {
            try {
                const response = await this.fetchWithTimeout(url, options);

                if (response.status === 429) {
                    // 限流，等待后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
                    continue;
                }

                return response;
            } catch (error) {
                lastError = error;
                if (i < this.retries) {
                    await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
                }
            }
        }

        throw lastError;
    }

    /**
     * 通用 API 请求
     */
    async request(method, endpoint, data = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await this.requestWithRetry(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
                } catch {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            return await response.json();
        } catch (error) {
            console.error(`API 请求失败 ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * 聊天请求
     */
    async chat(question, top_k = 4, search_type = 'similarity') {
        // 先检查缓存
        const cachedResult = chatCache.get(question, top_k, search_type);
        if (cachedResult) {
            console.log('使用缓存结果');
            return cachedResult;
        }

        try {
            const result = await this.request('POST', '/chat', {
                question,
                top_k,
                search_type
            });

            // 缓存结果
            chatCache.set(question, top_k, search_type, result);

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 流式聊天请求
     * @param {string} question - 用户问题
     * @param {number} top_k - 检索数量
     * @param {string} search_type - 检索策略
     * @param {function} onChunk - 块接收回调
     * @param {function} onComplete - 完成回调
     * @param {function} onError - 错误回调
     */
    async chatStream(question, top_k = 4, search_type = 'similarity', onChunk, onComplete, onError) {
        try {
            // 先检查缓存
            const cachedResult = chatCache.get(question, top_k, search_type);
            if (cachedResult) {
                console.log('使用缓存结果进行流式模拟');

                // 模拟流式输出
                const answer = cachedResult.answer;
                let currentText = '';
                let index = 0;
                const speed = 20; // 每个字符的延迟时间(ms)

                const simulateStream = () => {
                    if (index < answer.length) {
                        // 每次添加一个字符
                        currentText += answer[index];
                        index++;

                        // 触发回调
                        onChunk(currentText, { isFinal: false });

                        // 继续下一个字符
                        setTimeout(simulateStream, speed);
                    } else {
                        // 完成
                        onChunk(currentText, { isFinal: true });
                        onComplete({ ...cachedResult, answer: currentText });
                    }
                };

                // 开始模拟
                simulateStream();
                return;
            }

            // 如果没有缓存，使用普通请求然后模拟流
            const result = await this.chat(question, top_k, search_type);
            const answer = result.answer;
            let currentText = '';
            let index = 0;
            const speed = 20;

            const simulateStream = () => {
                if (index < answer.length) {
                    currentText += answer[index];
                    index++;
                    onChunk(currentText, { isFinal: false });
                    setTimeout(simulateStream, speed);
                } else {
                    onChunk(currentText, { isFinal: true });
                    onComplete(result);
                }
            };

            simulateStream();
        } catch (error) {
            onError(error);
            throw error;
        }
    }

    /**
     * 获取系统状态
     */
    async getSystemStatus() {
        try {
            return await this.request('GET', '/system/status');
        } catch (error) {
            console.error('获取系统状态失败:', error);
            return null;
        }
    }

    /**
     * 获取知识库统计
     */
    async getKnowledgeStats() {
        try {
            return await this.request('GET', '/knowledge/stats');
        } catch (error) {
            console.error('获取知识库统计失败:', error);
            return null;
        }
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            return await this.request('GET', '/health');
        } catch (error) {
            console.error('健康检查失败:', error);
            return null;
        }
    }
}

// 创建单例
const apiClient = new ApiClient();

export default apiClient;