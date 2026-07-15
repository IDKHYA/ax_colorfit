// 선택한 의류 색상을 LCh 스펙트럼과 리퀴드 오브로 보여주는 공용 팝업입니다.
import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Palette, X } from 'lucide-react';
import type { ColorInsight } from '../../services/colorInsight';

type InsightStyle = CSSProperties & {
  '--insight-color': string;
  '--insight-rgb': string;
};

export function ColorInsightModal({
  insight,
  itemName,
  dominantHexes,
  activeHex = insight.input.hex,
  onSelectHex,
  onClose,
}: {
  insight: ColorInsight;
  itemName: string;
  dominantHexes: string[];
  activeHex?: string;
  onSelectHex?: (hex: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const regionStyle = spectrumRegionStyle(insight);
  const markerStyle = {
    left: insight.spectrum.marker.chromaPercent + '%',
    top: (100 - insight.spectrum.marker.lightnessPercent) + '%',
    backgroundColor: insight.input.hex,
  };
  const nearestMarkerStyle = {
    left: insight.spectrum.nearestMarker.chromaPercent + '%',
    top: (100 - insight.spectrum.nearestMarker.lightnessPercent) + '%',
    backgroundColor: insight.nearestPalette.hex,
  };
  const spectrumBackgroundStyle = { background: spectrumBackground(insight.spectrum.gradientHslHue) };
  const modalStyle: InsightStyle = {
    '--insight-color': insight.input.hex,
    '--insight-rgb': insight.rgb.join(', '),
  };

  return (
    <div className="color-insight-overlay" role="presentation" style={modalStyle} onClick={onClose}>
      <section className="color-insight-modal" role="dialog" aria-modal="true" aria-label="색상 분석" onClick={(event) => event.stopPropagation()}>
        <div className="color-insight-shell">
          <header className="color-insight-head">
            <div className="color-insight-heading">
              <div className="color-insight-kicker-row">
                <span className="color-source-chip">{insight.sourceLabel}</span>
                <span className="season-code">{insight.fit.label.replace(' 적합도', '')}</span>
              </div>
              <h2>색상 분석</h2>
              <p>{itemName}의 대표색과 보조색을 같은 기준에서 비교합니다.</p>
            </div>
            <button className="button icon-only color-insight-close" type="button" onClick={onClose} aria-label="색상 분석 닫기"><X className="icon" /></button>
          </header>

          <div className="color-insight-grid">
            <div className="color-preview-panel">
              <section className="color-orb-stage">
                <div className="liquid-color-orb" aria-label={'선택 색상 ' + insight.input.hex} />
                <div className="color-orb-copy"><strong>{insight.input.hex}</strong><span>{insight.toneTags.join(' · ')}</span></div>
              </section>

              <section className="color-companion-card">
                <div className="color-panel-label"><span>대표색과 보조색</span><small>색을 눌러 비교</small></div>
                <div className="color-companion-list">
                  {dominantHexes.map((hex, index) => (
                    <button
                      className={activeHex.toUpperCase() === hex.toUpperCase() ? 'color-companion active' : 'color-companion'}
                      type="button"
                      key={hex + '-' + index}
                      disabled={!onSelectHex}
                      onClick={() => onSelectHex?.(hex)}
                      aria-label={hex + ' 색상 분석 보기'}
                    >
                      <i className="color-companion-swatch" style={{ backgroundColor: hex }} />
                      <span>{index === 0 ? '대표 ' : '보조 '}{hex}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="color-data-panel">
              <div className="color-metric-grid">
                <span className="color-metric-card"><small>HEX</small><strong>{insight.input.hex}</strong></span>
                <span className="color-metric-card"><small>{insight.fit.label}</small><strong>{insight.fit.score}점</strong></span>
                <span className="color-metric-card"><small>CIEDE2000</small><strong>ΔE {insight.nearestPalette.deltaE}</strong></span>
                <span className="color-metric-card"><small>LCh</small><strong>L {insight.lch.L} · C {insight.lch.C} · h {insight.lch.h}°</strong></span>
              </div>

              <section className="color-spectrum-card">
                <div className="color-panel-label"><span>LCh 스펙트럼</span><small>세로 명도 · 가로 채도 · h {insight.lch.h}°</small></div>
                <div className="insight-spectrum lch-spectrum" aria-label="LCh 스펙트럼" style={spectrumBackgroundStyle}>
                  <span className="spectrum-region" style={regionStyle}><em>시즌 영역</em></span>
                  <span className="spectrum-nearest" style={nearestMarkerStyle} title={'최근접 팔레트 ' + insight.nearestPalette.hex} />
                  <span className="spectrum-point insight-spectrum-marker" style={markerStyle} title={'현재 색 ' + insight.input.hex} />
                  <span className="spectrum-axis-y is-top">고명도</span>
                  <span className="spectrum-axis-y is-bottom">저명도</span>
                </div>
                <div className="spectrum-axis-row"><span>저채도</span><span>고채도</span></div>
                <div className="spectrum-legend">
                  <span><i className="legend-point" style={{ backgroundColor: insight.input.hex }} /> 현재 색</span>
                  <span><i className="legend-nearest" style={{ backgroundColor: insight.nearestPalette.hex }} /> 최근접 팔레트</span>
                  <span><i className="legend-region" /> 시즌 영역</span>
                </div>
              </section>

              <section className="color-guidance-card">
                <div className="color-guidance-main">
                  <span className="color-guidance-icon"><Palette className="icon" /></span>
                  <div><strong>HEX → CIELAB/LCh</strong><p>RGB {insight.rgb.join(', ')}를 Lab L {insight.lab.L}, a {insight.lab.a}, b {insight.lab.b}로 변환했습니다.</p></div>
                </div>
              </section>
              <section className="color-guidance-card">
                <div className="color-guidance-main">
                  <span className="color-guidance-icon"><Palette className="icon" /></span>
                  <div><strong>CIEDE2000</strong><p>가장 가까운 팔레트는 {insight.nearestPalette.hex}이며 ΔE {insight.nearestPalette.deltaE}입니다. 회피색 근접 감점은 {insight.avoid.penalty}점입니다.</p></div>
                </div>
              </section>
              <section className="color-guidance-card">
                <div className="color-guidance-main">
                  <span className="color-guidance-icon"><Palette className="icon" /></span>
                  <div><strong>색채이론 · {insight.colorTheory.harmonyLabel}</strong><p>{insight.colorTheory.note}</p></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function spectrumBackground(gradientHslHue: number | null): string {
  const lightnessOverlay =
    'linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0) 42%, rgba(0, 0, 0, 0) 58%, rgba(10, 14, 22, 0.88) 100%)';
  const chromaRamp =
    gradientHslHue == null
      ? 'linear-gradient(90deg, #b9bcc2 0%, #86898f 100%)'
      : 'linear-gradient(90deg, hsl(' + gradientHslHue + ', 6%, 62%) 0%, hsl(' + gradientHslHue + ', 55%, 56%) 45%, hsl(' + gradientHslHue + ', 96%, 50%) 100%)';
  return lightnessOverlay + ', ' + chromaRamp;
}

function spectrumRegionStyle(insight: ColorInsight) {
  const [lMin, lMax] = insight.spectrum.region.lRange;
  const [cMin, cMax] = insight.spectrum.region.cRange;
  const left = clampPercent((cMin / 110) * 100);
  const right = clampPercent((cMax / 110) * 100);
  const top = 100 - clampPercent(lMax);
  const bottom = 100 - clampPercent(lMin);
  return {
    left: left + '%',
    width: Math.max(8, right - left) + '%',
    top: top + '%',
    height: Math.max(8, bottom - top) + '%',
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
