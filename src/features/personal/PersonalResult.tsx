// 퍼스널컬러 결과를 12계절 스펙트럼으로 보여주고 이전 진단 이력을 관리합니다.
import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Shirt } from 'lucide-react';
import { Chip, ColorTileGrid, PanelTitle } from '../../components/common';
import { SEASON_DETAILS } from '../../seasonContent';
import type { FinalResult, SeasonId } from '../../types';
import type { PersonalColorRecord } from '../../wardrobeTypes';
import { SEASON_LABELS } from '../../wardrobeConstants';
import { SEASON_DISPLAY } from './seasonDisplay';
import { buildSeasonGlassBackground } from './seasonGlass';
import { pickDiversePaletteColors } from './paletteSample';

const SEASON_FAMILIES: Array<{ title: string; color: string; ids: SeasonId[] }> = [
  { title: 'SPRING · WARM/CLEAR', color: '#FF9C64', ids: ['light-spring', 'true-spring', 'bright-spring'] },
  { title: 'SUMMER · COOL/MUTED', color: '#A892CF', ids: ['light-summer', 'true-summer', 'soft-summer'] },
  { title: 'AUTUMN · WARM/MUTED', color: '#8A7C4E', ids: ['soft-autumn', 'true-autumn', 'dark-autumn'] },
  { title: 'WINTER · COOL/CLEAR', color: '#2E65B5', ids: ['dark-winter', 'true-winter', 'bright-winter'] },
];

const AXES = [
  { key: 'temperature', label: '온도', low: 'COOL', high: 'WARM', gradient: 'linear-gradient(90deg,#8db4df,#d8d8d4 48%,#f0bd77)' },
  { key: 'lightness', label: '명도', low: 'DEEP', high: 'LIGHT', gradient: 'linear-gradient(90deg,#313743,#aab0b5 48%,#fff8e9)' },
  { key: 'clarity', label: '선명도', low: 'MUTED', high: 'CLEAR', gradient: 'linear-gradient(90deg,#92969b,#c6c5ba 48%,#ff896c)' },
  { key: 'contrast', label: '대비', low: 'LOW', high: 'HIGH', gradient: 'linear-gradient(90deg,#d9d9d5,#a7a5a0 48%,#20242b)' },
] as const;

function axisPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round((value + 1) * 50)));
}

function axisValue(label: string, value: number) {
  const direction = value >= 0 ? {
    온도: '웜',
    명도: '라이트',
    선명도: '클리어',
    대비: '고대비',
  }[label] : {
    온도: '쿨',
    명도: '딥',
    선명도: '뮤트',
    대비: '저대비',
  }[label];
  return direction + ' ' + Math.round(Math.abs(value) * 100);
}

function UsageCard({ title, body, colors }: { title: string; body: string; colors: string[] }) {
  return (
    <article className="usage-card">
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="usage-swatches">{colors.map((hex, index) => <i className="usage-swatch" key={hex + '-' + index} style={{ backgroundColor: hex }} title={hex} />)}</div>
    </article>
  );
}

