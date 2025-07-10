export interface Credits {
  available: number
  used: number
  total: number
  resetAt: Date | null
  unlimited: boolean
}

export interface Subscription {
  id: string
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  planType: 'free' | 'starter' | 'enterprise' | 'unlimited'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PlanFeatures {
  planType: 'free' | 'starter' | 'enterprise' | 'unlimited'
  aiCredits: number | null
  hasFolders: boolean
  hasMultiUser: boolean
  hasHtmlExport: boolean
  hasEmailPreview: boolean
  maxProjects: number | null
}

export interface Folder {
  id: string
  userId: string
  name: string
  color: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface FolderWithProjects extends Folder {
  projectsCount?: number
  subfolders?: FolderWithProjects[]
}

export interface CreateFolderDto {
  name: string
  color?: string
  parentId?: string
}

export interface UpdateFolderDto {
  name?: string
  color?: string
  parentId?: string | null
}

export interface CheckoutSessionRequest {
  priceId: string
  successUrl?: string
  cancelUrl?: string
}

export interface SubscriptionUpdate {
  newPriceId: string
}

export interface UserSubscriptionInfo {
  userId: string
  email: string
  name: string
  planType: 'free' | 'starter' | 'enterprise' | 'unlimited'
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean | null
  creditsAvailable: number
  creditsUsed: number
  creditsResetAt: Date | null
  planCredits: number | null
  hasFolders: boolean
  hasMultiUser: boolean
  hasHtmlExport: boolean
  hasEmailPreview: boolean
  maxProjects: number | null
}