// ColorFit V5 Exact 통합에서 화면 구조와 기능 경계 계약을 검증합니다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('ColorFit V5 Exact 통합 계약', () => {
  it('홈은 V5 Exact 정보 계층을 실제 v2 진입 동선에 연결한다', () => {
    const home = source('src/features/home/HomeDashboard.tsx');
    const app = source('src/App.tsx');

    expect(home).toContain('home-layout');
    expect(home).toContain('today-panel');
    expect(home).toContain('home-side');
    expect(home).toContain('home-lower');
    expect(home).toContain('mini-wardrobes');
    expect(home).toContain('saved-preview');
    expect(home).toContain("props.go('recommend')");
    expect(home).toContain('props.openManual');
    expect(home).toContain('props.openPersonal');
    expect(home).toContain("props.go('wardrobe')");
    expect(home).toContain("props.go('saved')");
    expect(home).toContain('showFirstUseGuide');
    expect(home).toContain('first-use-guide');
    expect(home).toContain('두 가지만 준비하면 추천을 볼 수 있어요.');
    expect(app).toContain("!clothingItems.some((item) => item.category === '상의')");
    expect(app).toContain("!clothingItems.some((item) => item.category === '하의')");
    expect(app).toContain('firstUsePreparationIncomplete && !firstUseGuideDismissed');
    expect(app).toContain("analysisStep: personalColorResult ? 'result' : 'photo'");
    expect(app).toContain('mobile-header-spacer');
  });

  it('퍼컬 3단계는 크로마틱 촬영, 설문, 결과 구조를 사용한다', () => {
    const photo = source('src/components/PhotoAnalyzer.tsx');
    const questionnaire = source('src/components/Questionnaire.tsx');
    const result = source('src/features/personal/PersonalResult.tsx');
    const app = source('src/App.tsx');
    const css = source('src/colorfit.css');

    expect(photo).toContain('personal-shell');
    expect(photo).toContain('camera-stage');
    expect(photo).toContain('capture-progress');
    expect(photo).toContain('capture-prep-overlay');
    expect(photo).toContain('camera-control-dock');
    expect(photo).toContain('capture-face-guide');
    expect(photo).not.toContain('<span>얼굴 위치</span>');
    expect(photo).not.toContain('<span>흰 종이</span>');
    expect(photo).toContain('switchCamera');
    expect(photo).not.toContain('flow-rail');
    expect(photo).not.toContain('photo-guidance-row');
    expect(app).not.toContain('<h1>얼굴 사진 촬영</h1>');
    expect(css).toContain('.capture-prep-overlay');
    expect(css).toContain('.camera-control-dock');
    expect(css).toContain('.capture-face-guide');
    expect(css).toContain('margin-inline: auto');
    expect(css).toContain('.photo-camera-frame.stream-portrait .white-reference-guide');
    expect(css).toContain('top: auto');
    expect(questionnaire).toContain('question-layout');
    expect(questionnaire).toContain('option-card');
    expect(result).toContain('result-liquid-layout');
    expect(result).toContain('liquid-result-hero');
    expect(result).toContain('season-family-grid');
    expect(result).not.toContain('신뢰도 {Math.round(result.confidence * 100)}%');
  });

  it('옷장은 준비도 파생값을 제거하고 분석 우선 등록과 공용 색상 레이어를 사용한다', () => {
    const wardrobe = source('src/features/wardrobe/WardrobeSection.tsx');
    const app = source('src/App.tsx');
    const wardrobeHook = source('src/hooks/useWardrobes.ts');
    const colorModal = source('src/features/color/ColorInsightModal.tsx');
    const readinessContract = [wardrobe, app, wardrobeHook].join('\n');

    expect(readinessContract).not.toContain('wardrobeHealthScore');
    expect(source('src/colorfit.css')).not.toContain('.health-ring');
    expect(readinessContract).not.toContain('readyWardrobeCount');
    expect(readinessContract).not.toContain('옷장 건강도');
    expect(readinessContract).not.toContain('옷장 준비도');
    expect(wardrobe).not.toContain('AI 추천');
    expect(wardrobe).toContain('wardrobe-color-summary');
    expect(wardrobe).toContain('manual-edit-sheet');
    expect(wardrobe).toContain('정보 수정');
    expect(colorModal).toContain('color-insight-overlay');
    expect(colorModal).toContain('liquid-color-orb');
  });

  it('추천, 룩 보관함, 데일리룩은 V5 정보 계층과 v2 편집기를 함께 사용한다', () => {
    const recommendation = source('src/features/recommendation/RecommendationDashboard.tsx');
    const saved = source('src/features/saved-outfits/SavedOutfits.tsx');
    const tryOn = source('src/features/try-on/TryOn.tsx');
    const app = source('src/App.tsx');

    expect(recommendation).toContain('criteria-panel');
    expect(recommendation).toContain('best-outfit');
    expect(recommendation).toContain("'--combo-a': group.topHex");
    expect(recommendation).toContain("'--combo-b': group.bottomHex");
    expect(recommendation).not.toContain('추천 점수 진단');
    expect(saved).toContain('vault-head');
    expect(saved).toContain('folder-row');
    expect(source('src/colorfit.css')).toContain('.folder-row::-webkit-scrollbar');
    expect(saved).toContain('saved-grid');
    expect(saved).toContain('folder-manage-panel');
    expect(saved).toContain('onRenameFolder');
    expect(app).toContain('onRenameFolder={renameSavedLookFolder}');
    expect(app).toContain('onDeleteFolder={deleteSavedLookFolder}');
    expect(saved).toContain('onDeleteFolder');
    expect(tryOn).toContain('daily-layout');
    expect(tryOn).toContain('requestAnimationFrame');
    expect(source('src/colorfit.css')).toContain('.colorfit-daily .page-head .daily-head-actions .button.secondary');
  });

  it('기본, 크로마틱, 포커스 글라스 모드와 v2 폰트를 한 디자인 시스템에서 제공한다', () => {
    const css = source('src/colorfit.css');

    expect(css).toContain('body.chromatic-mode');
    expect(css).toContain('.color-insight-overlay');
    expect(css).toContain('.home-layout');
    expect(css).toContain('.home-layout { display: grid; grid-template-columns: 1.25fr .75fr; gap: 18px; }');
    expect(css).toContain('.colorfit-home .home-layout,');
    expect(css).toContain('display: contents;');
    expect(css).toContain('.colorfit-recommend .color-combo-pill[style].active');
    expect(css).toContain('.manual-edit-sheet');
    expect(css).toContain("font-family: 'Pretendard'");
  });
});
