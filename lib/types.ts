export type Section = 'now' | 'this-week' | 'watching' | 'horizon' | 'someday'
export type ItemType = 'task' | 'note' | 'reference' | 'delegated' | 'read'
export type Effort = 'low' | 'medium' | 'high'
export type Context = 'work' | 'personal' | 'both'

export interface Item {
  id: string
  raw: string
  title: string
  notes?: string
  section: Section
  type: ItemType
  effort?: Effort
  context: Context
  delegatedTo?: string
  dueDate?: string
  completed: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ProcessedItem {
  title: string
  notes?: string
  section: Section
  type: ItemType
  effort?: Effort
  context: Context
  delegatedTo?: string
  dueDate?: string
}
