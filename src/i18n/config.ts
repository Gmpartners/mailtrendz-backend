import i18n from 'i18next'
import Backend from 'i18next-fs-backend'
import path from 'path'

export const supportedLanguages = ['en', 'pt'] as const
export const defaultLanguage = 'pt'
export const fallbackLanguage = 'en'

export type Language = typeof supportedLanguages[number]

// Translation cache for performance
class TranslationCache {
  private cache = new Map<string, any>()
  private readonly TTL = 1000 * 60 * 60 // 1 hour

  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  clear(): void {
    this.cache.clear()
  }
}

export const translationCache = new TranslationCache()

i18n
  .use(Backend)
  .init({
    lng: defaultLanguage,
    fallbackLng: fallbackLanguage,
    supportedLngs: supportedLanguages,
    
    ns: ['common', 'errors', 'validation', 'email'],
    defaultNS: 'common',
    
    backend: {
      loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
      addPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.missing.json')
    },
    
    interpolation: {
      escapeValue: false, // React already escapes
      format: (value: any, format: string) => {
        if (format === 'uppercase') return value.toUpperCase()
        if (format === 'lowercase') return value.toLowerCase()
        if (format === 'capitalize') return value.charAt(0).toUpperCase() + value.slice(1)
        return value
      }
    },
    
    returnEmptyString: false,
    returnNull: false,
    returnObjects: true,
    
    debug: process.env.NODE_ENV === 'development',
    
    saveMissing: process.env.NODE_ENV === 'development',
    saveMissingTo: 'current',
    
    load: 'languageOnly',
    preload: supportedLanguages,
    cleanCode: true
  })

export default i18n

// Helper functions
export const getLanguageFromHeader = (acceptLanguage?: string): Language => {
  if (!acceptLanguage) return defaultLanguage
  
  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [language, quality = '1'] = lang.trim().split(';q=')
      return {
        language: language.split('-')[0], // Get language code only
        quality: parseFloat(quality)
      }
    })
    .sort((a, b) => b.quality - a.quality)
  
  // Find first supported language
  for (const { language } of languages) {
    if (supportedLanguages.includes(language as Language)) {
      return language as Language
    }
  }
  
  return defaultLanguage
}

export const isLanguageSupported = (language: string): language is Language => {
  return supportedLanguages.includes(language as Language)
}

// Translation function with caching
export const t = (key: string, options?: any, language?: Language): string => {
  const lang = language || defaultLanguage
  const cacheKey = `${lang}-${key}-${JSON.stringify(options)}`
  
  const cached = translationCache.get(cacheKey)
  if (cached) return cached
  
  const result = i18n.t(key, { ...options, lng: lang })
  translationCache.set(cacheKey, result)
  
  return result
}