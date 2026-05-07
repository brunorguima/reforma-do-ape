'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Camera, Send, Heart, MessageCircle, Clock, Plus, X, Image, Loader2, Tag, User } from 'lucide-react'
import { PanelSkeleton } from '@/components/ui'
import Card, { EmptyState } from '@/components/ui/Card'

interface FeedPost {
  id: string
  project_id: string
  author_name: string
  author_role: string
  content: string
  post_type: string
  tags: string[]
  photos: string[]
  likes_count: number
  created_at: string
  updated_at: string
}

const POST_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  update: { label: 'Atualização', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  before: { label: 'Antes', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  during: { label: 'Durante', color: 'bg-primary/5 text-primary border-primary/10' },
  after: { label: 'Depois', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  milestone: { label: 'Marco', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  issue: { label: 'Problema', color: 'bg-red-50 text-red-600 border-red-100' },
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-secondary text-white',
  professional: 'bg-orange-500 text-white',
  designer: 'bg-purple-500 text-white',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

interface FeedPanelProps {
  projectId?: string | null
  currentUser?: string
}

export default function FeedPanel({ projectId, currentUser = 'Bruno' }: FeedPanelProps) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newPostType, setNewPostType] = useState('update')
  const [newTags, setNewTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const [newPhotos, setNewPhotos] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPosts = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await fetch(`/api/feed?project_id=${projectId}&limit=30`)
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'feed')
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) {
          setNewPhotos(prev => [...prev, data.url])
        }
      }
    } catch {
      // ignore
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePost = async () => {
    if (!newContent.trim() && newPhotos.length === 0) return
    setPosting(true)
    try {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean)
      await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          author_name: currentUser,
          author_role: 'owner',
          content: newContent,
          post_type: newPostType,
          tags,
          photos: newPhotos,
        }),
      })
      setNewContent('')
      setNewPostType('update')
      setNewTags('')
      setNewPhotos([])
      setShowCompose(false)
      fetchPosts()
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId: string, currentLikes: number) => {
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: currentLikes + 1 } : p))
    try {
      await fetch(`/api/feed/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes_count: currentLikes + 1 }),
      })
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: currentLikes } : p))
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Excluir este post?')) return
    setPosts(prev => prev.filter(p => p.id !== postId))
    try {
      await fetch(`/api/feed/${postId}`, { method: 'DELETE' })
    } catch {
      fetchPosts()
    }
  }

  if (loading) return <PanelSkeleton />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Compose button / form */}
      <AnimatePresence>
        {showCompose ? (
          <motion.div
            key="compose"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card padding="lg">
              <div className="space-y-4">
                {/* Post type pills */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(POST_TYPE_LABELS).map(([key, { label, color }]) => (
                    <button
                      key={key}
                      onClick={() => setNewPostType(key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        newPostType === key
                          ? color + ' ring-2 ring-offset-1 ring-secondary/30'
                          : 'bg-surface-container text-on-surface-variant border-transparent hover:bg-surface-container-high'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Content textarea */}
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="O que está acontecendo na obra?"
                  className="w-full min-h-[100px] p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm resize-none focus:outline-none focus:border-secondary transition-colors"
                />

                {/* Tags input */}
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-on-surface-variant shrink-0" />
                  <input
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    placeholder="Tags (separar por vírgula): cozinha, elétrica..."
                    className="flex-1 p-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
                  />
                </div>

                {/* Photo previews */}
                {newPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newPhotos.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-outline-variant" />
                        <button
                          onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    >
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      {uploading ? 'Enviando...' : 'Fotos'}
                    </button>
                    <button
                      onClick={() => { setShowCompose(false); setNewContent(''); setNewPhotos([]); setNewTags('') }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                  <button
                    onClick={handlePost}
                    disabled={posting || (!newContent.trim() && newPhotos.length === 0)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-secondary text-white hover:bg-secondary-light transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Publicar
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="compose-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button
              onClick={() => setShowCompose(true)}
              className="w-full bg-surface-lowest border border-outline-variant rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                <Plus size={20} className="text-secondary" />
              </div>
              <span className="text-sm text-on-surface-variant font-medium">Postar atualização da obra...</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts feed */}
      {posts.length === 0 ? (
        <EmptyState
          icon={<Image size={28} />}
          title="Nenhuma atualização ainda"
          description="Comece postando fotos e atualizações da obra!"
          action={
            <button
              onClick={() => setShowCompose(true)}
              className="mt-2 px-4 py-2 rounded-xl text-sm font-bold bg-secondary text-white hover:bg-secondary-light transition-colors shadow-sm"
            >
              Primeira atualização
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => {
            const typeInfo = POST_TYPE_LABELS[post.post_type] || POST_TYPE_LABELS.update
            const roleColor = ROLE_COLORS[post.author_role] || ROLE_COLORS.owner
            const initials = post.author_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
              >
                <Card padding="lg" className="overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${roleColor}`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface">{post.author_name}</p>
                      <p className="text-[10px] font-bold text-outline uppercase tracking-wider">{timeAgo(post.created_at)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>

                  {/* Content */}
                  {post.content && (
                    <p className="text-sm text-on-surface leading-relaxed mb-3 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.map((tag, j) => (
                        <span key={j} className="px-2 py-0.5 bg-surface-container rounded-lg text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Photo grid */}
                  {post.photos && post.photos.length > 0 && (
                    <div className={`grid gap-1.5 rounded-xl overflow-hidden mb-3 ${
                      post.photos.length === 1 ? 'grid-cols-1' :
                      post.photos.length === 2 ? 'grid-cols-2' :
                      post.photos.length === 3 ? 'grid-cols-2' :
                      'grid-cols-2'
                    }`}>
                      {post.photos.slice(0, 4).map((url, j) => (
                        <div
                          key={j}
                          className={`relative cursor-pointer group ${
                            post.photos.length === 3 && j === 0 ? 'row-span-2' : ''
                          }`}
                          onClick={() => setLightboxPhoto(url)}
                        >
                          <img
                            src={url}
                            alt=""
                            className={`w-full object-cover rounded-xl border border-outline-variant group-hover:brightness-90 transition-all ${
                              post.photos.length === 1 ? 'max-h-[400px]' :
                              post.photos.length === 3 && j === 0 ? 'h-full' :
                              'h-[180px]'
                            }`}
                          />
                          {j === 3 && post.photos.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                              <span className="text-white font-black text-lg">+{post.photos.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-2 border-t border-outline-variant">
                    <button
                      onClick={() => handleLike(post.id, post.likes_count)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-red-500 transition-colors py-1"
                    >
                      <Heart size={16} className={post.likes_count > 0 ? 'fill-red-500 text-red-500' : ''} />
                      {post.likes_count > 0 && post.likes_count}
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="ml-auto text-[10px] font-bold text-outline uppercase tracking-wider hover:text-red-500 transition-colors py-1"
                    >
                      Excluir
                    </button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxPhoto}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
