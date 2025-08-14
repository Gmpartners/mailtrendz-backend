// Limites do sistema de pastas
export const FOLDER_LIMITS = {
  maxDepth: 10,
  maxFoldersPerUser: 1000,
  maxFoldersPerParent: 100,
  maxNameLength: 100,
  minNameLength: 1
} as const

// Cores padrão das pastas
export const DEFAULT_FOLDER_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6b7280', // Gray (default)
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f43f5e'  // Rose
]

// Função helper para validar nome de pasta
export function validateFolderName(name: string): boolean {
  if (!name || name.trim().length === 0) return false
  if (name.trim().length < FOLDER_LIMITS.minNameLength) return false
  if (name.length > FOLDER_LIMITS.maxNameLength) return false
  
  // Não permitir caracteres especiais que podem causar problemas
  const invalidChars = /[<>:"/\\|?*]/
  return !invalidChars.test(name)
}

// Função helper para validar cor
export function validateFolderColor(color: string): boolean {
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/i
  return hexColorRegex.test(color)
}

// Função para sanitizar nome de pasta
export function sanitizeFolderName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove caracteres inválidos
    .substring(0, FOLDER_LIMITS.maxNameLength)
}

// Função para gerar cor aleatória
export function getRandomFolderColor(): string {
  const colors = DEFAULT_FOLDER_COLORS
  return colors[Math.floor(Math.random() * colors.length)]
}

// Função para validar UUID
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Exportar tudo como default também
export default {
  FOLDER_LIMITS,
  DEFAULT_FOLDER_COLORS,
  validateFolderName,
  validateFolderColor,
  sanitizeFolderName,
  getRandomFolderColor,
  isValidUUID
}