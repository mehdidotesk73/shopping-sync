import { createApp } from 'vue'
import App from './App.vue'
import { setupPWA } from './pwa'
import { installGlobalErrorLogging, logDebug } from './debug'
import './styles/vars.css'

installGlobalErrorLogging()

const app = createApp(App)

// Vue wraps errors thrown inside template event handlers (e.g. a button's @click) and,
// with no errorHandler set, only console.error()s them — invisible with no console on a
// phone. Route them into the same on-screen log as everything else.
app.config.errorHandler = (err, _instance, info) => {
  const message = err instanceof Error ? err.message : String(err)
  logDebug(`Vue error (${info}): ${message}`, 'error')
}

setupPWA()

app.mount('#app')
