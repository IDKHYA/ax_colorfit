/*
 * Questionnaire.tsx
 *
 * 퍼스널컬러 진단의 두 번째 단계인 5문항 설문 화면입니다.
 * 사진 신호를 평소 색 반응으로 보정하고 네 가지 축 점수를 최종 판정에 전달합니다.
 */
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { QUESTIONS } from '@/src/constants';
import type { QuestionnaireScores } from '@/src/types';
import { calculateQuestionnaireScores } from '@/src/services/personalColorEngine';

interface QuestionnaireProps {
  onComplete: (scores: QuestionnaireScores, rawResponses: Record<string, string>) => void;
}

function ColorSwatches({ swatches, caption }: { swatches?: string[]; caption?: string }) {
  if (!swatches?.length) return null;

  return (
    <span className="option-swatches">
      <span>
        {swatches.map((color, index) => <i key={color + '-' + index} style={{ backgroundColor: color }} aria-hidden="true" />)}
      </span>
      {caption && <small>{caption}</small>}
    </span>
  );
}

export default function Questionnaire({ onComplete }: QuestionnaireProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const currentQuestion = QUESTIONS[currentIndex];
  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

  const handleSelect = (optionValue: string) => {
    const nextResponses = { ...responses, [currentQuestion.id]: optionValue };
    setResponses(nextResponses);

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    onComplete(calculateQuestionnaireScores(nextResponses), nextResponses);
  };

  return (
    <div className="question-layout">
      <section className="glass-panel question-card">
        <div className="question-head">
          <span className="question-title"><ClipboardList className="icon" /><span><small>Step 2 of 3</small><strong>색 반응 설문</strong></span></span>
          <strong>{currentIndex + 1} / {QUESTIONS.length}</strong>
        </div>
        <div className="progress-track" aria-label={'설문 진행률 ' + Math.round(progress) + '%'}>
          <i className="progress-fill" style={{ width: progress + '%' }} />
        </div>

        <div className="question-copy">
          <span className="eyebrow">Questionnaire Signal</span>
          <h2>{currentQuestion.text}</h2>
          {currentQuestion.helperText && <p>{currentQuestion.helperText}</p>}
        </div>

        <div className="question-options">
          {currentQuestion.options.map((option) => {
            const selected = responses[currentQuestion.id] === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={selected ? 'option-card selected' : 'option-card'}
                onClick={() => handleSelect(option.value)}
              >
                <span className="option-copy">
                  <strong>{option.label}</strong>
                  {option.description && <small>{option.description}</small>}
                </span>
                <ColorSwatches swatches={option.swatches} caption={option.swatchCaption} />
                <ChevronRight className="icon option-chevron" />
              </button>
            );
          })}
        </div>

        <div className="question-footer">
          <button className="button ghost" type="button" onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))} disabled={currentIndex === 0}>
            <ChevronLeft className="icon" />이전
          </button>
          <span className="question-dots" aria-hidden="true">
            {QUESTIONS.map((question, index) => (
              <i key={question.id} className={index === currentIndex ? 'active' : responses[question.id] ? 'done' : ''} />
            ))}
          </span>
        </div>
      </section>
    </div>
  );
}
