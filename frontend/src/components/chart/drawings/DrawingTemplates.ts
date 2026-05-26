import type { DrawingData } from '../DrawingTypes'

const STORAGE_KEY = 'te_drawing_templates'

interface DrawingTemplate {
  name: string
  description: string
  drawings: DrawingData[]
  createdAt: string
}

function loadTemplates(): Record<string, DrawingTemplate> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveTemplates(templates: Record<string, DrawingTemplate>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch {
    console.warn('Failed to save drawing templates: localStorage may be full')
  }
}

export function saveDrawingTemplate(name: string, drawings: DrawingData[], description = ''): boolean {
  if (!name.trim()) return false
  const templates = loadTemplates()
  if (templates[name]) {
    return false
  }
  templates[name] = {
    name,
    description,
    drawings: drawings.map(d => ({ ...d })),
    createdAt: new Date().toISOString(),
  }
  saveTemplates(templates)
  return true
}

export function loadDrawingTemplate(name: string): DrawingData[] | null {
  const templates = loadTemplates()
  const tmpl = templates[name]
  if (!tmpl) return null
  return tmpl.drawings.map(d => ({ ...d }))
}

export function deleteDrawingTemplate(name: string): boolean {
  const templates = loadTemplates()
  if (!templates[name]) return false
  delete templates[name]
  saveTemplates(templates)
  return true
}

export function listDrawingTemplates(): { name: string; description: string; createdAt: string; count: number }[] {
  const templates = loadTemplates()
  return Object.values(templates)
    .map(t => ({ name: t.name, description: t.description, createdAt: t.createdAt, count: t.drawings.length }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function renameDrawingTemplate(oldName: string, newName: string): boolean {
  if (!newName.trim() || oldName === newName) return false
  const templates = loadTemplates()
  if (!templates[oldName] || templates[newName]) return false
  templates[newName] = { ...templates[oldName], name: newName }
  delete templates[oldName]
  saveTemplates(templates)
  return true
}

export function templateExists(name: string): boolean {
  return name in loadTemplates()
}
