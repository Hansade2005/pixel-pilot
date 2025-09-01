import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: 'Pixel Pilot - Plan, build & ship',
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
  metadataBase: new URL('https://pixelpilot.dev'),
  openGraph: {
    title: 'Pixel Pilot - AI-Powered App Development',
    description: 'Plan, build & ship faster with AI-powered app development. Create webapps by chatting with AI.',
    url: 'https://pixelpilot.dev',
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
            --font-sans: ${GeistSans.variable};
            --font-mono: ${GeistMono.variable};
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
