// 오늘의 추천 조건과 결과를 ColorFit 정보 계층으로 보여주는 화면입니다.
import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, CloudSun, Search, Sparkles } from 'lucide-react';
import { EmptyState } from '../../components/common';
import { clothingDisplayImage } from '../../services/clothingDisplay';
import { groupByColorCombo, HARMONY_BADGE_KO, scoreGrade } from '../../services/recommendationEngine';
import type { useWeather } from '../../hooks/useWeather';
import type { FinalResult } from '../../types';
import type { OutfitRecommendation, RecommendationMode, RecommendationWeatherBand, ScoredClothingItem, Wardrobe } from '../../wardrobeTypes';
import { WEATHER_BANDS } from '../../lib/weather';
import { RECOMMENDATION_MODES, SEASON_LABELS } from '../../wardrobeConstants';

export function RecommendationDashboard(props: {
  personalColorResult: FinalResult;
  wardrobes: Wardrobe[];
  items: ScoredClothingItem[];
  selectedWardrobes: Set<string>;
  setSelectedWardrobes: React.Dispatch<React.SetStateAction<Set<string>>>;
  search: string;
  setSearch: (value: string) => void;
  mode: RecommendationMode;
  setMode: (value: RecommendationMode) => void;
  weatherBand: RecommendationWeatherBand;
  setWeatherBand: (value: RecommendationWeatherBand) => void;
  weather: ReturnType<typeof useWeather>['data'];
  weatherLoading: boolean;
  weatherError: string;
  weatherSource: 'geolocation' | 'fallback';
  refreshWeather: () => void;
  recommendations: OutfitRecommendation[];
  requested: boolean;
  setRequested: (value: boolean) => void;
  onSave: (outfit: OutfitRecommendation) => void;
  onBack: () => void;
}) {
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [wardrobePickerOpen, setWardrobePickerOpen] = useState(false);
  const filteredWardrobes = props.wardrobes.filter((wardrobe) => wardrobe.name.toLowerCase().includes(props.search.toLowerCase()));
  const selectedItems = props.items.filter((item) => props.selectedWardrobes.has(item.wardrobeId));
  const selectedWardrobeNames = props.wardrobes.filter((wardrobe) => props.selectedWardrobes.has(wardrobe.id)).map((wardrobe) => wardrobe.name);
  const topCount = selectedItems.filter((item) => item.category === '상의').length;
  const bottomCount = selectedItems.filter((item) => item.category === '하의').length;
  const canRecommend = props.selectedWardrobes.size > 0 && topCount > 0 && bottomCount > 0;
  const allFilteredSelected = filteredWardrobes.length > 0 && filteredWardrobes.every((wardrobe) => props.selectedWardrobes.has(wardrobe.id));
  const seasonLabel = SEASON_LABELS[props.personalColorResult.seasonTop1Id];
  const weatherLabel = props.weatherLoading
    ? '확인 중'
    : props.weather
      ? Math.round(props.weather.temperature) + '도 · ' + props.weather.weatherText
      : props.weatherError || props.weatherBand;

  const toggleWardrobe = (id: string) => {
    props.setSelectedWardrobes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    props.setRequested(false);
  };

  const toggleAll = () => {
    props.setSelectedWardrobes((prev) => {
      const next = new Set(prev);
      filteredWardrobes.forEach((wardrobe) => {
        if (allFilteredSelected) next.delete(wardrobe.id);
        else next.add(wardrobe.id);
      });
      return next;
    });
    props.setRequested(false);
  };

  return (
    <section className="recommend-page colorfit-recommend">
      <div className="page-head">
        <div className="page-head-copy">
          <button className="button ghost wardrobe-back" type="button" onClick={props.onBack}><ArrowLeft className="icon" />이전</button>
          <span className="page-kicker">Curated for Today</span>
          <h1>오늘 입을 조합</h1>
          <p>추천 조건은 짧게 확인하고, 조합의 근거와 저장 행동에 집중합니다.</p>
        </div>
        <button className="button primary" type="button" disabled={!canRecommend} onClick={() => props.setRequested(true)}>
          <Sparkles className="icon" />{props.requested ? '다시 추천' : '추천 받기'}
        </button>
      </div>

      <div className="recommend-layout">
        <div className="recommend-main">
          <section className="glass-panel criteria-panel">
            <div className="section-head">
              <div><h2>오늘의 기준</h2><small>실제 추천 엔진에 전달되는 조건</small></div>
              <button className="button secondary" type="button" onClick={() => setWardrobePickerOpen(true)}>옷장 변경</button>
            </div>
            <div className="criteria-grid">
              <span className="criteria-cell"><small>퍼컬</small><strong>{seasonLabel}</strong></span>
              <span className="criteria-cell"><small>날씨</small><strong>{weatherLabel}</strong></span>
              <label className="criteria-cell criteria-select"><small>상황</small><select value={props.mode} onChange={(event) => props.setMode(event.target.value as RecommendationMode)}>{RECOMMENDATION_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
              <label className="criteria-cell criteria-select"><small>기온 구간</small><select value={props.weatherBand} onChange={(event) => props.setWeatherBand(event.target.value as RecommendationWeatherBand)}><option>상관없음</option>{WEATHER_BANDS.map((band) => <option key={band}>{band}</option>)}</select></label>
            </div>
            <div className="criteria-foot">
              <span>{selectedWardrobeNames.length > 0 ? selectedWardrobeNames.join(', ') : '선택한 옷장 없음'}</span>
              <button className="button ghost" type="button" onClick={props.refreshWeather}><CloudSun className="icon" />날씨 새로고침</button>
            </div>
          </section>

          {!props.requested && (
            <section className="panel recommend-empty-state">
              <span className="recommend-empty-icon"><Sparkles /></span>
              <div><h2>조건을 확인한 뒤 추천을 시작하세요.</h2><p>상의와 하의가 있는 옷장을 선택하면 실제 저장된 옷으로 조합을 만듭니다.</p></div>
              <button className="button primary" type="button" disabled={!canRecommend} onClick={() => props.setRequested(true)}>추천 조합 만들기</button>
              {!canRecommend && <small>최소 상의 1개와 하의 1개가 필요합니다.</small>}
            </section>
          )}

          {props.requested && (
            props.recommendations.length === 0
              ? <EmptyState title="추천 가능한 조합이 부족합니다." description="선택한 옷장에 상의와 하의를 함께 추가해 주세요." />
              : <RecommendationList recommendations={props.recommendations} onSave={props.onSave} />
          )}
        </div>

        <aside className="recommend-side">
          <section className="panel">
            <div className="section-head"><div><h3>추천 요약</h3><small>현재 선택 범위</small></div></div>
            <div className="setting-list">
              <div className="setting-row"><span>사용 옷장</span><strong>{props.selectedWardrobes.size}개</strong></div>
              <div className="setting-row"><span>후보 아이템</span><strong>{selectedItems.length}벌</strong></div>
              <div className="setting-row"><span>상의 / 하의</span><strong>{topCount} / {bottomCount}</strong></div>
              <div className="setting-row"><span>생성 조합</span><strong>{props.requested ? props.recommendations.length : '-'}개</strong></div>
            </div>
          </section>
          <section className="panel weather-detail-panel">
            <div className="section-head">
              <div><h3>외출 정보</h3><small>{props.weatherSource === 'geolocation' ? '현재 위치 기준' : '서울 기준'}</small></div>
              <button className="button ghost" type="button" onClick={() => setWeatherExpanded((prev) => !prev)}>{weatherExpanded ? '접기' : '더보기'}</button>
            </div>
            <p>{props.weatherError || props.weather?.locationLabel || '위치 확인 중'} · {weatherLabel}</p>
            {weatherExpanded && (
              <div className="weather-detail-list">
                <span>미세먼지 <strong>{formatDustValue(props.weather?.airQuality?.pm10)}</strong></span>
                <span>초미세먼지 <strong>{formatDustValue(props.weather?.airQuality?.pm25)}</strong></span>
                <span>마스크 <strong>{props.weather?.airQuality?.maskRecommendation ?? '확인 중'}</strong></span>
                <span>우산 <strong>{props.weather?.shouldCarryUmbrella ? props.weather.umbrellaReason : '필요 낮음'}</strong></span>
              </div>
            )}
          </section>
        </aside>
      </div>

      {wardrobePickerOpen && <div className="picker-backdrop" role="presentation" onClick={() => setWardrobePickerOpen(false)} />}
      <aside className={wardrobePickerOpen ? 'recommend-wardrobe-picker open' : 'recommend-wardrobe-picker'} aria-hidden={!wardrobePickerOpen}>
        <div className="picker-head">
          <div><span className="page-kicker">Recommendation Source</span><h2>추천에 사용할 옷장</h2></div>
          <button className="button secondary" type="button" onClick={() => setWardrobePickerOpen(false)}>완료</button>
        </div>
        <label className="search"><Search className="icon" /><input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="옷장 검색" /></label>
        <button className="button ghost full" type="button" onClick={toggleAll}>{allFilteredSelected ? '전체 해제' : '전체 선택'}</button>
        <div className="recommend-wardrobe-grid">
          {filteredWardrobes.map((wardrobe) => {
            const wardrobeItems = props.items.filter((item) => item.wardrobeId === wardrobe.id);
            const selected = props.selectedWardrobes.has(wardrobe.id);
            return (
              <button key={wardrobe.id} className={selected ? 'recommend-wardrobe-card selected' : 'recommend-wardrobe-card'} type="button" onClick={() => toggleWardrobe(wardrobe.id)}>
                <span className="recommend-mosaic">
                  {Array.from({ length: 4 }).map((_, index) => wardrobeItems[index]
                    ? <img key={wardrobeItems[index].id} src={clothingDisplayImage(wardrobeItems[index])} alt={wardrobeItems[index].type} />
                    : <i key={index} />)}
                </span>
                <span className="recommend-card-body"><strong>{wardrobe.name}</strong><small>{wardrobeItems.length}벌 · 상의 {wardrobeItems.filter((item) => item.category === '상의').length} · 하의 {wardrobeItems.filter((item) => item.category === '하의').length}</small></span>
                <span className="recommend-check">{selected && <Check size={16} />}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </section>
  );
}

function formatDustValue(value: number | null | undefined) {
  return value == null ? '확인 중' : String(Math.round(value));
}

function OutfitBoard({ outfit, compact = false }: { outfit: OutfitRecommendation; compact?: boolean }) {
  const positions = [
    { left: '1%', top: '2%' },
    { right: '1%', bottom: '3%' },
    { right: '2%', top: '4%' },
    { left: '22%', bottom: '0%' },
  ];
  return (
    <div className={compact ? 'compact-board' : 'outfit-board'}>
      {outfit.items.slice(0, compact ? 2 : 4).map((item, index) => (
        <img key={item.id} src={clothingDisplayImage(item)} alt={item.type} style={positions[index]} />
      ))}
    </div>
  );
}

function ScoreRow({ outfit }: { outfit: OutfitRecommendation }) {
  return (
    <div className="score-row">
      <span className="score-cell"><strong>{outfit.personalScore}</strong><small>퍼컬</small></span>
      <span className="score-cell"><strong>{outfit.weatherScore}</strong><small>날씨</small></span>
      <span className="score-cell"><strong>{outfit.harmonyScore}</strong><small>조화</small></span>
      <span className="score-cell"><strong>{outfit.stabilityScore}</strong><small>안정</small></span>
    </div>
  );
}

export function OutfitCard({ outfit, onSave, catalogIds }: { key?: React.Key; outfit: OutfitRecommendation; onSave: (outfit: OutfitRecommendation) => void; catalogIds?: Set<string> }) {
  return (
    <article className="panel outfit-card colorfit-outfit-card">
      <OutfitBoard outfit={outfit} />
      <div className="outfit-card-content">
        <span className="page-kicker">{HARMONY_BADGE_KO[outfit.harmonyType] ?? outfit.harmonyType} · {outfit.score}점</span>
        <h3>{outfit.title}</h3>
        <p>{outfit.reason}</p>
        <ScoreRow outfit={outfit} />
        {catalogIds && (
          <div className="source-chip-row">
            {outfit.items.map((item) => <span key={item.id} className={catalogIds.has(item.id) ? 'source-chip catalog' : 'source-chip owned'}>{item.type} · {catalogIds.has(item.id) ? '카탈로그' : '보유'}</span>)}
          </div>
        )}
        <ul className="reason-list">{outfit.explanationBullets.slice(0, 3).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
        <button className="button primary" type="button" onClick={() => onSave(outfit)}>이 룩 저장</button>
      </div>
    </article>
  );
}

function RecommendationList({ recommendations, onSave }: { recommendations: OutfitRecommendation[]; onSave: (outfit: OutfitRecommendation) => void }) {
  const groups = useMemo(() => groupByColorCombo(recommendations), [recommendations]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const displayed = selectedKey ? groups.find((group) => group.key === selectedKey)?.outfits ?? [] : recommendations;
  const best = displayed[0];
  const others = displayed.slice(1);

  if (!best) return null;

  return (
    <section className="recommendation-results">
      <div className="color-combo-tabs" aria-label="색 조합 필터">
        <button className={selectedKey === null ? 'color-combo-pill active' : 'color-combo-pill'} type="button" onClick={() => setSelectedKey(null)}>전체 <span className="pill-count">{recommendations.length}</span></button>
        {groups.map((group) => (
          <button key={group.key} className={selectedKey === group.key ? 'color-combo-pill active' : 'color-combo-pill'} type="button" onClick={() => setSelectedKey(group.key)}>
            <span className="pill-swatch" style={{ background: group.topHex }} /><span className="pill-swatch" style={{ background: group.bottomHex }} />{group.label}<span className="pill-count">{group.outfits.length}</span>
          </button>
        ))}
      </div>

      <article className="panel best-outfit">
        <OutfitBoard outfit={best} />
        <div className="best-outfit-copy">
          <span className="page-kicker">Best Match · {best.score}</span>
          <h2>{best.title}</h2>
          <p>{best.reason}</p>
          <ScoreRow outfit={best} />
          <ul className="reason-list">{best.explanationBullets.slice(0, 3).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          <div className="best-outfit-actions"><button className="button primary" type="button" onClick={() => onSave(best)}>이 룩 저장</button><span>{best.weatherBand} · {best.mode}</span></div>
        </div>
      </article>

      {others.length > 0 && (
        <div className="other-outfits">
          {others.map((outfit) => (
            <article className="card compact-outfit" key={outfit.id}>
              <OutfitBoard outfit={outfit} compact />
              <div><span className="page-kicker">{scoreGrade(outfit.score)} · {outfit.score}</span><h3>{outfit.title}</h3><p>{outfit.reason}</p><button className="button ghost" type="button" onClick={() => onSave(outfit)}>저장하기</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
