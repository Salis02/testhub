import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ConfirmProvider } from '@/context/ConfirmContext'
import { Header } from '@/components/common/Header'
import { Footer } from '@/components/common/Footer'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { TestPage } from '@/pages/TestPage'
import { ResultsPage } from '@/pages/ResultsPage'
import { PricingPage } from '@/pages/PricingPage'
import { LoginPage } from '@/pages/LoginPage'
import { AdminPage } from '@/pages/AdminPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-canvas text-ink transition-colors selection:bg-accent/20 selection:text-accent">
            <Header />
            <main className="flex-1">
              <Routes>
                {/* Public Routes (Accessible by all users / non-auth test takers) */}
                <Route path="/" element={<HomePage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/test/:testId" element={<TestPage />} />
                <Route path="/results/:resultId" element={<ResultsPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Routes (Restricted: Administrator and Creator only) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'creator']}>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
)
}

export default App
