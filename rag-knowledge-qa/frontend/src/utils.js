/**
 * utils - 通用工具函数
 * 抽取跨组件复用的逻辑，避免代码重复
 */

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 降级方案
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * 下载 PDF 文件
 * @param {string} filename - PDF 文件名
 */
export const downloadPDF = (filename) => {
  const form = document.createElement('form');
  form.method = 'GET';
  form.action = '/api/download-pdf';
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'filename';
  input.value = filename;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};
