import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ThemeProvider } from './components/theme-provider'
import RealtimeProvider from './components/RealtimeProvider'
import { queryClient } from './lib/query-client'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="pm-tool-theme">
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <App />
        </RealtimeProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
