import { NextRequest, NextResponse } from 'next/server'

export interface ProductResult {
  title: string
  price: number
  image: string
  url: string
  store: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://muhjdnpstuxmoivubmyr.supabase.co'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 })
  }

  try {
    // Proxy to Supabase Edge Function (runs on Deno Deploy — different IPs, not blocked)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/product-search?q=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      }
    )
    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`Edge function returned ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error('[Search] Edge function error:', e)
    // Return empty results with search links as fallback
    const q = encodeURIComponent(query)
    return NextResponse.json({
      query,
      results: [],
      searchLinks: [
        { store: 'Mercado Livre', url: `https://lista.mercadolivre.com.br/${q}` },
        { store: 'Amazon BR', url: `https://www.amazon.com.br/s?k=${q}` },
        { store: 'Magazine Luiza', url: `https://www.magazineluiza.com.br/busca/${q}/` },
        { store: 'Casas Bahia', url: `https://www.casasbahia.com.br/busca/${q}` },
        { store: 'Buscapé', url: `https://www.buscape.com.br/search?q=${q}` },
        { store: 'OLX', url: `https://www.olx.com.br/items/q-${q}` },
      ],
      stats: { total: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 },
    })
  }
}
