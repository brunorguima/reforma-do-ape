import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Search for promotions using Google Shopping results
async function searchPromotions(query: string): Promise<Array<{store: string, price: number, url: string, title: string, isPromo: boolean}>> {
  const results: Array<{store: string, price: number, url: string, title: string, isPromo: boolean}> = []

  try {
    // Use a search API approach - fetching from multiple Brazilian store aggregators
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' preço comprar')}&tbm=shop&hl=pt-BR&gl=BR`

    // Note: In production, you'd want to use a proper API like Google Shopping API,
    // SerpAPI, or scrape specific stores. For now, we'll provide a structure
    // that can be enhanced with real crawling later.

    // Simulated structure for the search results
    // In a real implementation, this would make actual HTTP requests
    console.log(`Searching promotions for: ${query}`)

  } catch (error) {
    console.error('Error searching promotions:', error)
  }

  return results
}

export async function POST(request: NextRequest) {
  const { item_id, search_query } = await request.json()

  if (!search_query) {
    return NextResponse.json({ error: 'search_query is required' }, { status: 400 })
  }

  const results = await searchPromotions(search_query)

  // Save results to database
  if (results.length > 0 && item_id) {
    const records = results.map(r => ({
      item_id,
      store_name: r.store,
      price: r.price,
      url: r.url,
      is_promotion: r.isPromo,
    }))

    await supabase.from('price_suggestions').insert(records)
  }

  // Also fetch existing suggestions for this item
  let existing: any[] = []
  if (item_id) {
    const { data } = await supabase
      .from('price_suggestions')
      .select('*')
      .eq('item_id', item_id)
      .order('price')
    existing = data || []
  }

  return NextResponse.json({
    new_results: results,
    all_suggestions: existing,
  })
}

// Manual price suggestion
export async function PUT(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('price_suggestions')
    .insert({
      item_id: body.item_id,
      store_name: body.store_name,
      price: body.price,
      url: body.url,
      is_promotion: body.is_promotion || false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
