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
      {/* Dashboard Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-borderline gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Konsol Pengajar & Administrasi Ujian
          </h1>
          <p className="text-xs text-ink-muted mt-0.5 font-mono">
            Pusat manajemen kurikulum asesmen, moderasi soal, dan verifikasi esai peserta.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setAiContext('auto')
              setIsAIModalOpen(true)
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-accent/40 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Generator</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Ujian</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation strictly per style.md */}
      <div className="flex items-center space-x-1 border-b border-borderline text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Ikhtisar & Telemetri</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'tests'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Kelola Modul Ujian ({tests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('essays')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'essays'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>Koreksi Esai ({stats.pending_essays} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'subscriptions'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Langganan & Akses</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && <AdminOverview stats={stats} />}

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
