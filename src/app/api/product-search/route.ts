import { NextRequest, NextResponse } from 'next/server'

export interface ProductResult {
  title: string
  price: number
  image: string
  url: string
  store: string
}

async function fetchHTML(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function parseMercadoLivre(html: string): ProductResult[] {
  const results: ProductResult[] = []

  // ML uses structured data in the HTML — look for product patterns
  // Pattern 1: JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1])
      if (data['@type'] === 'Product' || (Array.isArray(data) && data[0]?.['@type'] === 'Product')) {
        const products = Array.isArray(data) ? data : [data]
        for (const p of products) {
          if (p.name && p.offers) {
            const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers
            results.push({
              title: p.name,
              price: parseFloat(offer.price || offer.lowPrice || '0'),
              image: typeof p.image === 'string' ? p.image : (p.image?.[0] || ''),
              url: p.url || offer.url || '',
              store: 'Mercado Livre',
            })
          }
        }
      }
    } catch { /* skip invalid JSON */ }
  }

  if (results.length > 0) return results.slice(0, 12)

  // Pattern 2: Search result items — title/price/link/image from HTML
  // ML search pages have patterns like: class="ui-search-result"
  const itemBlocks = html.split(/class="ui-search-layout__item/i).slice(1, 13)

  for (const block of itemBlocks) {
    try {
      // Title
      const titleMatch = block.match(/class="ui-search-item__title[^"]*"[^>]*>([^<]+)/i)
        || block.match(/aria-label="([^"]{5,120})"/i)
        || block.match(/title="([^"]{5,120})"/i)
      const title = titleMatch?.[1]?.trim()
      if (!title) continue

      // Price — look for the integer part and decimals
      const priceIntMatch = block.match(/class="andes-money-amount__fraction"[^>]*>([^<]+)/i)
      const priceCentsMatch = block.match(/class="andes-money-amount__cents[^"]*"[^>]*>([^<]+)/i)
      let price = 0
      if (priceIntMatch) {
        const intPart = priceIntMatch[1].replace(/\D/g, '')
        const cents = priceCentsMatch ? priceCentsMatch[1].replace(/\D/g, '') : '00'
        price = parseFloat(`${intPart}.${cents}`)
      }
      if (!price) {
        const rawPrice = block.match(/R\$\s*([\d.]+,?\d*)/)?.[1]
        if (rawPrice) price = parseFloat(rawPrice.replace(/\./g, '').replace(',', '.'))
      }
      if (!price || price <= 0) continue

      // Image
      const imgMatch = block.match(/(?:data-src|src)="(https:\/\/[^"]*(?:mlstatic|mercadolivre)[^"]*)"/i)
        || block.match(/src="(https:\/\/http2\.mlstatic[^"]*)"/i)
      const image = imgMatch?.[1] || ''

      // URL
      const urlMatch = block.match(/href="(https:\/\/[^"]*mercadolivre[^"]*|https:\/\/[^"]*mlb[^"]*)"/i)
        || block.match(/href="(https:\/\/produto\.mercadolivre[^"]*)"/i)
      const url = urlMatch?.[1] || ''

      results.push({ title, price, image, url, store: 'Mercado Livre' })
    } catch { /* skip broken block */ }
  }

  return results.slice(0, 12)
}

function parseBuscape(html: string): ProductResult[] {
  const results: ProductResult[] = []

  // Buscapé uses card patterns
  const cardBlocks = html.split(/data-testid="product-card/i).slice(1, 8)

  for (const block of cardBlocks) {
    try {
      const titleMatch = block.match(/title="([^"]{5,150})"/i)
        || block.match(/alt="([^"]{5,150})"/i)
      const title = titleMatch?.[1]?.trim()
      if (!title) continue

      const priceMatch = block.match(/R\$\s*([\d.]+,\d{2})/)
      if (!priceMatch) continue
      const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'))
      if (price <= 0) continue

      const imgMatch = block.match(/src="(https:\/\/[^"]*\.(?:jpg|png|webp)[^"]*)"/i)
      const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/i)

      results.push({
        title,
        price,
        image: imgMatch?.[1] || '',
        url: urlMatch?.[1] ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://www.buscape.com.br${urlMatch[1]}`) : '',
        store: 'Buscapé',
      })
    } catch { /* skip */ }
  }
  return results.slice(0, 6)
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 })
  }

  const encoded = encodeURIComponent(query)

  // Search multiple sources in parallel
  const [mlHtml, buscapeHtml] = await Promise.all([
    fetchHTML(`https://lista.mercadolivre.com.br/${encoded}`),
    fetchHTML(`https://www.buscape.com.br/search?q=${encoded}`),
  ])

  let results: ProductResult[] = []

  if (mlHtml) results.push(...parseMercadoLivre(mlHtml))
  if (buscapeHtml) results.push(...parseBuscape(buscapeHtml))

  // Sort by price and deduplicate similar titles
  results.sort((a, b) => a.price - b.price)

  // Calculate average price
  const prices = results.filter(r => r.price > 0).map(r => r.price)
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

  return NextResponse.json({
    query,
    results: results.slice(0, 15),
    stats: {
      total: results.length,
      avgPrice: Math.round(avgPrice * 100) / 100,
      minPrice,
      maxPrice,
    },
  })
}
