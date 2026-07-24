import { RunStoreContext } from './runStoreContext.js'

export function RunStoreProvider({ store, children }) {
  return <RunStoreContext.Provider value={store}>{children}</RunStoreContext.Provider>
}
