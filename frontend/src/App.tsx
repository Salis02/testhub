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

const HomePage = React.lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const TestPage = React.lazy(() => import('@/pages/TestPage').then((m) => ({ default: m.TestPage })))
const ResultsPage = React.lazy(() => import('@/pages/ResultsPage').then((m) => ({ default: m.ResultsPage })))
const PricingPage = React.lazy(() => import('@/pages/PricingPage').then((m) => ({ default: m.PricingPage })))
const LoginPage = React.lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const AdminPage = React.lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const VerifyCertificatePage = React.lazy(() =>
  import('@/pages/VerifyCertificatePage').then((m) => ({ default: m.VerifyCertificatePage }))
)

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

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
                    <React.Suspense fallback={<PageFallback />}>
                      <Routes>
                        {/* Public Routes (Accessible by all users / non-auth test takers) */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/test/:testId" element={<TestPage />} />
                        <Route path="/results/:resultId" element={<ResultsPage />} />
                        <Route path="/verify/:certificateId" element={<VerifyCertificatePage />} />
                        <Route path="/verify/certificate/:certificateId" element={<VerifyCertificatePage />} />
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
                    </React.Suspense>
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
