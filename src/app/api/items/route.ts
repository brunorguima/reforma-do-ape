import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('room_id')
  const status = searchParams.get('status')
  const projectId = getProjectId(request)

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

  if (projectId) query = query.eq('project_id', projectId)
  if (roomId) query = query.eq('room_id', roomId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { images, ...itemData } = body

  // Validate required fields
  if (!itemData.name?.trim()) {
    return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
  }
  if (!itemData.room_id) {
    return NextResponse.json({ error: 'Room is required' }, { status: 400 })
  }

  // Validate quantity and price if provided
  const quantity = itemData.quantity || 1
  if (quantity < 1) {
    return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
  }

  if (itemData.estimated_price !== null && itemData.estimated_price !== undefined) {
    if (isNaN(Number(itemData.estimated_price))) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
    }
    if (Number(itemData.estimated_price) < 0) {
      return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 })
    }
  }

  // Insert item
  const { data: item, error: itemError } = await supabase
    .from('items')
    .insert({
      name: itemData.name,
      description: itemData.description,
      room_id: itemData.room_id,
      category_id: itemData.category_id,
      quantity,
      estimated_price: itemData.estimated_price ? Number(itemData.estimated_price) : null,
      status: itemData.status || 'desejado',
      reference_links: itemData.reference_links || [],
      suggested_by: itemData.suggested_by,
      created_by: itemData.created_by,
      updated_by: itemData.updated_by,
      project_id: itemData.project_id || null,
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
