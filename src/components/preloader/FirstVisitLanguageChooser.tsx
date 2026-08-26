import { useEffect, useRef } from 'react';
import { Check, Languages } from 'lucide-react';
import { useLanguage, type Language } from '../../i18n/LanguageContext';
import { BrandMark } from '../BrandMark';

const choices: Array<{ value: Language; label: string; detail: string }> = [
  { value: 'vi', label: 'Tiếng Việt', detail: 'Tiếp tục bằng tiếng Việt' },
  { value: 'en', label: 'English', detail: 'Continue in English' },
];

export function FirstVisitLanguageChooser({ onComplete }: { onComplete: () => void }) {
  const { language, setLanguage } = useLanguage();
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstChoiceRef.current?.focus();
  }, []);

  const choose = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    onComplete();
  };

  return (
    <div className="ua-entry-language" role="dialog" aria-modal="true" aria-labelledby="ua-entry-language-title">
      <div className="ua-entry-language__panel">
        <BrandMark showTagline={false} />
        <span className="ua-entry-language__icon" aria-hidden="true"><Languages size={22} /></span>
        <h1 id="ua-entry-language-title">Chọn ngôn ngữ</h1>
        <p>Choose your language</p>
        <div className="ua-entry-language__choices">
          {choices.map((choice, index) => (
            <button
              key={choice.value}
              ref={index === 0 ? firstChoiceRef : undefined}
              type="button"
              onClick={() => choose(choice.value)}
              aria-pressed={language === choice.value}
            >
              <span><strong>{choice.label}</strong><small>{choice.detail}</small></span>
              {language === choice.value && <Check size={18} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
