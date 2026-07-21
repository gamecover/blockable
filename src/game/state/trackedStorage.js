const listeners = new Set()
let status = 'saved'
let writeVersion = 0

const publish = (nextStatus) => {
  status = nextStatus
  listeners.forEach((listener) => listener())
}

export const trackedLocalStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    const version = ++writeVersion
    publish('saving')
    try {
      localStorage.setItem(name, value)
      queueMicrotask(() => { if (version === writeVersion) publish('saved') })
    } catch (error) {
      publish('failed')
      throw error
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
}

export const saveStatusStore = {
  getSnapshot: () => status,
  subscribe: (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
