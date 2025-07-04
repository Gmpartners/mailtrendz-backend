export interface IProject {
  id: string
  userId: string
  name: string
  description?: string
  type: string
  status: string
  content: any
  structure: any
  metadata: any
  tags: string[]
  color: string
  isPublic: boolean
  chatId?: string | null
  createdAt: string
  updatedAt: string
  opens?: number
  clicks?: number
  uses?: number
  views?: number
  conversionRate?: number
}

// ✅ CORREÇÃO: Tornar 'name' opcional no CreateProjectDto
export interface CreateProjectDto {
  name?: string // ✅ AGORA É OPCIONAL - será gerado automaticamente se não fornecido
  description?: string
  type?: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
  industry?: string
  targetAudience?: string
  tone?: string
  prompt?: string
  html?: string // ✅ TORNAR OPCIONAL TAMBÉM
  text?: string // ✅ TORNAR OPCIONAL TAMBÉM
  subject?: string // ✅ TORNAR OPCIONAL TAMBÉM
  previewText?: string
  tags?: string[]
  chatId?: string
  images?: Array<{
    uploadUrl?: string
    url?: string
    intent?: 'analyze' | 'include'
  }> // ✅ ADICIONADO CAMPO IMAGES
}

export interface UpdateProjectDto {
  name?: string
  description?: string
  type?: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
  status?: 'draft' | 'active' | 'archived'
  content?: {
    html?: string
    text?: string
    subject?: string
    previewText?: string
  }
  metadata?: {
    industry?: string
    targetAudience?: string
    tone?: string
    lastImprovement?: {
      feedback: string
      timestamp: string
      version: number
    }
  }
  tags?: string[]
  isPublic?: boolean
}

export interface ProjectQuery {
  search?: string
  type?: string
  status?: string
  tags?: string[]
  sortBy?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface ProjectStats {
  total: number
  byType: Record<string, {
    count: number
    avgOpens: number
    avgClicks: number
  }>
  totalOpens: number
  totalClicks: number
  totalUses: number
  avgConversionRate: number
}

export interface ProjectWithStats {
  id: string
  user_id: string
  name: string
  description: string
  type: string
  status: string
  content: any
  structure: any
  metadata: any
  tags: string[]
  color: string
  is_public: boolean
  chat_id: string | null
  created_at: string
  updated_at: string
  opens: number
  clicks: number
  uses: number
  views: number
  conversion_rate: number
}

export interface ProjectFilters {
  userId?: string
  search?: string
  type?: string
  status?: string
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  isPublic?: boolean
  pagination?: {
    page: number
    limit: number
  }
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
}

export interface ProjectResponse {
  project: IProject
  stats?: {
    opens: number
    clicks: number
    uses: number
    views: number
    conversionRate: number
  }
}

export interface ProjectAnalytics {
  projectId: string
  period: string
  metrics: {
    opens: number
    clicks: number
    uses: number
    views: number
    conversionRate: number
  }
  timeline: Array<{
    date: string
    opens: number
    clicks: number
    uses: number
    views: number
  }>
  topReferrers: Array<{
    source: string
    count: number
    percentage: number
  }>
}

export interface DuplicateProjectResponse {
  original: IProject
  duplicate: IProject
  message: string
}