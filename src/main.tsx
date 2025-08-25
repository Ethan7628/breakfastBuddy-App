import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Type-safe root element check
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

// Register Service Worker with advanced options and immediate updates
const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
        updateSW(true) // Auto-update for faster refresh
    },
    onOfflineReady() {
        console.log('App is now ready for offline use')
    },
    onRegistered(registration) {
        console.log('Service Worker registered:', registration)
        // Check for updates every 30 seconds for faster updates
        setInterval(() => {
            registration?.update();
        }, 30000);
    },
    onRegisterError(error) {
        console.error('SW registration failed:', error)
    }
})

// Render the app
createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)