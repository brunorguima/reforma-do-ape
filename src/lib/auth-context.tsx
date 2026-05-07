'use client'
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabaseBrowser } from './supabase-browser'
import type { Session, User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  color: string
  role_default: string
  phone: string | null
}

export interface ProjectMembership {
  project_id: string
  role: string
  project: {
    id: string
    name: string
    slug: string
    description: string
    project_type: string
    image_url: string | null
    location: string | null
    status: string | null
  }
}

interface AuthContextType {
  // Auth state
  session: Session | null
  user: User | null
  profile: Profile | null
  memberships: ProjectMembership[]
  loading: boolean

  // Auth mode: 'supabase' (email login) or 'legacy' (access key)
  authMode: 'supabase' | 'legacy'

  // Legacy compat fields (used when authMode = 'legacy')
  legacyUserId: string | null
  legacyRole: string | null
  legacyProjectIds: string[]
  legacyProfessionalId: string | null

  // Actions
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>

  // Helpers
  getProjectIds: () => string[]
  getUserRole: (projectId: string) => string
  getUserName: () => string
  getUserColor: () => string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<ProjectMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'supabase' | 'legacy'>('legacy')

  // Legacy state
  const [legacyUserId, setLegacyUserId] = useState<string | null>(null)
  const [legacyRole, setLegacyRole] = useState<string | null>(null)
  const [legacyProjectIds, setLegacyProjectIds] = useState<string[]>([])
  const [legacyProfessionalId, setLegacyProfessionalId] = useState<string | null>(null)

  // Load profile + memberships for authenticated user
  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabaseBrowser
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileData) {
        setProfile(profileData as Profile)
      }

      // Fetch project memberships with project details
      const { data: memberData } = await supabaseBrowser
        .from('project_members')
        .select(`
          project_id,
          role,
          project:projects(id, name, slug, description, project_type, image_url, location, status)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (memberData) {
        // Supabase returns joined data in a specific shape
        const mapped = memberData.map((m: Record<string, unknown>) => ({
          project_id: m.project_id as string,
          role: m.role as string,
          project: m.project as ProjectMembership['project'],
        }))
        setMemberships(mapped)
      }
    } catch (err) {
      console.error('Failed to load user data:', err)
    }
  }, [])

  // Initialize: check for existing Supabase session
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session: existingSession } } = await supabaseBrowser.auth.getSession()

        if (existingSession?.user) {
          setSession(existingSession)
          setUser(existingSession.user)
          setAuthMode('supabase')
          await loadUserData(existingSession.user.id)
        } else {
          // Check for legacy access key in localStorage
          const savedKey = localStorage.getItem('reforma-access-key')
          if (savedKey) {
            setAuthMode('legacy')
            setLegacyUserId(localStorage.getItem('reforma-current-user'))
            setLegacyRole(localStorage.getItem('reforma-user-role'))
            setLegacyProfessionalId(localStorage.getItem('reforma-professional-id'))
            try {
              const pIds = JSON.parse(localStorage.getItem('reforma-project-ids') || '[]')
              setLegacyProjectIds(pIds)
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.error('Auth init failed:', err)
      } finally {
        setLoading(false)
      }
    }

    init()

    // Listen for auth state changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession)
          setUser(newSession.user)
          setAuthMode('supabase')
          await loadUserData(newSession.user.id)
          // Clear legacy data
          localStorage.removeItem('reforma-access-key')
          localStorage.removeItem('reforma-current-user')
          localStorage.removeItem('reforma-user-role')
          localStorage.removeItem('reforma-allowed-users')
          localStorage.removeItem('reforma-professional-id')
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          setMemberships([])
          setAuthMode('legacy')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadUserData])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    await supabaseBrowser.auth.signOut()
    // Clear all stored state
    localStorage.removeItem('reforma-access-key')
    localStorage.removeItem('reforma-current-user')
    localStorage.removeItem('reforma-user-role')
    localStorage.removeItem('reforma-allowed-users')
    localStorage.removeItem('reforma-professional-id')
    localStorage.removeItem('reforma-project-ids')
    localStorage.removeItem('reforma-active-project')
    setSession(null)
    setUser(null)
    setProfile(null)
    setMemberships([])
    setLegacyUserId(null)
    setLegacyRole(null)
    setLegacyProjectIds([])
    setLegacyProfessionalId(null)
  }

  const getProjectIds = () => {
    if (authMode === 'supabase') {
      return memberships.map(m => m.project_id)
    }
    return legacyProjectIds
  }

  const getUserRole = (projectId: string) => {
    if (authMode === 'supabase') {
      const membership = memberships.find(m => m.project_id === projectId)
      return membership?.role || 'viewer'
    }
    return legacyRole || 'owner'
  }

  const getUserName = () => {
    if (authMode === 'supabase' && profile) return profile.name
    return legacyUserId || 'bruno'
  }

  const getUserColor = () => {
    if (authMode === 'supabase' && profile) return profile.color
    return '#3B82F6'
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, memberships, loading, authMode,
      legacyUserId, legacyRole, legacyProjectIds, legacyProfessionalId,
      signIn, signOut,
      getProjectIds, getUserRole, getUserName, getUserColor,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
