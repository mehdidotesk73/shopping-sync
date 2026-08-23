import { reactive } from 'vue'

interface LogEntry {
  time: string
  kind: 'log' | 'error' | 'warn'
  msg: string
}

export const debugState = reactive({
  logs: [] as LogEntry[],
})

export function logDebug(msg: string, kind: 'log' | 'error' | 'warn' = 'log') {
  const time = new Date().toLocaleTimeString()
  debugState.logs.push({ time, kind, msg })

  // Keep only the last 100 entries to avoid memory bloat
  if (debugState.logs.length > 100) {
    debugState.logs.shift()
  }

  // Also log to console for dev
  if (kind === 'error') {
    console.error(`[${time}] ${msg}`)
  } else if (kind === 'warn') {
    console.warn(`[${time}] ${msg}`)
  } else {
    console.log(`[${time}] ${msg}`)
  }
}

/**
 * Feeds uncaught errors and unhandled promise rejections into the same on-screen log,
 * since there's no console on a phone to catch them otherwise — a thrown error inside a
 * click handler (e.g. Save) would otherwise fail completely silently.
 */
export function installGlobalErrorLogging() {
  window.addEventListener('error', (event) => {
    logDebug(`Uncaught error: ${event.message} (${event.filename}:${event.lineno})`, 'error')
  })
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason)
    logDebug(`Unhandled promise rejection: ${reason}`, 'error')
  })
}
