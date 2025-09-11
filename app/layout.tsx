import type { Metadata } from 'next'
// import { Poppins } from 'next/font/google'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ThemeProvider } from "@/components/theme-provider"

// const poppins = Poppins({
//   subsets: ['latin'],
//   weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
//   variable: '--font-poppins',
//   display: 'swap',
// })

export const metadata: Metadata = {
  title: 'Pixel Pilot - Plan, build & ship faster with AI',
  description: 'Plan, build & ship faster with Pixel Pilot. Create webapps by chatting with AI.',
  keywords: ['AI', 'app development',"mobile development","Canadian Vibe Coding Agent", 'web development', 'chat to code', 'pixel pilot'],
  authors: [{ name: 'Pixel Pilot' }],
  creator: 'Pixel Pilot',
  publisher: 'Anye Happiness Ade',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://pipilot.dev'),
  openGraph: {
    title: 'Pixel Pilot - AI-Powered App Development',
    description: 'Plan, build & ship faster with AI-powered app development. Create webapps by chatting with AI.',
    url: 'https://pipilot.dev',
    siteName: 'Pixel Pilot',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pixel Pilot - AI-Powered App Development',
    description: 'Plan, build & ship faster with AI-powered app development. Create webapps by chatting with AI.',
    creator: '@anyehappinessade',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <style>{`
          :root {
            --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
            --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
          }
        `}</style>
      </head>
      <body className="dark:bg-gray-900 dark:text-white font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ToastContainer 
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
