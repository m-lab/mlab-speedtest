/**
 * Simple i18n module for runtime translation loading.
 * Language selection via: ?lang=es query param, localStorage, or browser preference.
 */
const i18n = {
  translations: {},
  currentLang: 'en',
  supported: ['en', 'es', 'de', 'fr', 'it', 'nl', 'ru', 'zh', 'hi', 'el', 'az', 'fa', 'id', 'br', 'pt'],

  async init() {
    this.currentLang = this.detectLanguage();
    if (this.currentLang !== 'en') {
      await this.load(this.currentLang);
    }
    this.translatePage();
  },

  detectLanguage() {
    // 1. Query param: ?lang=es
    const urlParams = new URLSearchParams(location.search);
    const param = urlParams.get('lang');
    if (param && this.supported.includes(param)) {
      localStorage.setItem('lang', param);
      return param;
    }

    // 2. localStorage (previous choice)
    const stored = localStorage.getItem('lang');
    if (stored && this.supported.includes(stored)) {
      return stored;
    }

    // 3. Browser preference
    const browserLang = navigator.language.split('-')[0];
    if (this.supported.includes(browserLang)) {
      return browserLang;
    }

    return 'en';
  },

  async load(lang) {
    try {
      const resp = await fetch(`/translations/${lang}.json`);
      if (resp.ok) {
        this.translations = await resp.json();
      } else {
        console.warn(`Failed to load translations for ${lang}`);
      }
    } catch (err) {
      console.warn(`Error loading translations for ${lang}:`, err);
    }
  },

  t(key) {
    return this.translations[key] || key;
  },

  deriveKeyFromElement(el) {
    const explicit = el.dataset.i18n;
    if (explicit && explicit.trim() !== "") {
      return explicit.trim();
    }
  
    let raw = (el.dataset.i18nHtml !== undefined)
      ? el.innerHTML
      : el.textContent;
  
    if (!raw) {
      console.warn("i18n: unable to derive key (empty content):", el);
      return null;
    }
  
    const key = raw.trim();
    if (!key) {
      console.warn("i18n: unable to derive key (whitespace):", el);
      return null;
    }
  
    return key;
  },
  
  translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      let key = this.deriveKeyFromElement(el);
      if (!key) return;
      el.dataset.i18n = key;
      
     
        if (el.dataset.i18nHtml !== undefined) {
          el.innerHTML = this.t(key);
        } else {
          el.textContent = this.t(key);
      }
    });
  }
};
