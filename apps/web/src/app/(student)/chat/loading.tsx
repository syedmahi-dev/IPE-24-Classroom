export default function ChatLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto min-h-[calc(100dvh-140px)] flex flex-col pb-6 min-w-0 animate-in fade-in duration-500">
      <div className="glass rounded-[2rem] p-6 mb-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
      <div className="flex-1 glass rounded-[2rem] p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse`} />
          </div>
        ))}
      </div>
      <div className="glass rounded-[2rem] p-4 mt-4">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
