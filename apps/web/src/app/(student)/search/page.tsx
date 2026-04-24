import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { FileText, Megaphone, Clock, FileWarning, Sparkles, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export const metadata: Metadata = {
  title: 'Search Results',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const query = typeof searchParams.q === 'string' ? searchParams.q : ''

  if (!query) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-10 mt-2 md:mt-4">
        <div className="glass p-12 rounded-[2.5rem] text-center flex flex-col items-center">
          <Sparkles className="w-16 h-16 text-brand-400 mb-6" />
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">Search IPE-24</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Type something in the top bar to begin searching.</p>
        </div>
      </div>
    )
  }

  // Perform parallel queries
  const [announcements, files, exams] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        author: { select: { name: true, role: true } },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fileUpload.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      include: {
        course: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.exam.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        course: true,
      },
      take: 5,
      orderBy: { examDate: 'asc' },
    }),
  ])

  const totalResults = announcements.length + files.length + exams.length

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-10 mt-2 md:mt-4 animate-fade-in relative z-10">
      
      {/* Header */}
      <div className="glass p-8 md:p-10 rounded-[2.5rem] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -z-10" />
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">
          Search Results for <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-indigo-600">"{query}"</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Found {totalResults} {totalResults === 1 ? 'result' : 'results'} across all categories.
        </p>
      </div>

      {totalResults === 0 ? (
        <div className="glass p-16 rounded-[2.5rem] text-center flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <SearchIcon className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">No results found</h2>
          <p className="text-slate-500 dark:text-slate-400">We couldn't find anything matching "{query}". Try adjusting your keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Resources/Files */}
            {files.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  Study Resources
                </h2>
                <div className="grid gap-4">
                  {files.map(file => (
                    <a 
                      key={file.id} 
                      href={file.downloadUrl || file.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass p-5 rounded-2xl hover:border-brand-300 dark:hover:border-brand-700 transition-colors group flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 transition-colors">
                        <FileText className="w-6 h-6 text-slate-400 group-hover:text-brand-500 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {file.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {file.course && (
                            <span className="font-semibold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {file.course.code}
                            </span>
                          )}
                          <span className="uppercase tracking-wider font-bold opacity-70">
                            {formatBytes(file.sizeBytes)}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  Announcements
                </h2>
                <div className="grid gap-4">
                  {announcements.map(announcement => (
                    <Link 
                      key={announcement.id} 
                      href={`/announcements`}
                      className="glass p-5 rounded-2xl hover:border-amber-300 dark:hover:border-amber-700 transition-colors group flex items-start gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md ${
                            announcement.type === 'urgent' 
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {announcement.type}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-1">
                          {announcement.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          {announcement.body}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-8">
            {/* Exams */}
            {exams.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  Exams
                </h2>
                <div className="grid gap-4">
                  {exams.map(exam => (
                    <div key={exam.id} className="glass p-5 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 rounded-l-2xl"></div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {exam.title}
                      </h3>
                      {exam.course && (
                        <p className="text-xs font-bold text-indigo-500 mt-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {exam.course.code} - {exam.course.name}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                          {format(new Date(exam.examDate), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      {exam.description && (
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          {exam.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
