import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const { images, ...itemData } = body

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  // Validate required fields
  if (!itemData.name?.trim()) {
    return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
  }
  if (!itemData.room_id) {
    return NextResponse.json({ error: 'Room is required' }, { status: 400 })
  }

  // Validate quantity and price
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

  const { data: item, error } = await supabase
    .from('items')
    .update({
      name: itemData.name,
      description: itemData.description,
      room_id: itemData.room_id,
      category_id: itemData.category_id,
      quantity,
      estimated_price: itemData.estimated_price ? Number(itemData.estimated_price) : null,
      status: itemData.status,
      reference_links: itemData.reference_links || [],
      updated_by: itemData.updated_by,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update images: delete old and insert new
  if (images) {
    await supabase.from('item_images').delete().eq('item_id', id)
    const imageRecords = images
      .filter((img: any) => img.url?.trim())
      .map((img: any) => ({
        item_id: id,
        url: img.url,
        caption: img.caption || null,
        uploaded_by: img.uploaded_by || itemData.updated_by,
      }))
    if (imageRecords.length > 0) {
      await supabase.from('item_images').insert(imageRecords)
    }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    item_id: id,
    user_name: itemData.updated_by,
    action: 'editou',
    details: `Editou "${item.name}"`,
  })

  return NextResponse.json(item)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const userName = searchParams.get('user') || 'sistema'

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  // Get item name for log
  const { data: item } = await supabase.from('items').select('name').eq('id', id).single()

  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  if (!body.status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('items')
    .update({
      status: body.status,
      updated_by: body.updated_by,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  await supabase.from('activity_log').insert({
    item_id: id,
    user_name: body.updated_by,
    action: 'atualizou status',
    details: `Mudou status de "${item.name}" para ${body.status}`,
  })

  return NextResponse.json(item)
}
