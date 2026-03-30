import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono'
});

export const metadata: Metadata = {
  title: 'WallWise | AI-Powered Floor Plan Intelligence',
  description: 'Upload a floor plan. Get a 3D model, material recommendations, and structural analysis — instantly. Autonomous Structural Intelligence System.',
  generator: 'v0.app',
  keywords: ['floor plan', 'AI', 'structural analysis', '3D model', 'architecture', 'construction'],
  authors: [{ name: 'Team WallWise' }],
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased bg-[#0a0a0f] text-[#e8e6de]`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
