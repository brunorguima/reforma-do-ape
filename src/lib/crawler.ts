/**
 * Crawler de preços para lojas brasileiras (novos e usados)
 *
 * Busca em:
 * - Novos: Magazine Luiza, Casas Bahia, Americanas, Mercado Livre, Amazon BR
 * - Usados: OLX, Enjoei, Facebook Marketplace, Mercado Livre (usados)
 * - Comparadores: Buscapé, Zoom
 */

export type CrawlResult = {
  store: string
  price: number
  url: string
  title: string
  isPromo: boolean
  isUsed: boolean
  condition?: 'novo' | 'usado' | 'seminovo'
  imageUrl?: string
}

type StoreConfig = {
  name: string
  searchUrl: (query: string) => string
  isUsed: boolean
  parseResults: (html: string, query: string) => CrawlResult[]
}

// Helper to extract price from Brazilian format (R$ 1.234,56)
function extractPrice(text: string): number | null {
  const match = text.match(/R?\$?\s*([\d.]+,\d{2})/)?.[1]
  if (!match) return null
  return parseFloat(match.replace(/\./g, '').replace(',', '.'))
}

// Helper to extract prices from text with various formats
function extractPricesFromText(text: string): number[] {
  const prices: number[] = []
  const regex = /R?\$\s*([\d.]+,\d{2})/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const price = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
    if (price > 0 && price < 1000000) prices.push(price)
  }
  return prices
}

// Generic HTML result extractor using common patterns
function extractGenericResults(html: string, storeName: string, isUsed: boolean, query: string): CrawlResult[] {
  const results: CrawlResult[] = []
  const queryWords = query.toLowerCase().split(/\s+/)

  // Try to find product-like blocks with prices
  // Look for patterns: title near price near link
  const priceMatches = html.matchAll(/R\$\s*([\d.]+,\d{2})/g)
  const prices = Array.from(priceMatches).slice(0, 20) // Limit to first 20 prices

  // Look for title patterns near prices
  const titlePattern = /(?:title|alt|aria-label)=["']([^"']{10,100})["']/gi
  const titles = Array.from(html.matchAll(titlePattern)).map(m => m[1])

  // Look for product links
  const linkPattern = /href=["'](https?:\/\/[^"'\s]+(?:produto|item|product|p\/|dp\/)[^"'\s]*)["']/gi
  const links = Array.from(html.matchAll(linkPattern)).map(m => m[1])

  // Match titles with prices where possible
  const maxResults = Math.min(prices.length, 10)
  for (let i = 0; i < maxResults; i++) {
    const price = parseFloat(prices[i][1].replace(/\./g, '').replace(',', '.'))
    if (price <= 0 || price > 500000) continue

    const title = titles[i] || `${query} - Resultado ${i + 1}`
    const url = links[i] || '#'

    // Check relevance - at least one query word should be in the title
    const titleLower = title.toLowerCase()
    const isRelevant = queryWords.some(w => w.length > 2 && titleLower.includes(w))
    if (!isRelevant && titles[i]) continue

    results.push({
      store: storeName,
      price,
      url,
      title: title.substring(0, 120),
      isPromo: html.includes('promo') || html.includes('desconto') || html.includes('off'),
      isUsed,
      condition: isUsed ? 'usado' : 'novo',
    })
  }

  return results
}

