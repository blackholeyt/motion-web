import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { platform } from './platform'
import { ensureProfile } from './store/profile'
import { removeStaleSandboxes } from './app/sandbox'
import { restoreAccount, startAccount } from './sync/account'
import './ui/global.css'

restoreAccount()
void platform.storage.requestPersistence()
void ensureProfile()
void removeStaleSandboxes()
startAccount()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
