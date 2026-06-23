import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'BookMe — Online booking & client CRM for service businesses'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          background: '#7c3aed',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 700, opacity: 0.92 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.2)',
              marginRight: 20,
              display: 'flex',
            }}
          />
          BookMe
        </div>
        <div style={{ fontSize: 78, fontWeight: 800, marginTop: 26, lineHeight: 1.05 }}>
          The simplest way to run your bookings.
        </div>
        <div style={{ fontSize: 34, opacity: 0.85, marginTop: 30 }}>
          Online booking · CRM · payments · loyalty — for service businesses in Belize.
        </div>
      </div>
    ),
    size
  )
}