// Store configurations
const STORES: StoreConfig[] = [
  // === NOVOS ===
  {
    name: 'Magazine Luiza',
    searchUrl: (q) => `https://www.magazineluiza.com.br/busca/${encodeURIComponent(q)}/`,
    isUsed: false,
    parseResults: (html, q) => extractGenericResults(html, 'Magazine Luiza', false, q),
  },
  {
    name: 'Casas Bahia',
    searchUrl: (q) => `https://www.casasbahia.com.br/busca/${encodeURIComponent(q)}`,
    isUsed: false,
    parseResults: (html, q) => extractGenericResults(html, 'Casas Bahia', false, q),
  },
  {
    name: 'Amazon BR',
    searchUrl: (q) => `https://www.amazon.com.br/s?k=${encodeURIComponent(q)}`,
    isUsed: false,
    parseResults: (html, q) => extractGenericResults(html, 'Amazon BR', false, q),
  },
  {
    name: 'Americanas',
    searchUrl: (q) => `https://www.americanas.com.br/busca/${encodeURIComponent(q)}`,
    isUsed: false,
    parseResults: (html, q) => extractGenericResults(html, 'Americanas', false, q),
  },
  {
    name: 'Mercado Livre (Novo)',
    searchUrl: (q) => `https://lista.mercadolivre.com.br/${encodeURIComponent(q)}_ITEM*CONDITION_2230284_NoIndex_true`,
    isUsed: false,
    parseResults: (html, q) => extractGenericResults(html, 'Mercado Livre', false, q),
  },
  {
    name: 'Buscapé',
    searchUrl: (q) => `https://www.buscape.com.br/search?q=${encodeURIComponent(q)}`,
    isUsed: false,
    parseResults: (html, q) => extractGenericResults(html, 'Buscapé', false, q),
  },
  // === USADOS ===
  {
    name: 'OLX',
    searchUrl: (q) => `https://www.olx.com.br/items/q-${encodeURIComponent(q)}`,
    isUsed: true,
    parseResults: (html, q) => extractGenericResults(html, 'OLX', true, q),
  },
  {
    name: 'Enjoei',
    searchUrl: (q) => `https://www.enjoei.com.br/pesquisa/${encodeURIComponent(q)}`,
    isUsed: true,
    parseResults: (html, q) => extractGenericResults(html, 'Enjoei', true, q),
  },
  {
    name: 'Mercado Livre (Usado)',
    searchUrl: (q) => `https://lista.mercadolivre.com.br/${encodeURIComponent(q)}_ITEM*CONDITION_2230581_NoIndex_true`,
    isUsed: true,
    parseResults: (html, q) => extractGenericResults(html, 'ML Usado', true, q),
  },
  {
    name: 'Facebook Marketplace',
    searchUrl: (q) => `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(q)}`,
    isUsed: true,
    parseResults: (html, q) => extractGenericResults(html, 'FB Marketplace', true, q),
  },
]

// Fetch with timeout and error handling
async function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) return null
    return await response.text()
  } catch (error) {
    console.warn(`Failed to fetch ${url}:`, error)
    return null
  }
}

/**
 * Search for prices across multiple Brazilian stores (new and used)
 */
export async function crawlPrices(query: string, options?: {
  includeNew?: boolean
  includeUsed?: boolean
  maxStores?: number
}): Promise<CrawlResult[]> {
  const {
    includeNew = true,
    includeUsed = true,
    maxStores = 10,
  } = options || {}

  const activeStores = STORES
    .filter(s => (includeNew && !s.isUsed) || (includeUsed && s.isUsed))
    .slice(0, maxStores)

  console.log(`[Crawler] Searching "${query}" across ${activeStores.length} stores...`)

  // Fetch all stores in parallel
  const fetchPromises = activeStores.map(async (store) => {
    const url = store.searchUrl(query)
    console.log(`[Crawler] Fetching ${store.name}: ${url}`)

    const html = await fetchWithTimeout(url)
    if (!html) {
      console.log(`[Crawler] No response from ${store.name}`)
      return []
    }

    try {
      const results = store.parseResults(html, query)
      console.log(`[Crawler] Found ${results.length} results from ${store.name}`)
      return results
    } catch (error) {
      console.error(`[Crawler] Error parsing ${store.name}:`, error)
      return []
    }
  })

  const allResults = await Promise.allSettled(fetchPromises)

  const results = allResults
    .filter((r): r is PromiseFulfilledResult<CrawlResult[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => a.price - b.price)

  console.log(`[Crawler] Total results: ${results.length}`)
  return results
}

/**
 * Generate search URLs for manual browsing
 * These are always valid even if crawling fails
 */
export function getSearchLinks(query: string): Array<{ store: string, url: string, isUsed: boolean }> {
  return STORES.map(s => ({
    store: s.name,
    url: s.searchUrl(query),
    isUsed: s.isUsed,
  }))
}