export function PersonalResult({
  result,
  onRetry,
  onOpenWardrobe,
}: {
  result: FinalResult;
  onRetry: () => void;
  onOpenWardrobe?: () => void;
}) {
  const [previewSeasonId, setPreviewSeasonId] = useState<SeasonId>(result.seasonTop1Id);

  useEffect(() => {
    setPreviewSeasonId(result.seasonTop1Id);
  }, [result.seasonTop1Id]);

  // 화면에 들어올 때마다 새 배치를 뽑기 위한 시드(마운트당 고정). 미리보기 시즌이 바뀌면 그 시즌 색으로 갱신된다.
  const glassSeed = useMemo(() => Math.floor(Math.random() * 1e9), []);
  const heroGlassBackground = useMemo(
    () => buildSeasonGlassBackground(previewSeasonId, glassSeed),
    [previewSeasonId, glassSeed],
  );

  const profile = SEASON_DISPLAY[previewSeasonId];
  const actualProfile = SEASON_DISPLAY[result.seasonTop1Id];
  const titleLines = profile.title.split(String.fromCharCode(10));
  const observed = [
    { key: 'Skin', label: '피부', color: result.extractedColors.skin },
    { key: 'Hair', label: '헤어', color: result.extractedColors.hair },
    { key: 'Eyes', label: '눈동자', color: result.extractedColors.eyes },
    { key: 'Lips', label: '입술', color: result.extractedColors.lips },
  ];

  return (
    <section className="personal-result-page colorfit-personal-result">
      <div className="page-head">
        <div className="page-head-copy">
          <span className="page-kicker">Step 3 of 3</span>
          <h1>나의 퍼스널컬러</h1>
          <p>한 개의 이름보다 잘 받는 색의 범위와 네 가지 축을 함께 확인합니다.</p>
        </div>
        <div className="result-hero-actions">
          <button className="button secondary" type="button" onClick={onRetry}><RotateCcw className="icon" />다시 측정</button>
          {onOpenWardrobe && <button className="button primary" type="button" onClick={onOpenWardrobe}><Shirt className="icon" />옷장에 적용</button>}
        </div>
      </div>

      <div className="result-liquid-layout">
        <section className="glass-panel liquid-result-hero">
          <div className="hero-liquid-layer" style={heroGlassBackground ? { background: heroGlassBackground } : undefined} />
          <div className="result-hero-head">
            <div className="result-brand"><img className="result-brand-mark" src="/icons/colorfit-mark.png" alt="" aria-hidden="true" /><span>ColorFit</span></div>
            <span className="season-code">{profile.code}</span>
          </div>

          <div className="result-hero-copy">
            <span className="page-kicker">12 Season Spectrum · Personal Color ID</span>
            <span className="season-ko">{profile.ko}{previewSeasonId !== result.seasonTop1Id && <small> · 비교 미리보기</small>}</span>
            <h2>{titleLines[0]}<br />{titleLines[1]}</h2>
            <p>{profile.description}</p>
            <div className="season-tags">{profile.tags.map((tag) => <span className="season-tag" key={tag}>{tag}</span>)}</div>
          </div>

          <div className="palette-glass">
            <div className="palette-head">
              <div><strong>Core spectrum</strong><small>진단 시즌의 24색 기준 팔레트</small></div>
              <span className="confidence-badge">신뢰도 {Math.round(result.confidence * 100)}%</span>
            </div>
            <div className="liquid-palette" aria-label={profile.ko + ' 색상 팔레트'}>
              {profile.palette.map((hex, index) => <i className="palette-swatch" key={hex + '-' + index} style={{ backgroundColor: hex }} title={hex} />)}
            </div>
            <div className="spectrum-glass">
              <div className="spectrum-track-v3"><i className="spectrum-marker" style={{ left: profile.marker + '%', backgroundColor: profile.palette[21] }} /></div>
              <div className="spectrum-labels"><span>WARM RED</span><span>GREEN · BLUE</span><span>VIOLET</span></div>
            </div>
          </div>
        </section>

        <aside className="result-insight-stack">
          <section className="panel">
            <div className="result-score-head"><div><h2>관찰 색상</h2><small>사진 ROI와 설문 융합</small></div><span className="confidence-badge">PHOTO + Q</span></div>
            <div className="analysis-glass-grid">
              {observed.map((item) => (
                <div className="analysis-glass-cell" key={item.key}>
                  <span className="analysis-dot" style={{ backgroundColor: item.color }} />
                  <span><small>{item.key}</small><strong>{item.label}</strong></span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-head"><div><h2>4축 컬러 프로필</h2><small>중앙선에서 어느 방향으로 치우치는지 확인합니다.</small></div></div>
            <div className="axis-spectrum-list">
              {AXES.map((axis) => {
                const value = profile.axes[axis.key];
                return (
                  <div className="axis-spectrum-row" key={axis.key}>
                    <div className="axis-spectrum-meta"><strong>{axis.label}</strong><span>{axisValue(axis.label, value)}</span></div>
                    <div className="axis-spectrum-track" style={{ background: axis.gradient }}><i className="axis-pin" style={{ left: axisPercent(value) + '%', borderColor: profile.palette[21] }} /></div>
                    <div className="axis-ends"><span>{axis.low}</span><span>{axis.high}</span></div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel spectrum-map-panel">
            <div className="section-head"><div><h2>스펙트럼 위치</h2><small>온도 × 명도 좌표</small></div><span className="season-code">{profile.code}</span></div>
            <div className="spectrum-position-card">
              <span className="position-label cool">COOL</span><span className="position-label warm">WARM</span>
              <span className="position-label light">LIGHT</span><span className="position-label deep">DEEP</span>
              <i className="spectrum-position-point" style={{ left: axisPercent(profile.axes.temperature) + '%', top: (100 - axisPercent(profile.axes.lightness)) + '%', background: 'linear-gradient(135deg,' + profile.palette[4] + ',' + profile.palette[21] + ')' }} />
            </div>
            <p className="spectrum-nearby">{profile.near}</p>
          </section>
        </aside>
      </div>

      <section className="glass-panel season-browser">
        <div className="season-browser-head">
          <div><h2>12계절 스펙트럼</h2><p>다른 시즌과 비교해도 실제 저장된 결과는 {actualProfile.ko}로 유지됩니다.</p></div>
          <span className="chip">ACTUAL · {actualProfile.code}</span>
        </div>
        <div className="season-family-grid">
          {SEASON_FAMILIES.map((family) => (
            <div className="season-family" key={family.title}>
              <div className="season-family-title"><span className="family-dot" style={{ backgroundColor: family.color }} />{family.title}</div>
              <div className="season-option-list">
                {family.ids.map((seasonId) => {
                  const item = SEASON_DISPLAY[seasonId];
                  return (
                    <button className={previewSeasonId === seasonId ? 'season-option active' : 'season-option'} type="button" key={seasonId} onClick={() => setPreviewSeasonId(seasonId)}>
                      <span>{item.title.replace(String.fromCharCode(10), ' ')}</span>
                      <i className="season-option-pip" style={{ background: 'linear-gradient(135deg,' + item.palette[0] + ',' + item.palette[21] + ')' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel season-browser">
        <div className="usage-head"><div><h2>옷장에 적용하는 법</h2><p>얼굴 가까이, 베이스, 포인트 역할로 나눠 사용합니다.</p></div>{onOpenWardrobe && <button className="button secondary" type="button" onClick={onOpenWardrobe}>옷장에서 확인</button>}</div>
        <div className="usage-grid">
          <UsageCard title="Face color" body="상의와 스카프처럼 얼굴 가까이에 두기 좋은 색입니다." colors={profile.usage.slice(0, 3)} />
          <UsageCard title="Base neutral" body="전체 면적을 안정시키는 바탕색으로 활용합니다." colors={profile.usage.slice(3, 6)} />
          <UsageCard title="Accent" body="가방과 신발, 작은 면적의 포인트로 사용합니다." colors={profile.usage.slice(6, 9)} />
        </div>
      </section>
    </section>
  );
}

export function PersonalColorHistoryPanel({ history, current, onApply }: { history: PersonalColorRecord[]; current: FinalResult | null; onApply: (record: PersonalColorRecord) => void }) {
  const [selectedRecord, setSelectedRecord] = useState<PersonalColorRecord | null>(null);
  const selectedResult = selectedRecord?.result;
  const selectedSeason = selectedResult ? SEASON_DETAILS[selectedResult.seasonTop1Id] : null;

  return (
    <section className="panel personal-history-panel">
      <PanelTitle title="나의 퍼스널 컬러 기록" />
      {!current && history.length === 0 ? (
        <p>아직 저장된 측정 기록이 없습니다.</p>
      ) : (
        <div className="history-grid">
          {history.map((record, index) => {
            const recordResult = record.result;
            const isCurrent = index === 0 && Boolean(current);
            return (
              <article className={isCurrent ? 'history-card current' : 'history-card'} key={record.id}>
                <button className="history-card-main" type="button" onClick={() => setSelectedRecord(record)}>
                  <span><small>{new Date(record.measuredAt).toLocaleString('ko-KR')}</small><strong>{SEASON_LABELS[recordResult.seasonTop1Id]}</strong><em>2순위 {SEASON_LABELS[recordResult.seasonTop2Id]}</em></span>
                  <span className="mini-palette">{pickDiversePaletteColors(recordResult.palette, 5).map((hex, idx) => <Chip key={hex + '-' + idx} hex={hex} />)}</span>
                </button>
                <div className="history-actions">
                  <button className="line-button" type="button" onClick={() => setSelectedRecord(record)}>자세히 보기</button>
                  {isCurrent ? <span className="current-label">현재 적용 중</span> : <button className="black-button" type="button" onClick={() => onApply(record)}>이 결과 적용</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selectedRecord && selectedResult && selectedSeason && (
        <div className="history-detail-backdrop" role="presentation" onClick={() => setSelectedRecord(null)}>
          <section className="history-detail-modal" role="dialog" aria-modal="true" aria-label="퍼스널 컬러 상세 정보" onClick={(event) => event.stopPropagation()}>
            <div className="history-detail-head">
              <div><small>{new Date(selectedRecord.measuredAt).toLocaleString('ko-KR')}</small><h3>{selectedSeason.title}</h3><p>2순위 {SEASON_LABELS[selectedResult.seasonTop2Id]}</p></div>
              <button className="line-button" type="button" onClick={() => setSelectedRecord(null)}>닫기</button>
            </div>
            <p>{selectedSeason.summary}</p>
            <section><h4>잘 어울리는 색상</h4><ColorTileGrid colors={pickDiversePaletteColors(selectedResult.palette, 10)} compact /></section>
            <section><h4>주의할 색상</h4><ColorTileGrid colors={selectedSeason.worstColors} compact /></section>
            <div className="history-detail-actions"><button className="black-button" type="button" onClick={() => { onApply(selectedRecord); setSelectedRecord(null); }}>이 결과 적용</button></div>
          </section>
        </div>
      )}
    </section>
  );
}
