import { v4 as uuidv4 } from 'uuid'

export const ID_UTILS = {
  // Gerar novo ID
  generate: (): string => {
    return uuidv4()
  },
  
  // Converter para string sempre
  toString: (id: any): string => {
    if (!id) return ''
    if (typeof id === 'string') return id
    if (id.toString) return id.toString()
    return String(id)
  },
  
  // Validar se ID é válido UUID
  isValid: (id: any): boolean => {
    if (!id) return false
    if (typeof id !== 'string') return false
    // Regex para validar UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  },
  
  // Normalizar documento para frontend
  normalize: (doc: any) => {
    if (!doc) return null
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
    return {
      ...obj,
      id: ID_UTILS.toString(obj.id || obj._id),
      _id: undefined // Remover _id do frontend
    }
  }
}
