import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Connect from './Connect.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Connect />
  </StrictMode>,
)
