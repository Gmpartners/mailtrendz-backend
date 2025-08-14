import { supabaseAdmin } from '../config/supabase.config'
import { logger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { HTTP_STATUS } from '../utils/constants'

interface UploadResult {
  url: string
  path: string
  size: number
  mimeType: string
}

interface FileMetadata {
  originalName: string
  size: number
  mimeType: string
  userId: string
  chatId?: string
}

interface StorageFile {
  name: string
  created_at: string
  metadata?: {
    size?: number
    mimetype?: string
  }
}

class StorageService {
  private bucketName = 'chat-images'

  async uploadFile(file: Buffer, fileName: string, metadata: FileMetadata): Promise<UploadResult> {
    try {
      const fileExtension = fileName.split('.').pop()
      const uniqueFileName = `${metadata.userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`

      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(uniqueFileName, file, {
          contentType: metadata.mimeType
        })

      if (error) {
        logger.error('Storage upload error:', error)
        throw new ApiError('Erro ao fazer upload da imagem', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(data.path)

      return {
        url: urlData.publicUrl,
        path: data.path,
        size: metadata.size,
        mimeType: metadata.mimeType
      }
    } catch (error) {
      logger.error('Upload file error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro interno no upload', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath])

      if (error) {
        logger.error('Storage delete error:', error)
        throw new ApiError('Erro ao deletar arquivo', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }
    } catch (error) {
      logger.error('Delete file error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro interno ao deletar', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getUserFiles(userId: string): Promise<StorageFile[]> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .list(userId, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        logger.error('Storage list files error:', error)
        throw new ApiError('Erro ao listar arquivos', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return data || []
    } catch (error) {
      logger.error('Get user files error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro interno ao listar arquivos', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  getFileUrl(filePath: string): string {
    const { data } = supabaseAdmin.storage
      .from(this.bucketName)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  validateImageFile(file: Buffer, mimeType: string, size: number): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 10 * 1024 * 1024

    if (!allowedTypes.includes(mimeType)) {
      throw new ApiError('Tipo de arquivo não suportado. Use JPEG, PNG, GIF ou WebP', HTTP_STATUS.BAD_REQUEST)
    }

    if (size > maxSize) {
      throw new ApiError('Arquivo muito grande. Máximo 10MB', HTTP_STATUS.BAD_REQUEST)
    }

    if (file.length === 0) {
      throw new ApiError('Arquivo vazio', HTTP_STATUS.BAD_REQUEST)
    }
  }
}

export default new StorageService()
