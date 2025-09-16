'use client';

import { useEffect } from 'react';

export default function TabTitleHandler() {
  useEffect(() => {
    const defaultTitle =
      'ducktylo | Senaristler ve Yapımcılar için ortak nokta!';
    const blurTitles = [
      'Senaryoda revizyon vakti mi?',
      'Yazmaya devam et!',
      'Yapımcılar bekliyor olabilir!',
      'ducktylo seni özlüyor <3',
      'Yüzüğü kartallarla götürebilirlerdi...',
      'You know nothing, Jon Snow',
      '...ve sonsuza kadar huzur içinde yaşamışlar.',
      'Başrolün ismi Sinan olmalı',
      'Wednesday S01E02 00:18:45',
    ];

    let index = 0; // <== Sıralama için sayacı burada başlatıyoruz

    const handleBlur = () => {
      const nextTitle = blurTitles[index % blurTitles.length];
      document.title = nextTitle;
      index++; // her blur olayında sıradaki mesajı göstermek için artır
    };

    const handleFocus = () => {
      document.title = defaultTitle;
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return null;
}
