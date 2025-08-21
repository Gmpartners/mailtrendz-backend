// import i18n from 'i18next'
// import Backend from 'i18next-fs-backend'
// import path from 'path'

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

// Placeholder i18n object for compilation
const i18n = {
  t: (key: string, _options?: any) => key
}

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

// Translation function with caching (placeholder)
export const t = (key: string, _options?: any, _language?: Language): string => {
  return key // Just return the key for now
}