import { Types } from 'mongoose'

export interface IProject {
  _id: Types.ObjectId
  id?: string // ADICIONADO PARA COMPATIBILIDADE - será sempre o _id.toString()
  userId: Types.ObjectId
  name: string
  description: string
  type: 'welcome' | 'newsletter' | 'campaign' | 'promotional' | 'announcement' | 'follow-up'
  status: 'draft' | 'active' | 'completed'
  content: {
    html: string
    text: string
    subject: string
    previewText?: string
  }
  metadata: {
    industry: string
    targetAudience?: string
    tone?: string
    originalPrompt: string
    version?: number
    lastImprovement?: {
      feedback: string
      timestamp: Date
      version: number
    }
  }
  stats: {
    opens: number
    clicks: number
    uses: number
    views: number
  }
  tags: string[]
  color: string
  isPublic: boolean
  chatId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface CreateProjectDto {
  prompt: string
  type?: 'welcome' | 'newsletter' | 'campaign' | 'promotional' | 'announcement' | 'follow-up'
  industry?: string
  targetAudience?: string
  tone?: string
}

export interface UpdateProjectDto {
  name?: string
  description?: string
  type?: 'welcome' | 'newsletter' | 'campaign' | 'promotional' | 'announcement' | 'follow-up'
  status?: 'draft' | 'active' | 'completed'
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
    version?: number
    lastImprovement?: {
      feedback: string
      timestamp: Date
      version: number
    }
  }
  tags?: string[]
  color?: string
  isPublic?: boolean
}

export interface ProjectFilters {
  userId: string
  search?: string
  type?: string
  category?: string
  status?: string
  tags?: string[]
  pagination: {
    page: number
    limit: number
  }
  sort: {
    field: string
    order: 'asc' | 'desc'
  }
}

export interface ProjectResponse {
  projects: IProject[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  }
  stats: {
    total: number
    drafts: number
    completed: number
    recent: number
  }
}

export interface ProjectAnalytics {
  projectId: string
  name: string
  type: string
  createdAt: Date
  stats: {
    opens: number
    clicks: number
    uses: number
    views: number
    conversionRate: number
  }
  timeline: {
    date: Date
    opens: number
    clicks: number
    uses: number
  }[]
  improvements: {
    date: Date
    feedback: string
    version: number
  }[]
  performance: {
    openRate: number
    clickRate: number
    engagement: number
    trend: 'up' | 'down' | 'stable'
  }
}

// Corrigir DuplicateProjectResponse para ser igual a IProject
export type DuplicateProjectResponse = IProject