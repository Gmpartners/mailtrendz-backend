import { supabaseAdmin } from '../config/supabase.config'
import { logger } from './logger'

/**
 * ✅ FUNÇÃO ÚNICA PARA BUSCAR HTML ATUAL
 * Esta é a ÚNICA fonte de verdade para HTML atual no sistema
 * Ordem de prioridade: 1) project.content.html 2) última mensagem do chat
 */
export class HTMLResolver {
  /**
   * Busca HTML atual seguindo ordem de prioridade definida
   */
  static async getCurrentHTML(projectId?: string, chatId?: string): Promise<string | null> {
    logger.info('[HTML-RESOLVER] Buscando HTML atual', { projectId, chatId })
    
    // PRIORIDADE 1: HTML do projeto (fonte principal)
    if (projectId) {
      const projectHTML = await this.getProjectHTML(projectId)
      if (projectHTML) {
        logger.info('[HTML-RESOLVER] HTML encontrado no projeto', { 
          projectId, 
          htmlLength: projectHTML.length 
        })
        return projectHTML
      }
    }
    
    // PRIORIDADE 2: HTML da última mensagem do chat (backup)
    if (chatId) {
      const chatHTML = await this.getChatHTML(chatId)
      if (chatHTML) {
        logger.info('[HTML-RESOLVER] HTML encontrado no chat', { 
          chatId, 
          htmlLength: chatHTML.length 
        })
        return chatHTML
      }
    }
    
    logger.info('[HTML-RESOLVER] Nenhum HTML encontrado', { projectId, chatId })
    return null
  }
  
  /**
   * Busca HTML do projeto (fonte principal de verdade)
   */
  private static async getProjectHTML(projectId: string): Promise<string | null> {
    try {
      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select('content')
        .eq('id', projectId)
        .single()
      
      if (error || !project) {
        logger.warn('[HTML-RESOLVER] Projeto não encontrado', { projectId, error })
        return null
      }
      
      const content = project.content as any
      const html = content?.html
      
      if (!html || typeof html !== 'string' || html.trim().length === 0) {
        logger.info('[HTML-RESOLVER] Projeto sem HTML', { projectId })
        return null
      }
      
      return html.trim()
    } catch (error) {
      logger.error('[HTML-RESOLVER] Erro ao buscar HTML do projeto', { projectId, error })
      return null
    }
  }
  
  /**
   * Busca HTML da última mensagem do chat (backup)
   */
  private static async getChatHTML(chatId: string): Promise<string | null> {
    try {
      const { data: messages, error } = await supabaseAdmin
        .from('chat_messages')
        .select('artifacts, metadata')
        .eq('chat_id', chatId)
        .eq('role', 'assistant')
        .not('artifacts', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error || !messages || messages.length === 0) {
        logger.info('[HTML-RESOLVER] Nenhuma mensagem com HTML encontrada', { chatId })
        return null
      }
      
      // Buscar HTML nos artifacts das mensagens mais recentes
      for (const message of messages) {
        const html = this.extractHTMLFromMessage(message)
        if (html) {
          logger.info('[HTML-RESOLVER] HTML extraído de mensagem do chat', { 
            chatId, 
            htmlLength: html.length 
          })
          return html
        }
      }
      
      logger.info('[HTML-RESOLVER] Nenhum HTML válido encontrado nas mensagens', { chatId })
      return null
    } catch (error) {
      logger.error('[HTML-RESOLVER] Erro ao buscar HTML do chat', { chatId, error })
      return null
    }
  }
  
  /**
   * Extrai HTML de uma mensagem, lidando com diferentes estruturas
   */
  private static extractHTMLFromMessage(message: any): string | null {
    const artifacts = message.artifacts
    const metadata = message.metadata
    
    // Tentar extrair de artifacts (estrutura nova)
    if (artifacts && typeof artifacts === 'object') {
      if (artifacts.content && typeof artifacts.content === 'string' && artifacts.type === 'html') {
        return artifacts.content.trim()
      }
      
      if (typeof artifacts === 'string') {
        try {
          const parsed = JSON.parse(artifacts)
          if (parsed.content && typeof parsed.content === 'string' && parsed.type === 'html') {
            return parsed.content.trim()
          }
        } catch (e) {
          // Não é JSON válido
        }
      }
    }
    
    // Tentar extrair de metadata (estrutura legada)
    if (metadata && typeof metadata === 'object') {
      if (metadata.artifacts && metadata.artifacts.content && metadata.artifacts.type === 'html') {
        return metadata.artifacts.content.trim()
      }
    }
    
    return null
  }
  
  /**
   * Salva HTML atualizado no projeto (fonte principal)
   */
  static async saveProjectHTML(projectId: string, html: string, subject?: string): Promise<void> {
    try {
      const updates: any = {
        content: {
          html: html.trim(),
          subject: subject || '',
          text: html.replace(/<[^>]*>/g, '').substring(0, 300), // Extract text preview
          previewText: subject || ''
        },
        updated_at: new Date().toISOString()
      }
      
      const { error } = await supabaseAdmin
        .from('projects')
        .update(updates)
        .eq('id', projectId)
      
      if (error) {
        logger.error('[HTML-RESOLVER] Erro ao salvar HTML do projeto', { projectId, error })
        throw error
      }
      
      logger.info('[HTML-RESOLVER] HTML salvo no projeto', { 
        projectId, 
        htmlLength: html.length,
        hasSubject: !!subject
      })
    } catch (error) {
      logger.error('[HTML-RESOLVER] Erro ao salvar HTML', { projectId, error })
      throw error
    }
  }
  
  /**
   * Determina operação baseada no contexto
   */
  static determineOperation(message: string, hasExistingHTML: boolean, frontendOperation?: string): 'create' | 'edit' | 'improve' {
    // Se o frontend especificou a operação, confiar nele
    if (frontendOperation && ['create', 'edit', 'improve'].includes(frontendOperation)) {
      logger.info('[HTML-RESOLVER] Usando operação do frontend', { 
        operation: frontendOperation, 
        hasExistingHTML 
      })
      return frontendOperation as 'create' | 'edit' | 'improve'
    }
    
    // Lógica simplificada baseada em conteúdo existente
    if (!hasExistingHTML) {
      return 'create'
    }
    
    // Se tem HTML existente, verificar palavras-chave de edição
    const editKeywords = ['mude', 'altere', 'troque', 'edite', 'modifique', 'corrija', 'ajuste', 'substitua']
    const hasEditIntent = editKeywords.some(word => message.toLowerCase().includes(word))
    
    if (hasEditIntent) {
      return 'edit'
    }
    
    return 'improve'
  }
}

export default HTMLResolver