import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Test, Question, AdminStats, EssaySubmission } from '@/types'
import { api } from '@/services/api'
import { AdminOverview } from '@/components/admin/AdminOverview'
import { TestManagement } from '@/components/admin/TestManagement'
import { EssayGradingView } from '@/components/admin/EssayGradingView'
import { TestCreatorModal } from '@/components/admin/TestCreatorModal'
import { AIAssistantModal } from '@/components/admin/AIAssistantModal'
import { AdminOverviewSkeleton } from '@/components/common/Skeleton'
import { LayoutDashboard, FileSpreadsheet, FileEdit, Sparkles, Plus } from 'lucide-react'

type TabType = 'overview' | 'tests' | 'essays'

export const AdminPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [essays, setEssays] = useState<EssaySubmission[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadData()
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      const [s, t, e] = await Promise.all([
        api.getAdminStats(),
        api.listTests(),
        api.adminGetPendingEssays(),
      ])
      setStats(s)
      setTests(t)
      setEssays(e)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublish = async (testId: string) => {
    await api.adminTogglePublish(testId)
    await loadData()
  }

  const handleDeleteTest = async (testId: string) => {
    await api.adminDeleteTest(testId)
    await loadData()
  }

  const handleCreateTest = async (
    testData: Omit<Test, 'id' | 'created_at' | 'updated_at'>,
    questions: Question[]
  ) => {
    await api.adminCreateTest(testData, questions)
    await loadData()
    setActiveTab('tests')
  }

  const handleGradeEssay = async (essayId: string, score: number, note: string) => {
    await api.adminGradeEssay(essayId, score, note)
    await loadData()
  }

  if (loading || !stats) {
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
            onClick={() => setIsAIModalOpen(true)}
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
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && <AdminOverview stats={stats} />}

      {activeTab === 'tests' && (
        <TestManagement
          tests={tests}
          onTogglePublish={handleTogglePublish}
          onDeleteTest={handleDeleteTest}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      )}

      {activeTab === 'essays' && (
        <EssayGradingView submissions={essays} onGrade={handleGradeEssay} />
      )}

      {/* Modals */}
      <TestCreatorModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTest}
        onOpenAIAssistant={() => {
          setIsCreateModalOpen(false)
          setIsAIModalOpen(true)
        }}
      />

      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAppendQuestions={async (newQuestions) => {
          // Open create modal with pre-generated questions or auto-create test
          if (newQuestions.length > 0) {
            await api.adminCreateTest(
              {
                title: `Simulasi Otomatis AI: ${newQuestions[0].question_text.substring(0, 35)}...`,
                description: 'Modul ujian hasil kurasi otomatis AI Agent sesuai batasan AI_AGENT_AND_SECURITY.md.',
                category: 'custom',
                duration_minutes: 15,
                passing_score_percentage: 60,
                total_questions: newQuestions.length,
                published: true,
              },
              newQuestions
            )
            await loadData()
            alert('Modul ujian AI berhasil ditambahkan ke bank soal!')
          }
        }}
      />
    </div>
  )
}
