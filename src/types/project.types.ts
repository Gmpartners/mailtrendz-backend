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
  folderId?: string | null
  isFavorite?: boolean
  createdAt: string
  updatedAt: string
  opens?: number
  clicks?: number
  uses?: number
  views?: number
  conversionRate?: number
  createdBy?: string
  lastEditedBy?: string
  lastEditedAt?: string
}

export interface CreateProjectDto {
  name?: string
  description?: string
  type?: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
  industry?: string
  targetAudience?: string
  tone?: string
  prompt?: string
  html?: string
  text?: string
  subject?: string
  previewText?: string
  tags?: string[]
  chatId?: string
  folderId?: string
  images?: Array<{
    uploadUrl?: string
    url?: string
    intent?: 'analyze' | 'include'
  }>
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
  folder_id?: string | null
  is_favorite?: boolean
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
  folder_id?: string
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
  is_favorite: boolean
  chat_id: string | null
  folder_id: string | null
  created_at: string
  updated_at: string
  opens: number
  clicks: number
  uses: number
  views: number
  conversion_rate: number
  created_by?: string
  last_edited_by?: string
  last_edited_at?: string
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
  folderId?: string | null
  // ✅ NOVO: Campo de organização
  organizationId?: string | null
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
  permissions?: {
    canExportHtml: boolean
    canPreviewEmail: boolean
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