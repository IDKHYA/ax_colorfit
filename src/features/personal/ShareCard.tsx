// 퍼컬 결과 저장용 오프스크린 카드. 화면에는 보이지 않고 html-to-image로 캡처할 때만 쓴다.
// 배경 글로우는 결과 화면에서 이미 뽑힌 heroGlassBackground(같은 시드)를 그대로 받아써서,
// 화면에서 본 색·위치와 저장된 이미지가 항상 일치하게 한다.
import type { RefObject } from 'react';
import type { SeasonDisplayProfile } from './seasonDisplay';
import { pickDiversePaletteColors } from './paletteSample';

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

// React 19부터는 함수 컴포넌트가 ref를 일반 prop으로 받을 수 있어 forwardRef가 필요 없다.
export function ShareCard({ profile, glassBackground, ref }: { profile: SeasonDisplayProfile; glassBackground: string | null; ref?: RefObject<HTMLDivElement | null> }) {
    const titleLines = profile.title.split(String.fromCharCode(10));
    const palette = pickDiversePaletteColors(profile.palette, 8);

    return (
      <div
        ref={ref}
        style={{
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
          position: 'relative',
          overflow: 'hidden',
          background: '#F7F4F2',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'absolute', inset: 64, display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            {/* CSS filter: blur()는 1080x1920 크기에서 html-to-image 래스터라이즈를 심하게 느리게(사실상 멈춘 것처럼) 만들어서,
                blur 대신 그라디언트 자체의 부드러운 페이드(관대한 reach%)로만 은은한 느낌을 낸다. */}
            {glassBackground && (
              <div
                style={{
                  position: 'absolute',
                  inset: -60,
                  borderRadius: 140,
                  background: glassBackground,
                }}
              />
            )}
            <div
              style={{
                position: 'relative',
                height: '100%',
                background: 'rgba(255,255,255,.74)',
                border: '2px solid rgba(255,255,255,.92)',
                borderRadius: 64,
                padding: 64,
                boxShadow: '0 40px 100px rgba(50,40,45,.12)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#6B7077' }}>CF</div>
                  <span style={{ fontSize: 44, fontWeight: 700, color: '#2C2C2A' }}>ColorFit</span>
                </div>
                <span style={{ fontSize: 34, fontWeight: 700, padding: '10px 30px', borderRadius: 999, background: 'rgba(255,255,255,.9)', color: '#2C2C2A' }}>{profile.code}</span>
              </div>

              <div style={{ marginTop: 52 }}>
                <div style={{ fontSize: 30, letterSpacing: '.08em', color: '#8C6572', fontWeight: 700 }}>PERSONAL COLOR RESULT</div>
                <div style={{ fontSize: 38, color: '#2C2C2A', marginTop: 10 }}>{profile.ko}</div>
                <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.05, color: '#2C2C2A', marginTop: 16 }}>
                  {titleLines[0]}<br />{titleLines[1]}
                </div>
              </div>

              <p style={{ fontSize: 38, lineHeight: 1.6, color: '#2C2C2A', opacity: 0.85, margin: '36px 0 0' }}>
                {profile.description}
              </p>

              <div style={{ display: 'flex', gap: 20, marginTop: 36, flexWrap: 'wrap' }}>
                {profile.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 32, fontWeight: 700, padding: '12px 28px', borderRadius: 999, background: '#F3EDEB', color: '#2C2C2A' }}>{tag}</span>
                ))}
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ borderTop: '2px solid rgba(60,50,45,.14)', paddingTop: 44 }}>
                <div style={{ fontSize: 32, color: '#3f3a38', marginBottom: 28 }}>이 시즌의 대표 팔레트</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }}>
                  {palette.map((hex, index) => (
                    <i key={hex + '-' + index} style={{ display: 'block', aspectRatio: '1', borderRadius: 32, background: hex, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.7)' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 30, color: '#8a847f', marginTop: 40 }}>colorfit.app</div>
        </div>
      </div>
    );
}
