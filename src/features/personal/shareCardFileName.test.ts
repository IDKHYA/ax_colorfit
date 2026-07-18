import { describe, expect, it } from 'vitest';
import { buildShareFileName } from './shareCardFileName';

describe('buildShareFileName', () => {
  it('퍼컬결과_시즌명_user_시간 형식으로 만든다', () => {
    const now = new Date(2026, 6, 18, 15, 52);
    expect(buildShareFileName('소프트 서머', now)).toBe('퍼컬결과_소프트서머_user_20260718_1552.png');
  });

  it('시즌명의 공백은 제거한다', () => {
    const now = new Date(2026, 0, 1, 0, 0);
    expect(buildShareFileName('브라이트 스프링', now)).toBe('퍼컬결과_브라이트스프링_user_20260101_0000.png');
  });
});
