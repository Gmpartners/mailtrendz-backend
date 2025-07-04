import { ProjectContext } from './ai.types'

export interface EnhancedEmailContent {
  subject: string
  previewText: string
  html: string
  text: string
  css: string
  components: EmailComponent[]
  analysis: PromptAnalysis
  metadata: EmailMetadata
}

export interface PromptAnalysis {
  intentions: Intention[]
  visualRequirements: VisualRequirements
  contentRequirements: ContentRequirements
  confidence: number
  processingTime: number
  originalPrompt: string
}

export interface Intention {
  action: 'create' | 'modify' | 'improve' | 'redesign' | 'customize'
  target: 'subject' | 'content' | 'layout' | 'colors' | 'typography' | 'cta' | 'images'
  specification?: string
  priority?: number
  scope?: 'global' | 'section' | 'element'
  confidence: number
}

export interface VisualRequirements {
  colorScheme?: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
    style?: 'vibrant' | 'muted' | 'professional' | 'playful'
  }
  layout?: {
    type?: 'single-column' | 'two-column' | 'grid' | 'hero-focused'
    alignment?: 'left' | 'center' | 'right'
    density?: 'compact' | 'normal' | 'spacious'
  }
  typography?: {
    style?: 'modern' | 'classic' | 'bold' | 'elegant'
    size?: 'small' | 'medium' | 'large'
    emphasis?: 'subtle' | 'normal' | 'strong'
  }
  components?: {
    ctaStyle?: 'button' | 'link' | 'banner'
    imageStyle?: 'minimal' | 'bordered' | 'shadow'
    sectionStyle?: 'clean' | 'divided' | 'cards'
  }
  primaryColor?: string
}

export interface ContentRequirements {
  tone: 'professional' | 'casual' | 'urgent' | 'friendly' | 'formal' | 'persuasive'
  length: 'short' | 'medium' | 'long'
  focus: Array<'conversion' | 'information' | 'engagement' | 'branding' | 'sales' | 'promotion'>
  urgency: 'low' | 'medium' | 'high'
  personalization: 'none' | 'basic' | 'advanced'
}

export interface EmailComponent {
  id: string
  type: ComponentType
  order: number
  props: Record<string, any>
  styling: ComponentStyling
  responsive: ResponsiveRules
}

export type ComponentType = 
  | 'header' 
  | 'hero' 
  | 'content' 
  | 'cta' 
  | 'footer' 
  | 'product' 
  | 'social' 
  | 'divider' 
  | 'image' 
  | 'text'
  | 'newsletter-header'
  | 'promotional-banner'
  | 'testimonial'

export interface ComponentStyling {
  backgroundColor?: string
  textColor?: string
  borderRadius?: string
  padding?: string
  margin?: string
  fontSize?: string
  fontWeight?: string
  textAlign?: 'left' | 'center' | 'right'
  borderWidth?: string
  borderColor?: string
  shadowLevel?: 'none' | 'subtle' | 'medium' | 'strong'
}

export interface ResponsiveRules {
  mobile: Partial<ComponentStyling>
  tablet?: Partial<ComponentStyling>
  desktop?: Partial<ComponentStyling>
}

export interface EmailMetadata {
  version: string
  generated: Date
  model: string
  tokens: number
  qualityScore: number
  compatibilityScore: number
  accessibilityScore: number
  estimatedRenderTime: number
  supportedClients: string[]
  enhancedFeatures: string[]
  processingTime: number
  isValidHTML?: boolean
  htmlValidation?: {
    issues: string[]
    fixes: string[]
    qualityBreakdown: Record<string, any>
  }
}

export interface UserHistory {
  preferences: {
    colorScheme?: string
    layoutStyle?: string
    typographyStyle?: string
    preferredTone?: string
  }
  patterns: Array<{
    pattern: string
    frequency: number
    lastUsed: Date
  }>
  feedback: Array<{
    message: string
    satisfaction: number
    timestamp: Date
  }>
}

export interface SmartEmailRequest {
  prompt: string
  projectContext: ProjectContext
  userHistory?: UserHistory
  useEnhanced?: boolean
  preferences?: UserPreferences
}

export interface UserPreferences {
  preferredStyle: 'modern' | 'classic' | 'creative'
  defaultColors: {
    primary: string
    secondary: string
    accent: string
  }
  layoutPreference: 'single-column' | 'two-column' | 'auto'
  complexityLevel: 'simple' | 'moderate' | 'advanced'
}

export interface EnhancedChatResponse {
  response: string
  shouldUpdateEmail: boolean
  analysis: PromptAnalysis
  suggestions: string[]
  enhancedContent?: EnhancedEmailContent
  metadata: {
    model: string
    tokens: number
    confidence: number
    enhancedFeatures: string[]
    processingTime: number
    appliedModifications?: boolean
    validationResults?: string[]
  }
}
