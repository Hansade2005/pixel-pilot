import type { Metadata } from 'next'
// import { Poppins } from 'next/font/google'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerProvider } from "@/components/service-worker-provider"
import { OneSignalProvider } from "@/components/onesignal-provider"

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
  applicationName: 'PiPilot',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://pipilot.dev'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PiPilot',
  },
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
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PiPilot" />
        <meta name="theme-color" content="#6366f1" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        {/* OneSignal SDK */}
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.OneSignalDeferred = window.OneSignalDeferred || [];
              OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.init({
                  appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '074baec0-7042-4faf-a337-674711dd90ad'}",
                });
              });
            `,
          }}
        />
        {/* Tawk.to Live Chat */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/696f56620938061981966d61/1jfdeist0';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        />
      </head>
      <body className="dark:bg-gray-900 dark:text-white font-sans">
        <ServiceWorkerProvider />
        <OneSignalProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
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
