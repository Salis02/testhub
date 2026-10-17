import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Test, Question, AdminStats, EssaySubmission } from '@/types'
import { adminApi } from '@/services/admin.api'
import { AdminOverview } from '@/components/admin/AdminOverview'
import { TestManagement } from '@/components/admin/TestManagement'
import { EssayGradingView } from '@/components/admin/EssayGradingView'
import { SubscriptionManagement } from '@/components/admin/SubscriptionManagement'
import { TestCreatorModal } from '@/components/admin/TestCreatorModal'
import { TestEditorModal } from '@/components/admin/TestEditorModal'
import { AIAssistantModal } from '@/components/admin/AIAssistantModal'
import { TestAnalyticsModal } from '@/components/admin/TestAnalyticsModal'
import { AdminOverviewSkeleton } from '@/components/common/Skeleton'
import { LayoutDashboard, FileSpreadsheet, FileEdit, Sparkles, Plus, CreditCard } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

type TabType = 'overview' | 'tests' | 'essays' | 'subscriptions'


export const AdminPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [editingTestId, setEditingTestId] = useState<string | null>(null)
  const [analyticsTest, setAnalyticsTest] = useState<Test | null>(null)
  const [pendingAIQuestions, setPendingAIQuestions] = useState<Question[]>([])
  const [aiContext, setAiContext] = useState<'create' | 'edit' | 'auto'>('auto')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  // 1. Declarative Server State with Auto-caching & Deduping
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: ({ signal }) => adminApi.getStats(signal),
    enabled: isAuthenticated,
  })

  const { data: tests = [], isLoading: loadingTests } = useQuery({
    queryKey: ['admin', 'tests'],
    queryFn: ({ signal }) => adminApi.listTests(signal),
    enabled: isAuthenticated,
  })

  const { data: essays = [], isLoading: loadingEssays } = useQuery({
    queryKey: ['admin', 'essays'],
    queryFn: ({ signal }) => adminApi.getPendingEssays(signal),
    enabled: isAuthenticated,
  })

  // 2. Targeted Mutations with Granular Cache Invalidation
  const togglePublishMutation = useMutation({
    mutationFn: (testId: string) => adminApi.togglePublish(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (err: Error) => {
      toast.error('Gagal Mengubah Status', err.message)
    },
  })

  const deleteTestMutation = useMutation({
    mutationFn: (testId: string) => adminApi.deleteTest(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (err: Error) => {
      toast.error('Gagal Menghapus Modul', err.message)
    },
  })

  const createTestMutation = useMutation({
    mutationFn: ({
      testData,
      questions,
    }: {
      testData: Omit<Test, 'id' | 'created_at' | 'updated_at'>
      questions: Question[]
    }) => adminApi.createTest(testData, questions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      setActiveTab('tests')
    },
    onError: (err: Error) => {
      toast.error('Gagal Membuat Modul', err.message)
    },
  })

  const gradeEssayMutation = useMutation({
    mutationFn: ({ essayId, score, note }: { essayId: string; score: number; note: string }) =>
      adminApi.gradeEssay(essayId, score, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'essays'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (err: Error) => {
      toast.error('Gagal Menyimpan Penilaian', err.message)
    },
  })

  const handleTogglePublish = async (testId: string) => {
    await togglePublishMutation.mutateAsync(testId)
  }

  const handleDeleteTest = async (testId: string) => {
    await deleteTestMutation.mutateAsync(testId)
  }

  const handleCreateTest = async (
    testData: Omit<Test, 'id' | 'created_at' | 'updated_at'>,
    questions: Question[]
  ) => {
    await createTestMutation.mutateAsync({ testData, questions })
  }

  const handleGradeEssay = async (essayId: string, score: number, note: string) => {
    await gradeEssayMutation.mutateAsync({ essayId, score, note })
  }

  const handleDataRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  if (loadingStats || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <AdminOverviewSkeleton />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Cockpit Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-borderline gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wider">
              Executive Console • Pusat Kendali
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1">
            Dashboard Administrasi & Asesmen
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Pusat manajemen kurikulum asesmen, bank soal, verifikasi lembar esai, dan monetisasi.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              setAiContext('auto')
              setIsAIModalOpen(true)
            }}
            className="btn-press inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-accent/40 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Question Generator</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-press inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Ujian Baru</span>
          </button>
        </div>
      </div>

      {/* Cockpit Navigation Segmented Switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex p-1 rounded-lg bg-surface border border-borderline shadow-2xs max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-canvas text-accent shadow-xs font-semibold border border-borderline'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Ikhtisar Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'tests'
                ? 'bg-canvas text-accent shadow-xs font-semibold border border-borderline'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Modul & Bank Soal</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                activeTab === 'tests'
                  ? 'bg-accent/15 text-accent font-bold'
                  : 'bg-canvas border border-borderline text-ink-muted'
              }`}
            >
              {tests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('essays')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'essays'
                ? 'bg-canvas text-accent shadow-xs font-semibold border border-borderline'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Koreksi Esai</span>
            {stats.pending_essays > 0 ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                {stats.pending_essays}
              </span>
            ) : (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                  activeTab === 'essays'
                    ? 'bg-accent/15 text-accent font-bold'
                    : 'bg-canvas border border-borderline text-ink-muted'
                }`}
              >
                0
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-canvas text-accent shadow-xs font-semibold border border-borderline'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Paket Langganan</span>
          </button>
        </div>

        {activeTab !== 'overview' && (
          <button
            onClick={() => setActiveTab('overview')}
            className="text-xs font-medium text-ink-muted hover:text-accent flex items-center space-x-1 transition-colors"
          >
            <span>&larr; Kembali ke Ikhtisar</span>
          </button>
        )}
      </div>

      {/* Dashboard View Sections */}
      {activeTab === 'overview' && (
        <AdminOverview
          stats={stats}
          tests={tests}
          essays={essays}
          onSelectTab={setActiveTab}
          onOpenCreateModal={() => {
            setAiContext('create')
            setIsCreateModalOpen(true)
          }}
          onOpenAIModal={() => {
            setAiContext('auto')
            setIsAIModalOpen(true)
          }}
          onEditTest={(testId) => {
            setEditingTestId(testId)
          }}
        />
      )}

      {activeTab === 'tests' && (
        <TestManagement
          tests={tests}
          onTogglePublish={handleTogglePublish}
          onDeleteTest={handleDeleteTest}
          onOpenCreateModal={() => {
            setAiContext('create')
            setIsCreateModalOpen(true)
          }}
          onEditTest={(testId) => {
            setEditingTestId(testId)
          }}
          onViewAnalytics={(test) => {
            setAnalyticsTest(test)
          }}
        />
      )}

      {activeTab === 'essays' && (
        <EssayGradingView submissions={essays} onGrade={handleGradeEssay} />
      )}

      {activeTab === 'subscriptions' && (
        <SubscriptionManagement tests={tests} isLoadingTests={loadingTests} />
      )}


      {/* Modals */}
      {isCreateModalOpen && (
        <TestCreatorModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateTest}
          onOpenAIAssistant={() => {
            setAiContext('create')
            setIsAIModalOpen(true)
          }}
          pendingAIQuestions={aiContext === 'create' ? pendingAIQuestions : []}
          onClearPendingAIQuestions={() => setPendingAIQuestions([])}
        />
      )}

      {!!editingTestId && (
        <TestEditorModal
          isOpen={!!editingTestId}
          testId={editingTestId}
          onClose={() => setEditingTestId(null)}
          onUpdated={handleDataRefresh}
          onOpenAIAssistant={() => {
            setAiContext('edit')
            setIsAIModalOpen(true)
          }}
          pendingAIQuestions={aiContext === 'edit' ? pendingAIQuestions : []}
          onClearPendingAIQuestions={() => setPendingAIQuestions([])}
        />
      )}

      {isAIModalOpen && (
        <AIAssistantModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          onAppendQuestions={async (newQuestions) => {
            if (aiContext === 'create') {
              setPendingAIQuestions(newQuestions)
              return
            }

            if (aiContext === 'edit' && editingTestId) {
              setPendingAIQuestions(newQuestions)
              return
            }

            // Auto-create test if generated directly from main overview dashboard
            if (newQuestions.length > 0) {
              await adminApi.createTest(
                {
                  title: `Simulasi Otomatis AI: ${newQuestions[0].question_text.substring(0, 35)}...`,
                  description: 'Modul ujian hasil kurasi otomatis AI Agent.',
                  category: 'custom',
                  duration_minutes: 15,
                  passing_score_percentage: 60,
                  total_questions: newQuestions.length,
                  published: true,
                },
                newQuestions
              )
              handleDataRefresh()
              toast.success('Modul AI Ditambahkan', 'Modul ujian berbasis AI berhasil disimpan ke bank soal!')
            }
          }}
        />
      )}

      {/* Test Performance & Submissions Analytics Modal */}
      {analyticsTest && (
        <TestAnalyticsModal
          isOpen={!!analyticsTest}
          onClose={() => setAnalyticsTest(null)}
          testId={analyticsTest.id}
          testTitle={analyticsTest.title}
        />
      )}
    </div>
  )
}
