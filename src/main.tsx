import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import { lockPortraitOrientation } from './utils/device'
import './styles/globals.css'

void lockPortraitOrientation()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
