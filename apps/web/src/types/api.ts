export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: {
    code: string
    message: string
  } | null
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  } | null
}

export type Role = 'student' | 'admin' | 'super_admin'

export type AnnouncementType = 'general' | 'exam' | 'file_update' | 'routine_update' | 'urgent' | 'event'

export type FileCategory = 'lecture_notes' | 'assignment' | 'past_paper' | 'syllabus' | 'other'
