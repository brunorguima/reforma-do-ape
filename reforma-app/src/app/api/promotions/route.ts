import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { crawlPrices, getSearchLinks } from '@/lib/crawler'

export async function POST(request: NextRequest) {
  const { item_id, search_query, include_new = true, include_used = true } = await request.json()

  if (!search_query) {
    return NextResponse.json({ error: 'search_query is required' }, { status: 400 })
  }

  // Run the crawler
  const crawlResults = await crawlPrices(search_query, {
    includeNew: include_new,
    includeUsed: include_used,
  })

  // Always provide search links for manual browsing
  const searchLinks = getSearchLinks(search_query)

  // Save results to database
  if (crawlResults.length > 0 && item_id) {
    const records = crawlResults.map(r => ({
      item_id,
      store_name: r.store + (r.isUsed ? ' (usado)' : ''),
      price: r.price,
      url: r.url,
      is_promotion: r.isPromo,
      condition: r.condition || (r.isUsed ? 'usado' : 'novo'),
    }))

    try {
      await supabase.from('price_suggestions').insert(records)
    } catch {
      console.warn('Some price suggestions may already exist')
    }
  }

  // Fetch all existing suggestions for this item
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
    crawl_results: crawlResults,
    search_links: searchLinks,
    all_suggestions: existing,
    stats: {
      found: crawlResults.length,
      new_items: crawlResults.filter(r => !r.isUsed).length,
      used_items: crawlResults.filter(r => r.isUsed).length,
    },
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

// Get search links without crawling (fast)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 })
  }

  const links = getSearchLinks(query)
  return NextResponse.json({ search_links: links })
}
