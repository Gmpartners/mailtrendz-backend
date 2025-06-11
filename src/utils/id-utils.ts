import { Types } from 'mongoose'

export const ID_UTILS = {
  // Converter para string sempre
  toString: (id: any): string => {
    if (!id) return ''
    if (typeof id === 'string') return id
    if (id.toString) return id.toString()
    return String(id)
  },
  
  // Converter para ObjectId sempre
  toObjectId: (id: any): Types.ObjectId => {
    if (!id) throw new Error('ID é obrigatório')
    if (id instanceof Types.ObjectId) return id
    if (!Types.ObjectId.isValid(id)) throw new Error(`ID inválido: ${id}`)
    return new Types.ObjectId(id)
  },
  
  // Validar se ID é válido
  isValid: (id: any): boolean => {
    if (!id) return false
    return Types.ObjectId.isValid(id)
  },
  
  // Normalizar documento para frontend
  normalize: (doc: any) => {
    if (!doc) return null
    return {
      ...doc.toObject ? doc.toObject() : doc,
      id: ID_UTILS.toString(doc._id || doc.id),
      _id: undefined // Remover _id do frontend
    }
  }
}