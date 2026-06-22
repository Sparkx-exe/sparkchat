import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'bg-chat': 'var(--bg-chat)',
        'bg-bubble-out': 'var(--bg-bubble-out)',
        'bg-bubble-in': 'var(--bg-bubble-in)',
        'bg-hover': 'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        'bg-input': 'var(--bg-input)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-overlay': 'var(--bg-overlay)',
        'bg-tooltip': 'var(--bg-tooltip)',
        
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-placeholder': 'var(--text-placeholder)',
        'text-link': 'var(--text-link)',
        'text-accent': 'var(--text-accent)',
        'text-bubble-out': 'var(--text-bubble-out)',
        'text-bubble-in': 'var(--text-bubble-in)',
        'text-timestamp': 'var(--text-timestamp)',
        'text-system': 'var(--text-system)',
        'text-tooltip': 'var(--text-tooltip)',

        'accent': 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-pressed': 'var(--accent-pressed)',
        'accent-light': 'var(--accent-light)',
        
        'danger': 'var(--danger)',
        'danger-hover': 'var(--danger-hover)',
        'warning': 'var(--warning)',
        'success': 'var(--success)',

        'border-color': 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        'divider': 'var(--divider)',

        'check-single': 'var(--check-single)',
        'check-double': 'var(--check-double)',
        'check-read': 'var(--check-read)',
      },
      borderRadius: {
        'bubble-out': 'var(--radius-bubble-out)',
        'bubble-in': 'var(--radius-bubble-in)',
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      spacing: {
        'sidebar-w': 'var(--sidebar-width)',
        'right-panel-w': 'var(--right-panel-width)',
        'chat-max-w': 'var(--chat-max-width)',
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      fontSize: {
        '2xs': 'var(--text-2xs)',
        'xs': 'var(--text-xs)',
        'sm': 'var(--text-sm)',
        'base': 'var(--text-base)',
        'md': 'var(--text-md)',
        'lg': 'var(--text-lg)',
        'xl': 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
      },
    },
  },
  plugins: [],
};
export default config;
