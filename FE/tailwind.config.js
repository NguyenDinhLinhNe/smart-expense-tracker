module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          main: '#090d16',
          card: '#101622',
          glass: 'rgba(16, 22, 34, 0.65)',
          glassHover: 'rgba(26, 34, 52, 0.8)',
          border: 'rgba(255, 255, 255, 0.07)',
          borderFocus: 'rgba(6, 182, 212, 0.4)',
        },
        cyan: {
          premium: '#06b6d4',
          glow: 'rgba(6, 182, 212, 0.3)',
        },
        purple: {
          premium: '#8b5cf6',
          glow: 'rgba(139, 92, 246, 0.3)',
        },
        teal: {
          premium: '#14b8a6',
        },
        emerald: {
          premium: '#10b981',
          glow: 'rgba(16, 185, 129, 0.15)',
        },
        rose: {
          premium: '#f43f5e',
          glow: 'rgba(244, 63, 94, 0.15)',
        },
        amber: {
          premium: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.15)',
        }
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 12px rgba(6, 182, 212, 0.3)',
        'rose-glow': '0 0 12px rgba(244, 63, 94, 0.3)',
      }
    },
  },
  plugins: [],
}