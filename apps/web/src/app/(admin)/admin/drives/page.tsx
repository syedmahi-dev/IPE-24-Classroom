import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { HardDrive, Plus, Sparkles, FolderOpen, Database } from 'lucide-react'

export default async function AdminDrivesPage() {
  const session = await auth() as any
  if (!session) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  const actualRole = dbUser ? dbUser.role : session.user.role

  if (actualRole !== 'super_admin') {
    redirect('/admin')
  }

  const drives = await prisma.connectedDrive.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { fileUploads: true }
      }
    }
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto mt-4 relative pb-20">
      <div className="absolute top-0 right-10 -z-10 w-[600px] h-[600px] bg-brand-500/10 dark:bg-brand-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none animate-float" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-brand-100/50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-brand-200/50 dark:border-brand-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Superadmin Only
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <Database className="w-10 h-10 text-brand-500" />
            Drive Manager
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Connect and manage Google Drive accounts for secure file storage.
          </p>
        </div>
        <a 
          href="/api/v1/admin/drives/connect"
          className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-1 hover:shadow-xl"
        >
          <Plus className="w-5 h-5 cursor-pointer" />
          <span className="cursor-pointer">Connect New Drive</span>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        {drives.length === 0 ? (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 glass p-10 rounded-[2rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="w-20 h-20 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <HardDrive className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Drives Connected</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">Connect a Google Drive account to start securely hosting uploaded files.</p>
          </div>
        ) : (
          drives.map((drive: any) => (
            <div key={drive.id} className="glass p-6 rounded-[2rem] relative overflow-hidden group bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-teal-50 dark:from-brand-500/20 dark:to-teal-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-500/30">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg border-none line-clamp-1">{drive.label}</h3>
                  <p className="text-xs font-semibold text-slate-500">{drive.email}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-semibold cursor-pointer">
                  <FolderOpen className="w-4 h-4 cursor-pointer" />
                  Files Stored
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-sm font-bold text-slate-700 dark:text-slate-200">
                  {drive._count.fileUploads}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
