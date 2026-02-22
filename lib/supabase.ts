import { createClient } from '@supabase/supabase-js'
import { Item } from './types'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Convert database row (snake_case) to Item (camelCase)
export function rowToItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    raw: row.raw as string,
    title: row.title as string,
    notes: row.notes as string | undefined,
    section: row.section as Item['section'],
    type: row.type as Item['type'],
    effort: row.effort as Item['effort'] | undefined,
    context: row.context as Item['context'],
    delegatedTo: row.delegated_to as string | undefined,
    dueDate: row.due_date as string | undefined,
    completed: row.completed as boolean,
    completedAt: row.completed_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Convert Item (camelCase) to database row (snake_case)
export function itemToRow(item: Item) {
  return {
    id: item.id,
    raw: item.raw,
    title: item.title,
    notes: item.notes ?? null,
    section: item.section,
    type: item.type,
    effort: item.effort ?? null,
    context: item.context,
    delegated_to: item.delegatedTo ?? null,
    due_date: item.dueDate ?? null,
    completed: item.completed,
    completed_at: item.completedAt ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}
