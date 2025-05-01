import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'OSCE 虛擬病人對話系統',
  description: '練習和提高護理對話技能，為 OSCE 考試做好準備',

}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var savedMode = localStorage.getItem('darkMode');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var shouldUseDarkMode = savedMode === 'true' || (savedMode === null && prefersDark);
                
                if (shouldUseDarkMode) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {
                console.error('無法設置初始主題', e);
              }
            })();
          `
        }} />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
} 