// V5 Exact 홈 구조에 현재 퍼컬, 날씨, 옷장, 저장 룩 데이터를 연결합니다.
import { useMemo } from 'react';
import { Bookmark, Camera, ChevronRight, ImagePlus, Sparkles, Sun } from 'lucide-react';
import { clothingDisplayImage } from '../../services/clothingDisplay';
import { buildSeasonGlassBackground } from '../personal/seasonGlass';
import { SEASON_LABELS } from '../../wardrobeConstants';
import type { useWeather } from '../../hooks/useWeather';
import type { FinalResult } from '../../types';
import type { Page, RecommendationWeatherBand, SavedOutfit, ScoredClothingItem, Wardrobe } from '../../wardrobeTypes';

export function HomeDashboard(props: {
  personalColorResult: FinalResult | null;
  wardrobes: Wardrobe[];
  scoredItems: ScoredClothingItem[];
  savedOutfits: SavedOutfit[];
  weather: ReturnType<typeof useWeather>['data'];
  weatherLoading: boolean;
  weatherError: string;
  weatherSource: 'geolocation' | 'fallback';
  weatherBand: RecommendationWeatherBand;
  refreshWeather: () => void;
  recommendationCount: number;
  go: (page: Page) => void;
  openPersonal: () => void;
  openManual: () => void;
}) {
  const result = props.personalColorResult;
  const seasonLabel = result ? SEASON_LABELS[result.seasonTop1Id] : '미측정';
  // 홈에 들어올 때마다 판정 시즌 팔레트에서 랜덤 4색·랜덤 위치로 리퀴드 글래스를 만든다. 미측정이면 중립(레이어 없음).
  const glassSeed = useMemo(() => Math.floor(Math.random() * 1e9), []);
  const todayGlassBackground = useMemo(
    () => buildSeasonGlassBackground(result?.seasonTop1Id ?? null, glassSeed),
    [result?.seasonTop1Id, glassSeed],
  );
  const latestOutfit = props.savedOutfits[0];
  // 데일리룩은 완성 PNG(dailyLookState.confirmedImage)를 우선 보여준다. 옷장이 비었거나 itemIds가
  // 현재 옷장과 매칭되지 않아도 사용자가 만든 결과가 그대로 보이도록 하기 위해서다.
  const latestCompletedImage = latestOutfit?.dailyLookState?.confirmedImage;
  const latestItems = latestOutfit?.itemIds
    .map((id) => props.scoredItems.find((item) => item.id === id))
    .filter((item): item is ScoredClothingItem => Boolean(item)) ?? [];
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const temperature = props.weather ? Math.round(props.weather.temperature) + '°' : '—';
  const weatherDescription = props.weatherLoading
    ? '날씨 정보를 불러오는 중'
    : props.weatherError || (props.weather
      ? props.weather.weatherText + ' · 체감 ' + Math.round(props.weather.apparentTemperature) + '도'
      : '날씨 정보 없음');
  const locationLabel = props.weather?.locationLabel ?? (props.weatherSource === 'fallback' ? '서울 기준' : '현재 위치');

  return (
    <section className="colorfit-home">
      <div className="home-layout">
        <section className={'glass-panel today-panel' + (todayGlassBackground ? ' today-panel--season' : '')}>
          {todayGlassBackground && <div className="today-liquid-layer" style={{ background: todayGlassBackground }} />}
          <div className="today-content">
            <span className="page-kicker">{weekday} · {temperature} · {seasonLabel}</span>
            <h1>{result ? '오늘은 ' + seasonLabel + '의 색으로 시작해볼까요?' : '오늘 입을 옷을 함께 정리해볼까요?'}</h1>
            <p>{result ? '퍼컬 결과와 현재 날씨, 등록한 옷을 함께 보고 오늘의 조합을 만듭니다.' : '퍼컬을 진단하거나 옷을 먼저 등록하면 실제 옷장으로 조합을 만들 수 있습니다.'}</p>
          </div>
          <div className="today-footer">
            <div className="today-state">
              <span className="state-cell"><strong>{seasonLabel}</strong><small>퍼컬 결과</small></span>
              <span className="state-cell"><strong>{props.scoredItems.length}벌</strong><small>등록된 아이템</small></span>
              <span className="state-cell"><strong>{props.recommendationCount}개</strong><small>추천 가능 조합</small></span>
            </div>
            <button className="button primary today-cta" type="button" onClick={() => props.go('recommend')}><Sparkles className="icon" />오늘 추천 받기</button>
          </div>
        </section>

        <div className="home-side">
          <section className="glass-panel weather-panel">
            <div className="weather-main">
              <div>
                <span className="eyebrow">현재 날씨 · {locationLabel}</span>
                <div className="weather-temp">{temperature}</div>
                <p>{weatherDescription}</p>
              </div>
              <button className="weather-icon" type="button" onClick={props.refreshWeather} aria-label="날씨 새로고침" title="날씨 새로고침"><Sun className="icon" /></button>
            </div>
            <div className="chip-row">
              <span className="chip">{props.weatherBand}</span>
              {props.weather?.shouldCarryUmbrella && <span className="chip">우산 챙기기</span>}
              {props.weather?.airQuality?.maskRecommendation && <span className="chip">{props.weather.airQuality.maskRecommendation}</span>}
            </div>
          </section>
          <section className="quick-grid">
            <button className="quick-card" type="button" onClick={props.openManual}>
              <span className="mini-icon"><ImagePlus className="icon" /></span>
              <span><strong>옷 추가</strong><small>사진 분석부터 시작</small></span>
            </button>
            <button className="quick-card" type="button" onClick={props.openPersonal}>
              <span className="mini-icon"><Camera className="icon" /></span>
              <span><strong>퍼스널 컬러 측정</strong><small>본인의 색을 찾으세요</small></span>
            </button>
          </section>
        </div>
      </div>

      <div className="home-lower">
        <section className="panel">
          <div className="section-head">
            <div><h2>내 옷장</h2><small>자주 쓰는 옷장부터</small></div>
            <button className="button ghost" type="button" onClick={() => props.go('wardrobe')}>전체 보기<ChevronRight className="icon" /></button>
          </div>
          <div className="mini-wardrobes">
            {props.wardrobes.slice(0, 3).map((wardrobe) => {
              const items = props.scoredItems.filter((item) => item.wardrobeId === wardrobe.id);
              return (
                <button className="wardrobe-mini" type="button" key={wardrobe.id} onClick={() => props.go('wardrobe')}>
                  <span className="mosaic">
                    {Array.from({ length: 4 }).map((_, index) => items[index]
                      ? <img key={items[index].id} src={clothingDisplayImage(items[index])} alt="" />
                      : <i key={index} />)}
                  </span>
                  <span><strong>{wardrobe.name}</strong><small>{items.length}벌</small></span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <div><h2>최근 저장 룩</h2><small>내 룩 보관함</small></div>
            <button className="button ghost" type="button" onClick={() => props.go('saved')}>보관함 열기<ChevronRight className="icon" /></button>
          </div>
          <div className="saved-preview">
            <div className="look-thumb" aria-label={latestOutfit ? latestOutfit.title + ' 미리보기' : '저장 룩 없음'}>
              {latestCompletedImage
                ? <img className="look-thumb-full" src={latestCompletedImage} alt="" />
                : latestItems.slice(0, 3).map((item, index) => (
                  <img key={item.id} src={clothingDisplayImage(item)} alt="" style={{ left: index === 0 ? '5%' : undefined, right: index > 0 ? (4 + (index - 1) * 18) + '%' : undefined, top: index === 0 ? '4%' : undefined, bottom: index > 0 ? (5 + (index - 1) * 16) + '%' : undefined }} />
                ))}
              {!latestOutfit && <span className="look-thumb-empty"><Bookmark className="icon" /></span>}
            </div>
            <div>
              <span className="page-kicker">Daily Archive</span>
              <h3>{latestOutfit?.title ?? '첫 데일리룩을 만들어보세요'}</h3>
              <p>{latestOutfit?.explanationBullets?.[0] ?? '추천에서 저장한 조합과 직접 만든 룩이 여기에 표시됩니다.'}</p>
              <div className="chip-row">
                <span className="chip">{latestOutfit?.mode ?? '데일리'}</span>
                <span className="chip">{latestOutfit?.weatherBand ?? '보관함'}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
