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
  title: 'PiPilot - Canada\'s First Agentic Vibe Coding Platform | AI App Builder',
  description: 'Discover PiPilot, Canada\'s pioneering Agentic Vibe Coding Platform. Build apps faster with AI - the ultimate alternative to Lovable.dev, Bolt.new, v0, and Replit. Chat to code, deploy instantly.',
  keywords: ['PiPilot', 'AI coding platform Canada', 'agentic vibe coding', 'AI app builder 2025', 'vibe coding tools', 'chat to code', 'Canadian AI development', 'first agentic coding platform', 'Lovable alternative', 'Bolt.new competitor', 'v0 replacement', 'Replit better', 'AI-powered app development', 'no-code AI builder', 'Canadian tech innovation'],
  authors: [{ name: 'PiPilot Team' }],
  creator: 'PiPilot',
  publisher: 'Anye Happiness Ade',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://pipilot.dev'),
  openGraph: {
    title: 'PiPilot - Canada\'s First Agentic Vibe Coding Platform',
    description: 'Build apps 10x faster with Canada\'s leading AI coding platform. Agentic Vibe Coding - the future of development. Superior to Lovable, Bolt, v0, and Replit.',
    url: 'https://pipilot.dev',
    siteName: 'PiPilot',
    type: 'website',
    locale: 'en_CA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PiPilot - Canada\'s #1 Agentic Vibe Coding Platform',
    description: 'Experience the power of agentic AI coding. Canada\'s first and best alternative to global platforms like Lovable.dev, Bolt.new, v0, and Replit.',
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
  alternates: {
    canonical: 'https://pipilot.dev',
  },
  category: 'Technology',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
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
