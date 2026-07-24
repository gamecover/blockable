import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import { normalRunStore } from './useRunStore.js'

export const RunStoreContext = createContext(normalRunStore)
export const useRunStore = () => useStore(useContext(RunStoreContext))
export const useRunStoreApi = () => useContext(RunStoreContext)
