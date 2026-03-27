import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'crypee Agent — AI 사업 운영 도구'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#09090B', color: '#F4F4F5', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', width: '64px', height: '64px', gap: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(0,212,170,0.3)' }} />
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(0,212,170,0.5)' }} />
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(0,212,170,0.7)' }} />
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#00D4AA' }} />
          </div>
        </div>
        <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px', display: 'flex' }}>
          <span>crypee</span>
          <span style={{ color: '#00D4AA', marginLeft: '12px' }}>Agent</span>
        </div>
        <div style={{ fontSize: '24px', color: '#A1A1AA', marginBottom: '32px' }}>
          AI 사업 운영 도구
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '16px', color: '#63636E' }}>
          <span>📋 사업계획서</span>
          <span>·</span>
          <span>📝 계약서</span>
          <span>·</span>
          <span>📢 마케팅</span>
          <span>·</span>
          <span>🔍 분석</span>
          <span>·</span>
          <span>🔔 자동화</span>
        </div>
        <div style={{ position: 'absolute', bottom: '32px', fontSize: '14px', color: '#63636E' }}>
          www.crypee.biz
        </div>
      </div>
    ),
    { ...size }
  )
}
