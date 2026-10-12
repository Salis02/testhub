import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { Header } from '@/components/common/Header'
import { Footer } from '@/components/common/Footer'
import { HomePage } from '@/pages/HomePage'
import { TestPage } from '@/pages/TestPage'
import { ResultsPage } from '@/pages/ResultsPage'
import { PricingPage } from '@/pages/PricingPage'
import { LoginPage } from '@/pages/LoginPage'
import { AdminPage } from '@/pages/AdminPage'
import { initLocalStorage } from '@/services/api'

export function App() {
  useEffect(() => {
    initLocalStorage()
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-canvas text-ink transition-colors selection:bg-accent/20 selection:text-accent">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/test/:testId" element={<TestPage />} />
                <Route path="/results/:resultId" element={<ResultsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
