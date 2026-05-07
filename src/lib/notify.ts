import { supabase } from '@/lib/supabase'

interface NotifyParams {
  project_id: string
  recipient_type: 'owner' | 'professional' | 'all'
  recipient_id?: string | null
  title: string
  body: string
  type: 'info' | 'measurement' | 'material_request' | 'payment' | 'alert'
  reference_id?: string | null
  reference_type?: string | null
  url?: string | null
}

export async function sendNotification(params: NotifyParams) {
  try {
    await supabase.from('notifications').insert({
      project_id: params.project_id,
      recipient_type: params.recipient_type,
      recipient_id: params.recipient_id || null,
      title: params.title,
      body: params.body,
      type: params.type,
      reference_id: params.reference_id || null,
      reference_type: params.reference_type || null,
      url: params.url || null,
    })
  } catch (err) {
    console.error('Failed to send notification:', err)
  }
}
