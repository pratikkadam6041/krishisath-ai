import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import mr from './mr.json';
import hi from './hi.json';
import en from './en.json';

const updateFontFamily = (lng) => {
  const root = document.documentElement;
  if (lng === 'en') {
    root.classList.remove('font-noto');
    root.classList.add('font-inter');
  } else {
    root.classList.remove('font-inter');
    root.classList.add('font-noto');
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      mr: { translation: mr },
      hi: { translation: hi },
      en: { translation: en },
    },
    lng: localStorage.getItem('ks_language') || 'hi',
    fallbackLng: 'hi',
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
  });

i18n.on('languageChanged', (lng) => {
  updateFontFamily(lng);
});

updateFontFamily(i18n.language);

export default i18n;
