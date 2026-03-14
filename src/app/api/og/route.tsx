import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020617', // Ultra premium dark slate
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Futuristic Glowing Ambient Orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '800px',
            height: '800px',
            backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '800px',
            height: '800px',
            backgroundImage: 'radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Central Brand */}
        <h1 style={{ fontSize: '90px', fontWeight: '900', color: 'white', marginBottom: '20px', letterSpacing: '-0.05em' }}>
          Gecko<span style={{ color: '#10b981' }}>RMS</span>
        </h1>
        
        <p style={{ fontSize: '42px', color: '#94a3b8', fontWeight: '600', textAlign: 'center', maxWidth: '900px', lineHeight: '1.4', margin: 0 }}>
          The Intelligent Operating System <br/> for Modern Restaurants.
        </p>

        {/* Premium Feature Badges */}
        <div style={{ display: 'flex', gap: '30px', marginTop: '70px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 36px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', border: '2px solid rgba(16,185,129,0.3)' }}>
            <span style={{ fontSize: '28px', color: '#10b981', fontWeight: 'bold' }}>⚡ 0-Lag Engine</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 36px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', border: '2px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '28px', color: 'white', fontWeight: 'bold' }}>🔥 Cloud KDS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 36px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', border: '2px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '28px', color: 'white', fontWeight: 'bold' }}>📱 Smart POS</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}