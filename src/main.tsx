import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { initPerformanceObserver, preloadCriticalResources } from './utils/performance'
import { persistentCache } from './utils/cache'

// Type-safe root element check
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

// Register Service Worker with advanced options
const updateSW = registerSW({
    onNeedRefresh() {
        // Use a custom UI (e.g., Toast/Snackbar) instead of confirm()
        if (window.confirm('New update available! Reload to get the latest features?')) {
            updateSW(true) // Force reload
        }
    },
    onOfflineReady() {
        console.log('App is now ready for offline use')
        // Optional: Show "Ready for offline" notification
    },
    onRegistered(registration) {
        console.log('Service Worker registered:', registration)
    },
    onRegisterError(error) {
        console.error('SW registration failed:', error)
    }
})

// Initialize performance monitoring and optimizations
initPerformanceObserver();
preloadCriticalResources();

// Initialize persistent cache
persistentCache.init().catch(console.error);

// Render the app
createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)