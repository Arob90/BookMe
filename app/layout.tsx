import type { Metadata } from 'next'
import { Inter, Space_Grotesk, Fraunces, Beau_Rivage } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})
// Editorial serif for the marketing site headlines.
const serif = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})
// Flowing handwritten signature style, used for sign-offs like "SaSo & Co. Ltd."
const signature = Beau_Rivage({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-signature',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://bookme.bz'),
  title: {
    default: 'BookMe — Online Booking & Client CRM for Service Businesses in Belize',
    template: '%s · BookMe',
  },
  description:
    'BookMe is the all-in-one online booking, client CRM, payments, loyalty and analytics app for service businesses in Belize. Let clients book 24/7. Start free for 14 days — no card required.',
  keywords: [
    'booking app Belize', 'online appointment scheduling Belize', 'salon booking software',
    'spa booking system', 'barber appointment app', 'client CRM', 'online booking Belize',
    'service business software', 'BookMe', 'appointment app', 'loyalty and scheduling',
  ],
  applicationName: 'BookMe',
  authors: [{ name: 'SaSo Pixel Studio' }],
  creator: 'SaSo Pixel Studio',
  publisher: 'BookMe',
  category: 'business',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bookme.bz',
    siteName: 'BookMe',
    title: 'BookMe — Online Booking & Client CRM for Service Businesses',
    description:
      'Take online bookings 24/7. Clients, payments, loyalty and analytics in one beautiful app. Free for 14 days.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BookMe — Online Booking & Client CRM',
    description: 'Online booking, CRM, payments and loyalty for service businesses in Belize.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${serif.variable} ${signature.variable}`}>
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://bookme.bz/#organization',
                  name: 'BookMe',
                  url: 'https://bookme.bz',
                  email: 'sasoandco.ltd@gmail.com',
                  areaServed: 'BZ',
                  description:
                    'Online booking, client CRM, payments, loyalty and analytics for service businesses in Belize.',
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://bookme.bz/#website',
                  url: 'https://bookme.bz',
                  name: 'BookMe',
                  publisher: { '@id': 'https://bookme.bz/#organization' },
                  inLanguage: 'en',
                },
                {
                  '@type': 'SoftwareApplication',
                  name: 'BookMe',
                  applicationCategory: 'BusinessApplication',
                  operatingSystem: 'Web',
                  offers: {
                    '@type': 'Offer',
                    price: '45',
                    priceCurrency: 'BZD',
                    description: 'Plans from $45 BZD/mo. 14-day free trial.',
                  },
                  description:
                    'All-in-one online booking, client CRM, payments, loyalty and analytics for service businesses.',
                },
              ],
            }),
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
