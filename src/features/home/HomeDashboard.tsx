// V5 Exact 홈 구조에 현재 퍼컬, 날씨, 옷장, 저장 룩 데이터를 연결합니다.
import { useMemo } from 'react';
import { Bookmark, Camera, Check, ChevronRight, ImagePlus, Sparkles, Sun, X } from 'lucide-react';
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
  showFirstUseGuide: boolean;
  dismissFirstUseGuide: () => void;
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
  const personalReady = Boolean(result);
  const hasTop = props.scoredItems.some((item) => item.category === '상의');
  const hasBottom = props.scoredItems.some((item) => item.category === '하의');
  const clothingReady = hasTop && hasBottom;
  const clothingReadyCount = Number(hasTop) + Number(hasBottom);
  const readyCount = Number(personalReady) + Number(clothingReady);

  return (
    <section className="colorfit-home">
      <div className="home-layout">
        <section className={'glass-panel today-panel' + (todayGlassBackground ? ' today-panel--season' : '')}>
          {todayGlassBackground && <div className="today-liquid-layer" style={{ background: todayGlassBackground }} />}
          <div className="today-content">
            <span className="page-kicker home-desktop-copy">{weekday} · {temperature} · {seasonLabel}</span>
            <span className="page-kicker home-mobile-copy">나의 퍼스널컬러</span>
            <h1>
              <span className="home-desktop-copy">{result ? '오늘은 ' + seasonLabel + '의 색으로 시작해볼까요?' : '오늘 입을 옷을 함께 정리해볼까요?'}</span>
              <span className="home-mobile-copy">{result ? seasonLabel : '내 색부터 확인해요.'}</span>
            </h1>
            <p className="home-desktop-copy">{result ? '퍼컬 결과와 현재 날씨, 등록한 옷을 함께 보고 오늘의 조합을 만듭니다.' : '퍼컬을 진단하거나 옷을 먼저 등록하면 실제 옷장으로 조합을 만들 수 있습니다.'}</p>
            <p className="home-mobile-copy">{result ? '잘 받는 색의 범위와 옷장 활용 색을 바로 확인할 수 있습니다.' : '사진 한 장과 짧은 질문으로 옷 추천의 색 기준을 만듭니다.'}</p>
            {result && (
              <div className="home-personal-palette home-mobile-copy" aria-label={seasonLabel + ' 핵심 팔레트'}>
                {result.palette.slice(0, 8).map((hex, index) => <i key={hex + '-' + index} style={{ backgroundColor: hex }} />)}
              </div>
            )}
            <button className="button primary home-mobile-personal-action home-mobile-copy" type="button" onClick={props.openPersonal}>
              {result ? '퍼스널컬러 결과 보기' : '퍼스널컬러 측정'}
            </button>
          </div>
          <div className="today-footer">
            <div className="today-state">
              <button className="state-cell state-cell--action" type="button" onClick={props.openPersonal}>
                <strong>{seasonLabel}</strong><small>{result ? '퍼컬 결과 다시보기' : '퍼컬 측정하러 가기'}</small>
              </button>
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
              <span>{result
                ? <><strong>퍼컬 다시보기</strong><small>{seasonLabel}</small></>
                : <><strong>퍼스널 컬러 측정</strong><small>본인의 색을 찾으세요</small></>}</span>
            </button>
          </section>
        </div>
      </div>

      {props.showFirstUseGuide && (
        <section className="panel first-use-guide" aria-labelledby="first-use-guide-title">
          <div className="first-use-guide-head">
            <div>
              <span className="page-kicker">처음 시작 가이드</span>
              <h2 id="first-use-guide-title">두 가지만 준비하면 추천을 볼 수 있어요.</h2>
              <p>순서대로 하지 않아도 되고, 완료한 항목은 자동으로 표시됩니다.</p>
            </div>
            <div className="first-use-guide-status">
              <strong>{readyCount}/2</strong>
              <button type="button" onClick={props.dismissFirstUseGuide} aria-label="처음 시작 안내 숨기기"><X className="icon" /></button>
            </div>
          </div>
          <div className="first-use-steps">
            <button className={'first-use-step' + (personalReady ? ' is-complete' : ' is-current')} type="button" onClick={props.openPersonal}>
              <span className="first-use-step-number">{personalReady ? <Check className="icon" /> : '1'}</span>
              <span><strong>퍼스널컬러 측정</strong><small>옷마다 내 색과 얼마나 잘 맞는지 계산하는 기준입니다.</small></span>
              <em>{personalReady ? '완료' : '약 3분'}</em>
            </button>
            <button className={'first-use-step' + (clothingReady ? ' is-complete' : personalReady ? ' is-current' : '')} type="button" onClick={props.openManual}>
              <span className="first-use-step-number">{clothingReady ? <Check className="icon" /> : '2'}</span>
              <span><strong>상의와 하의 등록</strong><small>사진이나 카탈로그로 상의와 하의를 한 벌씩 등록하면 조합을 만들 수 있습니다.</small></span>
              <em>{clothingReady ? '완료' : clothingReadyCount + '/2종'}</em>
            </button>
            <div className={'first-use-step' + (personalReady && clothingReady ? ' is-current' : '')}>
              <span className="first-use-step-number">3</span>
              <span><strong>색 조합별 추천 확인</strong><small>준비가 끝나면 색상별 코디와 네 가지 점수를 비교할 수 있습니다.</small></span>
              <em>{personalReady && clothingReady ? '준비됨' : '준비 후'}</em>
            </div>
          </div>
          <details className="first-use-details">
            <summary>전체 사용법 보기</summary>
            <p>퍼스널컬러가 옷의 색 점수를 만들고, 선택한 옷장에서 추천 조합을 만든 뒤, 마음에 드는 결과를 데일리룩 보관함에 저장합니다.</p>
          </details>
        </section>
      )}

      <section className="panel home-mobile-recommend">
        <div>
          <span className="page-kicker">옷 추천</span>
          <h2>{personalReady && clothingReady ? '추천 가능한 색 조합 ' + props.recommendationCount + '개' : '추천 준비가 필요해요.'}</h2>
          <p>{personalReady && clothingReady ? '선택한 옷장과 현재 날씨로 계산합니다.' : '퍼컬 측정과 옷 두 벌 등록을 먼저 완료하세요.'}</p>
        </div>
        <button className="button secondary" type="button" onClick={() => props.go('recommend')}>
          <Sparkles className="icon" />{personalReady && clothingReady ? '열기' : '준비'}
        </button>
      </section>

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
