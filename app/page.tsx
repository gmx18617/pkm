'use client'

import { useState, useEffect, useRef } from 'react'
import { Item, Section, Context } from '@/lib/types'
import { supabase, rowToItem, itemToRow } from '@/lib/supabase'
import { nanoid } from 'nanoid'

const SECTIONS: { key: Section; label: string; description: string; color: string; dot: string }[] = [
  { key: 'now', label: 'Now', description: "Today's focus", color: 'border-amber-200 bg-amber-50', dot: 'bg-amber-400' },
  { key: 'this-week', label: 'This Week', description: 'On deck', color: 'border-blue-200 bg-blue-50', dot: 'bg-blue-400' },
  { key: 'watching', label: 'Watching', description: 'Delegated or waiting', color: 'border-purple-200 bg-purple-50', dot: 'bg-purple-400' },
  { key: 'horizon', label: 'Horizon', description: 'Longer term', color: 'border-emerald-200 bg-emerald-50', dot: 'bg-emerald-400' },
  { key: 'someday', label: 'Someday / Read', description: 'Low pressure pile', color: 'border-slate-200 bg-slate-50', dot: 'bg-slate-400' },
]

const EFFORT_LABEL: Record<string, string> = { low: '~15m', medium: '~1h', high: 'Big' }
const CONTEXT_LABEL: Record<string, string> = { work: 'Work', personal: 'Personal', both: 'Both' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ItemCard({ item, onMove, onDelete, onContextChange, onComplete, onUpdate }: {
  item: Item
  onMove: (id: string, section: Section) => void
  onDelete: (id: string) => void
  onContextChange: (id: string, context: Context) => void
  onComplete: (id: string) => void
  onUpdate: (id: string, title: string, notes: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [titleVal, setTitleVal] = useState(item.title)
  const [notesVal, setNotesVal] = useState(item.notes ?? '')
  const titleRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editingTitle) titleRef.current?.focus() }, [editingTitle])
  useEffect(() => { if (editingNotes) notesRef.current?.focus() }, [editingNotes])

  // Keep local state in sync if item changes from another device
  useEffect(() => { setTitleVal(item.title) }, [item.title])
  useEffect(() => { setNotesVal(item.notes ?? '') }, [item.notes])

  function saveTitle() {
    setEditingTitle(false)
    if (titleVal.trim() && titleVal.trim() !== item.title) {
      onUpdate(item.id, titleVal.trim(), notesVal)
    } else {
      setTitleVal(item.title)
    }
  }

  function saveNotes() {
    setEditingNotes(false)
    onUpdate(item.id, titleVal, notesVal)
  }

  return (
    <div className={`group bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-all ${item.completed ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => onComplete(item.id)}
          title={item.completed ? 'Completed' : 'Mark complete'}
          className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            item.completed ? 'bg-emerald-400 border-emerald-400' : 'border-slate-300 hover:border-emerald-400'
          }`}
        >
          {item.completed && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
              <path d="M1.5 5l2.5 2.5 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleVal(item.title); setEditingTitle(false) } }}
              className="w-full text-sm font-medium text-slate-800 border-b border-slate-300 outline-none bg-transparent pb-0.5"
            />
          ) : (
            <p
              onClick={() => !item.completed && setEditingTitle(true)}
              title={item.completed ? undefined : 'Click to edit'}
              className={`text-sm font-medium leading-snug ${!item.completed ? 'text-slate-800 cursor-text hover:text-slate-600' : 'line-through text-slate-400'}`}
            >
              {item.title}
            </p>
          )}

          {editingNotes ? (
            <textarea
              ref={notesRef}
              value={notesVal}
              onChange={e => setNotesVal(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={e => { if (e.key === 'Escape') { setNotesVal(item.notes ?? ''); setEditingNotes(false) } }}
              rows={2}
              className="w-full text-xs text-slate-500 border-b border-slate-300 outline-none bg-transparent resize-none mt-1"
            />
          ) : (
            <p
              onClick={() => !item.completed && setEditingNotes(true)}
              title={item.completed ? undefined : 'Click to edit'}
              className={`text-xs mt-1 leading-snug ${item.completed ? 'text-slate-400' : 'text-slate-500 cursor-text hover:text-slate-400'} ${!item.notes && !item.completed ? 'opacity-0 group-hover:opacity-100 italic' : ''}`}
            >
              {item.notes || 'Add a note…'}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mt-2">
            {item.effort && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                {EFFORT_LABEL[item.effort]}
              </span>
            )}
            <button
              onClick={() => {
                const cycle: Context[] = ['work', 'personal', 'both']
                const next = cycle[(cycle.indexOf(item.context) + 1) % cycle.length]
                onContextChange(item.id, next)
              }}
              title="Click to change context"
              className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {CONTEXT_LABEL[item.context]}
            </button>
            {item.delegatedTo && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">
                → {item.delegatedTo}
              </span>
            )}
            {item.dueDate && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
                {formatDate(item.dueDate)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 text-xs px-1 transition-opacity"
        >
          ···
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 w-full mb-1">Move to:</span>
          {SECTIONS.filter(s => s.key !== item.section).map(s => (
            <button
              key={s.key}
              onClick={() => { onMove(item.id, s.key); setOpen(false) }}
              className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => onDelete(item.id)}
            className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors ml-auto"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [recentlyCaptured, setRecentlyCaptured] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [briefing, setBriefing] = useState('')
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [showBriefing, setShowBriefing] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load items from Supabase, migrate localStorage data if present
  useEffect(() => {
    async function init() {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) { setLoadError(error.message); setLoading(false); return }

      const dbItems = (data ?? []).map(rowToItem)

      // Migrate any existing localStorage items
      const stored = localStorage.getItem('pkm-items')
      if (stored) {
        const localItems: Item[] = JSON.parse(stored)
        const dbIds = new Set(dbItems.map(i => i.id))
        const toMigrate = localItems.filter(i => !dbIds.has(i.id))
        if (toMigrate.length > 0) {
          await supabase.from('items').insert(toMigrate.map(itemToRow))
          dbItems.unshift(...toMigrate)
        }
        localStorage.removeItem('pkm-items')
      }

      setItems(dbItems)
      setLoading(false)
    }
    init()
  }, [])

  // Realtime sync — updates items when another device makes changes
  useEffect(() => {
    const channel = supabase
      .channel('items-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items' }, ({ new: row }) => {
        setItems(prev => {
          if (prev.find(i => i.id === row.id)) return prev
          return [rowToItem(row), ...prev]
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'items' }, ({ new: row }) => {
        setItems(prev => prev.map(i => i.id === row.id ? rowToItem(row) : i))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, ({ old: row }) => {
        setItems(prev => prev.filter(i => i.id !== row.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const todayKey = new Date().toISOString().slice(0, 10)

  async function generateBriefing(currentItems: Item[]) {
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: currentItems }),
      })
      if (!res.ok) throw new Error('Failed')
      const { briefing } = await res.json()
      setBriefing(briefing)
      setShowBriefing(true)
      localStorage.setItem('pkm-briefing', JSON.stringify({ date: todayKey, text: briefing }))
    } catch {
      setBriefing('')
    } finally {
      setBriefingLoading(false)
    }
  }

  // Auto-generate briefing once per day after items load
  useEffect(() => {
    if (loading || loadError) return
    const stored = localStorage.getItem('pkm-briefing')
    if (stored) {
      const { date, text } = JSON.parse(stored)
      if (date === todayKey) { setBriefing(text); return }
    }
    generateBriefing(items)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  async function handleCapture() {
    if (!input.trim() || processing) return
    setProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      })
      if (!res.ok) throw new Error('Processing failed')

      const processed = await res.json()
      const newItem: Item = {
        id: nanoid(),
        raw: input,
        ...processed,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const { error } = await supabase.from('items').insert(itemToRow(newItem))
      if (error) throw error

      setItems(prev => [newItem, ...prev])
      setRecentlyCaptured(newItem.section)
      setInput('')
      textareaRef.current?.focus()
      setTimeout(() => setRecentlyCaptured(null), 3000)
    } catch {
      setError('Something went wrong. Check your API key and try again.')
    } finally {
      setProcessing(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleCapture()
  }

  async function moveItem(id: string, section: Section) {
    const updatedAt = new Date().toISOString()
    setItems(prev => prev.map(i => i.id === id ? { ...i, section, updatedAt } : i))
    await supabase.from('items').update({ section, updated_at: updatedAt }).eq('id', id)
  }

  async function changeContext(id: string, context: Context) {
    const updatedAt = new Date().toISOString()
    setItems(prev => prev.map(i => i.id === id ? { ...i, context, updatedAt } : i))
    await supabase.from('items').update({ context, updated_at: updatedAt }).eq('id', id)
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('items').delete().eq('id', id)
  }

  async function completeItem(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const completed = !item.completed
    const completedAt = completed ? new Date().toISOString() : undefined
    const updatedAt = new Date().toISOString()
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed, completedAt, updatedAt } : i))
    await supabase.from('items').update({ completed, completed_at: completedAt ?? null, updated_at: updatedAt }).eq('id', id)
  }

  async function updateItem(id: string, title: string, notes: string) {
    const updatedAt = new Date().toISOString()
    setItems(prev => prev.map(i => i.id === id ? { ...i, title, notes: notes || undefined, updatedAt } : i))
    await supabase.from('items').update({ title, notes: notes || null, updated_at: updatedAt }).eq('id', id)
  }

  const activeItems = items.filter(i => !i.completed)
  const completedItems = items.filter(i => i.completed)
  const sectionItems = (section: Section) => activeItems.filter(i => i.section === section)
  const sectionLabel = SECTIONS.find(s => s.key === recentlyCaptured)?.label
  const cardProps = { onMove: moveItem, onDelete: deleteItem, onContextChange: changeContext, onComplete: completeItem, onUpdate: updateItem }

  const searchResults = searchQuery.trim()
    ? items.filter(i => {
        const q = searchQuery.toLowerCase()
        return (
          i.title.toLowerCase().includes(q) ||
          (i.notes ?? '').toLowerCase().includes(q) ||
          i.raw.toLowerCase().includes(q) ||
          (i.delegatedTo ?? '').toLowerCase().includes(q)
        )
      })
    : []

  function openSearch() {
    setShowSearch(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function closeSearch() {
    setShowSearch(false)
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Command Center</h1>
            <p className="text-sm text-slate-400 mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            {showSearch ? (
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 16 16">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') closeSearch() }}
                  placeholder="Search everything…"
                  className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-48"
                />
                <button onClick={closeSearch} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
              </div>
            ) : (
              <button onClick={openSearch} title="Search" className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            {briefing && (
              <button
                onClick={() => setShowBriefing(v => !v)}
                className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                {showBriefing ? 'Hide briefing' : 'Show briefing'}
              </button>
            )}
            <div className="flex gap-3 text-xs text-slate-400">
              {loadError ? (
                <span className="text-red-500 text-xs">DB error: {loadError}</span>
              ) : loading ? (
                <span className="text-slate-400 animate-pulse">Loading…</span>
              ) : (
                <>
                  {SECTIONS.map(s => (
                    <span key={s.key} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      {sectionItems(s.key).length}
                    </span>
                  ))}
                  {completedItems.length > 0 && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {completedItems.length} done
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Dump anything here — a thought, a task, a link, a note, a forwarded email. Claude will figure out where it goes."
            className="w-full text-sm text-slate-700 placeholder-slate-400 resize-none border-0 outline-none leading-relaxed"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-400">
              {recentlyCaptured
                ? <span className="text-emerald-600 font-medium">✓ Filed to {sectionLabel}</span>
                : error
                ? <span className="text-red-500">{error}</span>
                : 'Press ⌘↵ to capture'}
            </div>
            <button
              onClick={handleCapture}
              disabled={!input.trim() || processing}
              className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Thinking…' : 'Capture'}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Briefing */}
      {(briefing || briefingLoading) && showBriefing && (
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Today's Briefing</span>
                  {briefingLoading && <span className="text-xs text-indigo-300 animate-pulse">Thinking…</span>}
                </div>
                {briefing && (
                  <p className="text-sm text-indigo-900 leading-relaxed">{briefing}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => generateBriefing(items)}
                  disabled={briefingLoading}
                  title="Refresh briefing"
                  className="text-xs text-indigo-400 hover:text-indigo-600 disabled:opacity-40 transition-colors"
                >
                  ↻
                </button>
                <button
                  onClick={() => setShowBriefing(false)}
                  title="Dismiss"
                  className="text-xs text-indigo-300 hover:text-indigo-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Search results */}
        {showSearch && searchQuery.trim() && (
          <div className="mb-6">
            <p className="text-xs text-slate-400 mb-3">
              {searchResults.length === 0 ? 'No results' : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
            </p>
            <div className="space-y-2">
              {searchResults.map(item => (
                <div key={item.id} className="relative">
                  <span className={`absolute -left-3 top-3 w-2 h-2 rounded-full ${SECTIONS.find(s => s.key === item.section)?.dot ?? 'bg-slate-300'}`} />
                  <ItemCard item={item} {...cardProps} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Normal dashboard — hidden while searching */}
        {(!showSearch || !searchQuery.trim()) && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {SECTIONS.slice(0, 2).map(section => (
                <div key={section.key} className={`rounded-xl border ${section.color} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${section.dot}`} />
                    <h2 className="text-sm font-semibold text-slate-700">{section.label}</h2>
                    <span className="text-xs text-slate-400 ml-auto">{section.description}</span>
                    <span className="text-xs font-medium text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">
                      {sectionItems(section.key).length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sectionItems(section.key).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Nothing here yet</p>
                    ) : (
                      sectionItems(section.key).map(item => (
                        <ItemCard key={item.id} item={item} {...cardProps} />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {SECTIONS.slice(2).map(section => (
                <div key={section.key} className={`rounded-xl border ${section.color} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${section.dot}`} />
                    <h2 className="text-sm font-semibold text-slate-700">{section.label}</h2>
                    <span className="text-xs text-slate-400 ml-auto">{section.description}</span>
                    <span className="text-xs font-medium text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">
                      {sectionItems(section.key).length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sectionItems(section.key).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Nothing here yet</p>
                    ) : (
                      sectionItems(section.key).map(item => (
                        <ItemCard key={item.id} item={item} {...cardProps} />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {completedItems.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h2 className="text-sm font-semibold text-slate-600">Completed</h2>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
                    {completedItems.length}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">{showCompleted ? '▲ hide' : '▼ show'}</span>
                </button>
                {showCompleted && (
                  <div className="space-y-2 mt-3">
                    {completedItems.map(item => (
                      <ItemCard key={item.id} item={item} {...cardProps} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
