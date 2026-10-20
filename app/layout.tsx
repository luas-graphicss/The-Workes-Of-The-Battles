import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'The Battles of the Iron Work',
  description:
    'Um meteoro cai sobre a floresta de Bosque Alto e dele saem visitantes que não são deste mundo. Com o seu robô, explore a cidade em pixel art, enfrente robôs e aliens nos ringues da Liga de Robôs e nas fugas das fábricas com o tablet de combate, e gaste os créditos em peças na Oficina do Cristal.',
  applicationName: 'The Battles of the Iron Work',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#151e1b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`dark bg-background ${geist.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
