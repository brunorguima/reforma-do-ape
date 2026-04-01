import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local'
    )
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Lazy initialization - only creates client when actually used
let _client: SupabaseClient | null = null
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      _client = getSupabaseClient()
    }
    return (_client as any)[prop]
  },
})

export type Room = {
  id: string
  name: string
  icon: string
  order_index: number
  created_at: string
}

export type Category = {
  id: string
  name: string
  icon: string
}

export type Item = {
  id: string
  room_id: string
  category_id: string | null
  name: string
  description: string | null
  quantity: number
  estimated_price: number | null
  status: 'desejado' | 'aprovado' | 'comprado'
  reference_links: string[]
  suggested_by: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  // Joined fields
  room?: Room
  category?: Category
  images?: ItemImage[]
  price_suggestions?: PriceSuggestion[]
}

export type ItemImage = {
  id: string
  item_id: string
  url: string
  caption: string | null
  uploaded_by: string
  created_at: string
}

export type PriceSuggestion = {
  id: string
  item_id: string
  store_name: string
  price: number
  url: string
  found_at: string
  is_promotion: boolean
}

export type ActivityLog = {
  id: string
  item_id: string
  user_name: string
  action: string
  details: string | null
  created_at: string
}
