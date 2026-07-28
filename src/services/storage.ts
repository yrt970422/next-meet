import { APP_STORAGE_KEY } from './storageKeys'
import type { AppState } from '../types/models'

export function loadAppState(): AppState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as AppState
  } catch (error) {
    console.warn('Failed to load app state from storage', error)
    return null
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save app state to storage', error)
  }
}

export function clearAppState(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(APP_STORAGE_KEY)
}
