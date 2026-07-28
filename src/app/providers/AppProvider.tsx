import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDefaultAppState } from '../../constants/defaults'
import { loadAppState, saveAppState } from '../../services/storage'
import type { ActivityRecord, AppState, Cycle, Goal, Pig, UserSettings } from '../../types/models'

interface AppContextValue {
  state: AppState
  setActiveCycleId: (cycleId: string | null) => void
  updateSettings: (settings: Partial<UserSettings>) => void
  createCycle: (cycle: Cycle) => void
  addActivityRecord: (record: ActivityRecord) => void
  updateGoal: (goalId: string, updates: Partial<Goal>) => void
  updatePig: (updates: Partial<Pig>) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>(() => getDefaultAppState())

  useEffect(() => {
    const saved = loadAppState()
    if (saved) {
      setState(saved)
    }
  }, [])

  useEffect(() => {
    saveAppState(state)
  }, [state])

  const value = useMemo<AppContextValue>(() => ({
    state,
    setActiveCycleId: (cycleId) => {
      setState((prev) => ({ ...prev, activeCycleId: cycleId }))
    },
    updateSettings: (settings) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...settings,
        },
      }))
    },
    createCycle: (cycle) => {
      setState((prev) => ({
        ...prev,
        cycles: [cycle, ...prev.cycles],
        activeCycleId: cycle.id,
      }))
    },
    addActivityRecord: (record) => {
      setState((prev) => ({
        ...prev,
        activities: [record, ...prev.activities],
      }))
    },
    updateGoal: (goalId, updates) => {
      setState((prev) => ({
        ...prev,
        goals: prev.goals.map((goal) => (goal.id === goalId ? { ...goal, ...updates } : goal)),
      }))
    },
    updatePig: (updates) => {
      setState((prev) => ({
        ...prev,
        pig: {
          ...prev.pig,
          ...updates,
        },
      }))
    },
  }), [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppState() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppState must be used within AppProvider')
  }

  return context
}
