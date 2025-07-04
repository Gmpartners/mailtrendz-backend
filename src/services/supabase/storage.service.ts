import { supabase } from '../../config/supabase.config'
import { ApiError } from '../../utils/api-error'
import { HTTP_STATUS } from '../../utils/constants'
import { logger } from '../../utils/logger'

class StorageService {
  private readonly buckets = {
    EMAIL_ASSETS: 'email-assets',
    USER_AVATARS: 'user-avatars',
    EMAIL_TEMPLATES: 'email-templates'
  }

  async uploadFile(
    bucket: keyof typeof this.buckets,
    fileName: string,
    file: Buffer | Blob,
    options?: {
      contentType?: string
      upsert?: boolean
    }
  ) {
    try {
      const bucketName = this.buckets[bucket]
      const uniqueFileName = `${Date.now()}-${fileName}`

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(uniqueFileName, file, {
          contentType: options?.contentType,
          upsert: options?.upsert || false
        })

      if (error) {
        logger.error('Storage upload error:', error)
        throw new ApiError('Erro ao fazer upload do arquivo', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      const { data: publicUrl } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path)

      return {
        path: data.path,
        url: publicUrl.publicUrl
      }
    } catch (error) {
      logger.error('Upload file error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao fazer upload', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async deleteFile(bucket: keyof typeof this.buckets, path: string) {
    try {
      const bucketName = this.buckets[bucket]

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path])

      if (error) {
        logger.error('Storage delete error:', error)
        throw new ApiError('Erro ao deletar arquivo', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return { success: true }
    } catch (error) {
      logger.error('Delete file error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao deletar arquivo', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getFileUrl(bucket: keyof typeof this.buckets, path: string) {
    try {
      const bucketName = this.buckets[bucket]

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path)

      return data.publicUrl
    } catch (error) {
      logger.error('Get file URL error:', error)
      throw new ApiError('Erro ao obter URL do arquivo', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async listFiles(bucket: keyof typeof this.buckets, folder?: string) {
    try {
      const bucketName = this.buckets[bucket]

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folder)

      if (error) {
        logger.error('Storage list error:', error)
        throw new ApiError('Erro ao listar arquivos', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return data || []
    } catch (error) {
      logger.error('List files error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao listar arquivos', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async uploadAvatar(userId: string, file: Buffer | Blob, contentType: string) {
    try {
      const fileName = `${userId}-avatar`
      const result = await this.uploadFile('USER_AVATARS', fileName, file, {
        contentType,
        upsert: true
      })

      const { error } = await supabase
        .from('profiles')
        .update({ avatar: result.url })
        .eq('id', userId)

      if (error) {
        await this.deleteFile('USER_AVATARS', result.path)
        throw new ApiError('Erro ao atualizar avatar', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return result
    } catch (error) {
      logger.error('Upload avatar error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao fazer upload do avatar', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async uploadEmailAsset(projectId: string, file: Buffer | Blob, fileName: string, contentType: string) {
    try {
      const folder = `projects/${projectId}`
      const fullFileName = `${folder}/${fileName}`
      
      return await this.uploadFile('EMAIL_ASSETS', fullFileName, file, {
        contentType
      })
    } catch (error) {
      logger.error('Upload email asset error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao fazer upload do asset', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
}

export default new StorageService()