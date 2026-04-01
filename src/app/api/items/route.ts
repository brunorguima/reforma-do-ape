import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('room_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('items')
    .select(`
      *,
      room:rooms(*),
      category:categories(*),
      images:item_images(*),
      price_suggestions(*)
    `)
    .order('created_at', { ascending: false })

  if (roomId) query = query.eq('room_id', roomId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { images, ...itemData } = body

  // Insert item
  const { data: item, error: itemError } = await supabase
    .from('items')
    .insert({
      name: itemData.name,
      description: itemData.description,
      room_id: itemData.room_id,
      category_id: itemData.category_id,
      quantity: itemData.quantity || 1,
      estimated_price: itemData.estimated_price,
      status: itemData.status || 'desejado',
      reference_links: itemData.reference_links || [],
      suggested_by: itemData.suggested_by,
      created_by: itemData.created_by,
      updated_by: itemData.updated_by,
    })
    .select()
    .single()

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })

  // Insert images if any
  if (images && images.length > 0) {
    const imageRecords = images
      .filter((img: any) => img.url?.trim())
      .map((img: any) => ({
        item_id: item.id,
        url: img.url,
        caption: img.caption || null,
        uploaded_by: img.uploaded_by,
      }))

    if (imageRecords.length > 0) {
      await supabase.from('item_images').insert(imageRecords)
    }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    item_id: item.id,
    user_name: itemData.created_by,
    action: 'criou',
    details: `Adicionou "${item.name}"`,
  })

  return NextResponse.json(item, { status: 201 })
}
