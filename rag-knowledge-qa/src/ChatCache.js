/**
 * 聊天缓存管理
 * 优化前端加载性能
 */
class ChatCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 3600000; // 1小时缓存
        this.maxSize = 100; // 最大缓存数量
    }

    /**
     * 生成缓存键
     */
    generateCacheKey(question, top_k, search_type) {
        return `${question}:${top_k}:${search_type}`;
    }

    /**
     * 获取缓存
     */
    get(question, top_k, search_type) {
        const key = this.generateCacheKey(question, top_k, search_type);
        const item = this.cache.get(key);

        if (!item) return null;

        // 检查是否过期
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    /**
     * 设置缓存
     */
    set(question, top_k, search_type, data) {
        const key = this.generateCacheKey(question, top_k, search_type);

        // 限制缓存大小
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * 清理所有缓存
     */
    clear() {
        this.cache.clear();
    }

    /**
     * 获取缓存统计
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl
        };
    }
}

// 创建单例
const chatCache = new ChatCache();

export default chatCache;
