'use client'

import { useState } from 'react'
import { upsertDiscordConfig, deleteDiscordConfig } from './actions'
import { Plus, Trash2, Edit2, Save, X, Server, Shield, Hash, Tag, Activity } from 'lucide-react'

export default function DiscordConfigClient({ initialConfigs }: { initialConfigs: any[] }) {
  const [configs, setConfigs] = useState(initialConfigs)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  const defaultForm = {
    channelId: '',
    mode: 'REVIEW_GATE',
    authorizedUserIds: '',
    authorizedRoleIds: '',
    allowedCourseCodes: '',
    defaultAnnouncementType: '',
    label: '',
    courseCode: '',
    isActive: true
  }

  const [formData, setFormData] = useState(defaultForm)

  const handleEdit = (config: any) => {
    setEditingId(config.id)
    setIsAdding(false)
    setFormData({
      channelId: config.channelId,
      mode: config.mode,
      authorizedUserIds: config.authorizedUserIds,
      authorizedRoleIds: config.authorizedRoleIds || '',
      allowedCourseCodes: config.allowedCourseCodes || '',
      defaultAnnouncementType: config.defaultAnnouncementType || '',
      label: config.label || '',
      courseCode: config.courseCode || '',
      isActive: config.isActive
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData(defaultForm)
  }

  const handleSave = async () => {
    try {
      const saved = await upsertDiscordConfig(formData)
      if (editingId) {
        setConfigs(configs.map(c => c.id === saved.id ? saved : c))
      } else {
        setConfigs([saved, ...configs])
      }
      handleCancel()
    } catch (err) {
      console.error(err)
      alert('Failed to save config')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this config?')) return
    try {
      await deleteDiscordConfig(id)
      setConfigs(configs.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete config')
    }
  }

  const isEditingCurrent = (id: string) => editingId === id

  const ConfigForm = () => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 mb-6">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
        <Server className="w-5 h-5 text-indigo-500" />
        {isAdding ? 'Add New Channel Config' : 'Edit Channel Config'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Channel ID *</label>
          <input 
            type="text" 
            value={formData.channelId}
            onChange={e => setFormData({...formData, channelId: e.target.value})}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-mono text-sm"
            placeholder="1234567890"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Mode *</label>
          <select 
            value={formData.mode}
            aria-label="Configuration Mode"
            onChange={e => setFormData({...formData, mode: e.target.value})}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
          >
            <option value="REVIEW_GATE">REVIEW_GATE</option>
            <option value="AUTO_PUBLISH">AUTO_PUBLISH</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Authorized User IDs (JSON Array) *</label>
          <input 
            type="text" 
            value={formData.authorizedUserIds}
            onChange={e => setFormData({...formData, authorizedUserIds: e.target.value})}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-mono text-sm"
            placeholder='["123", "456"]'
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Authorized Role IDs (JSON Array)</label>
          <input 
            type="text" 
            value={formData.authorizedRoleIds}
            onChange={e => setFormData({...formData, authorizedRoleIds: e.target.value})}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-mono text-sm"
            placeholder='["789"]'
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Allowed Course Codes (JSON Array)</label>
          <input 
            type="text" 
            value={formData.allowedCourseCodes}
            onChange={e => setFormData({...formData, allowedCourseCodes: e.target.value})}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-mono text-sm"
            placeholder='["CHEM4215", "MATH4211"]'
          />
        </div>


        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Default Type (Overrides AI)</label>
          <select 
            value={formData.defaultAnnouncementType}
            aria-label="Default Announcement Type"
            onChange={e => setFormData({...formData, defaultAnnouncementType: e.target.value})}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
          >
            <option value="">-- Let AI Decide --</option>
            <option value="general">general</option>
            <option value="exam">exam</option>
            <option value="file_update">file_update</option>
            <option value="routine_update">routine_update</option>
            <option value="urgent">urgent</option>
            <option value="event">event</option>
            <option value="course_update">course_update</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Label / Folder Name</label>
          <input 
            type="text" 
            value={formData.label}
            onChange={e => setFormData({...formData, label: e.target.value})}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
            placeholder="e.g. general-announcements"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Course Code</label>
          <input 
            type="text" 
            value={formData.courseCode}
            onChange={e => setFormData({...formData, courseCode: e.target.value})}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 uppercase"
            placeholder="e.g. IPE4208"
          />
        </div>
        
        <div className="flex items-center gap-3 pt-6">
          <input 
            type="checkbox" 
            id="isActive"
            checked={formData.isActive}
            onChange={e => setFormData({...formData, isActive: e.target.checked})}
            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
          />
          <label htmlFor="isActive" className="font-bold text-slate-700 dark:text-slate-300">Active</label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button 
          onClick={handleCancel}
          className="px-5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <button 
          onClick={handleSave}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Config
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Hash className="w-5 h-5 text-indigo-500" /> Monitored Channels
        </h2>
        {!isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Add Channel
          </button>
        )}
      </div>

      {(isAdding || editingId) && <ConfigForm />}

      <div className="space-y-4">
        {configs.length === 0 && !isAdding && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-medium">
            No Discord channels configured. Click "Add Channel" to start listening.
          </div>
        )}

        {configs.map((config) => (
          <div 
            key={config.id} 
            className={`p-5 rounded-2xl border transition-all ${!config.isActive ? 'opacity-60 grayscale' : ''} ${isEditingCurrent(config.id) ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-lg font-bold text-slate-800 dark:text-slate-100">
                    {config.channelId}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${config.mode === 'AUTO_PUBLISH' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {config.mode.replace('_', ' ')}
                  </span>
                  {!config.isActive && (
                     <span className="px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Inactive
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mt-3">
                  {config.label && (
                    <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> {config.label}</span>
                  )}
                  {config.courseCode && (
                    <span className="flex items-center gap-1.5 font-mono bg-slate-100 dark:bg-slate-800 px-2 rounded">{config.courseCode}</span>
                  )}
                  {config.allowedCourseCodes && (
                    <span className="flex items-center gap-1.5 font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 rounded">
                      Allowed: {config.allowedCourseCodes}
                    </span>
                  )}
                  {config.defaultAnnouncementType && (
                    <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> Force Type: {config.defaultAnnouncementType}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                <button 
                  onClick={() => handleEdit(config)}
                  title="Edit Configuration"
                  aria-label="Edit Configuration"
                  className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(config.id)}
                  title="Delete Configuration"
                  aria-label="Delete Configuration"
                  className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
