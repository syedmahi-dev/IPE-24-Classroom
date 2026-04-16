'use client'

import { useEffect, useState, useCallback } from 'react'
import { Vote, ChevronRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function PollsPage() {
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [votingId, setVotingId] = useState<string | null>(null)

  const fetchPolls = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/polls?page=${page}&limit=10`)
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      setPolls(result.data)
      setTotalPages(result.meta.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchPolls()
  }, [fetchPolls])

  const handleVote = async (pollId: string, optionIndex: number) => {
    try {
      setVotingId(pollId)
      const res = await fetch('/api/v1/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionIndex })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      toast.success('Vote recorded successfully!')
      fetchPolls()
    } catch (error: any) {
      toast.error(error.message || 'Failed to vote')
    } finally {
      setVotingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 pb-6 md:pb-20">
      <div className="relative group overflow-hidden rounded-2xl md:rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative glass p-5 md:p-14 flex flex-col items-center justify-center text-center z-10">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/40 mb-3 md:mb-6">
             <Vote className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <h1 className="text-2xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Class Voice</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg mt-2 md:mt-3 max-w-xl">
            Vote on CR decisions, assignments, and class schedules anonymously.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loading Polls...</p>
        </div>
      )}
      
      {error && <div className="p-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-[2rem] font-bold text-center">{error}</div>}

      {!loading && !error && (
        <div className="space-y-4 md:space-y-6 relative z-10">
          {polls.map((poll: any) => (
            <div key={poll.id} className="glass rounded-2xl md:rounded-[2rem] p-5 md:p-10 hover:shadow-xl hover:shadow-purple-900/5 dark:hover:shadow-purple-900/20 transition-all">
              <div className="flex items-center gap-3 mb-6">
                 <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                   poll.isClosed ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                 }`}>
                   {poll.isClosed ? 'Closed' : 'Active'}
                 </span>
                 {poll.userHasVoted && (
                   <span className="flex items-center gap-1 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-200 dark:border-purple-800/50">
                     <CheckCircle2 className="w-3 h-3" /> Voted
                   </span>
                 )}
              </div>
              
              <h3 className="text-lg md:text-2xl font-black text-slate-800 dark:text-slate-100 mb-5 md:mb-8 leading-snug">{poll.question}</h3>
              
              <div className="space-y-4">
                {poll.options.map((option: string, idx: number) => {
                  const votes = poll.voteCounts[idx] || 0
                  const percentage = poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0
                  const isUserVote = poll.userVoteIndex === idx

                  return (
                    <div key={idx} className="relative group">
                      <div 
                        className="absolute inset-0 bg-purple-100/50 dark:bg-purple-900/30 rounded-2xl transition-all duration-1000 ease-out" 
                        style={{ width: `${percentage}%` }} 
                      />
                      <button 
                        onClick={() => handleVote(poll.id, idx)}
                        disabled={poll.isClosed || votingId === poll.id}
                        className={`relative w-full flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border transition-all ${
                          isUserVote 
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 shadow-sm shadow-purple-500/10 dark:shadow-purple-900/20' 
                            : 'border-slate-200 dark:border-slate-700/50 hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-white/60 dark:hover:bg-slate-800/60'
                        }`}
                      >
                         <div className="flex items-center gap-4 relative z-10 w-full mb-2 md:mb-0">
                           <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isUserVote ? 'border-purple-600 dark:border-purple-400' : 'border-slate-300 dark:border-slate-600 group-hover:border-purple-400'}`}>
                              {isUserVote && <div className="w-3 h-3 bg-purple-600 dark:bg-purple-400 rounded-full" />}
                           </div>
                           <span className={`font-bold ${isUserVote ? 'text-purple-900 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>{option}</span>
                         </div>
                         <div className="flex items-center gap-4 w-full justify-end relative z-10">
                           <div className="text-sm font-black text-slate-400 dark:text-slate-500"><span className="text-slate-800 dark:text-slate-200">{votes}</span> / {poll.totalVotes}</div>
                           <div className="w-16 text-right font-black text-purple-600 dark:text-purple-400">{percentage}%</div>
                         </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center glass p-4 rounded-[2rem] mt-8 shadow-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50">Prev</button>
          <span className="font-bold text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  )
}
