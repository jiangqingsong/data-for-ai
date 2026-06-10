/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        // 品牌色体系 — 主色 #1677FF
        brand: {
          50: '#e8f2ff',
          100: '#d1e6ff',
          200: '#a3cdff',
          300: '#75b4ff',
          400: '#479bff',
          500: '#1677FF',
          600: '#125fd1',
          700: '#0e47a3',
          800: '#0a2f75',
          900: '#061747',
        },
        // 文字色
        text: {
          primary: '#1D2129',
          secondary: '#86909C',
        },
        // 表面/背景色
        surface: {
          page: '#F5F7FA',
          white: '#FFFFFF',
        },
        // 分割线/边框色
        border: {
          DEFAULT: '#E5E7EB',
        },
      },
      // 字体字号阶梯
      fontSize: {
        'title': ['18px', { lineHeight: '24px', fontWeight: '700' }],
        'module': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '22px' }],
        'caption': ['12px', { lineHeight: '18px' }],
      },
      // 圆角规则
      borderRadius: {
        'bubble': '12px',
        'element': '8px',
      },
      // 阴影规则
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
