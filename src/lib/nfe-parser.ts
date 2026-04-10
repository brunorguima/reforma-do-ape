/**
 * NF-e parser: supports XML (schema oficial) and DANFE PDF (regex-based)
 * Returns normalized structure:
 *   { chave, numero, serie, emitente_*, destinatario_*, data_emissao,
 *     valor_total, itens: [...] }
 */

import { XMLParser } from 'fast-xml-parser'

export interface NfeItem {
  numero: number
  codigo: string
  descricao: string
  ncm?: string
  cfop?: string
  unidade?: string
  quantidade: number
  valor_unitario: number
  valor_total: number
}

// NF-e payment form codes per SEFAZ (tPag)
// 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, 04=Cartão Débito, 05=Crédito Loja,
// 10=Vale Alimentação, 11=Vale Refeição, 12=Vale Presente, 13=Vale Combustível,
// 15=Boleto, 16=Depósito, 17=PIX, 18=Transferência, 19=Programa Fidelidade, 90=Sem Pagamento, 99=Outros
export type NfePaymentKind =
  | 'dinheiro' | 'cheque' | 'credito' | 'debito' | 'credito_loja'
  | 'vale' | 'boleto' | 'deposito' | 'pix' | 'transferencia' | 'outros'

export interface NfePaymentForm {
  tPag?: string           // raw SEFAZ code ('01'..'99')
  kind: NfePaymentKind    // normalized kind
  valor: number
  indPag?: string         // 0=à vista, 1=a prazo
  description?: string    // human-readable
}

export function mapTPagToKind(tPag?: string): NfePaymentKind {
  const code = (tPag || '').padStart(2, '0')
  switch (code) {
    case '01': return 'dinheiro'
    case '02': return 'cheque'
    case '03': case '05': return 'credito'
    case '04': return 'debito'
    case '10': case '11': case '12': case '13': case '19': return 'vale'
    case '15': return 'boleto'
    case '16': return 'deposito'
    case '17': return 'pix'
    case '18': return 'transferencia'
    default: return 'outros'
  }
}

export function paymentKindLabel(k: NfePaymentKind): string {
  switch (k) {
    case 'dinheiro': return 'Dinheiro'
    case 'cheque': return 'Cheque'
    case 'credito': return 'Cartão de Crédito'
    case 'debito': return 'Cartão de Débito'
    case 'credito_loja': return 'Crédito da Loja'
    case 'vale': return 'Vale'
    case 'boleto': return 'Boleto'
    case 'deposito': return 'Depósito'
    case 'pix': return 'PIX'
    case 'transferencia': return 'Transferência'
    default: return 'Outros'
  }
}

export interface NfeParsed {
  chave?: string
  numero?: string
  serie?: string
  modelo?: string
  uf?: string               // UF do emitente (ex: "SP", "RJ")
  emitente_nome?: string
  emitente_cnpj?: string
  emitente_ie?: string
  destinatario_cnpj_cpf?: string
  data_emissao?: string
  natureza_operacao?: string
  valor_total?: number
  valor_produtos?: number
  valor_frete?: number
  valor_desconto?: number
  itens: NfeItem[]
  formas_pagamento?: NfePaymentForm[]
  source: 'pdf' | 'xml'
  raw?: unknown
  parse_warning?: string    // mensagem amigável quando a extração foi parcial
}

// UF codes (IBGE) → sigla
const UF_BY_CODE: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

/**
 * Extrai tudo que é possível a partir apenas da chave de acesso de 44 dígitos.
 * Estrutura SEFAZ: cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)
 */
export function parseFromChave(chave: string): NfeParsed {
  const clean = chave.replace(/\D/g, '')
  if (clean.length !== 44) throw new Error('Chave deve ter 44 dígitos')
  const cUF = clean.substring(0, 2)
  const aamm = clean.substring(2, 6)  // AAMM (ex: "2604" = abril/2026)
  const cnpj = clean.substring(6, 20)
  const mod = clean.substring(20, 22)
  const serie = String(parseInt(clean.substring(22, 25), 10))
  const nNF = String(parseInt(clean.substring(25, 34), 10))

  // AAMM → data de emissão aproximada (primeiro dia do mês)
  // Assumimos século 20XX
  const yy = parseInt(aamm.substring(0, 2), 10)
  const mm = parseInt(aamm.substring(2, 4), 10)
  let data_emissao: string | undefined
  if (yy >= 0 && yy <= 99 && mm >= 1 && mm <= 12) {
    const year = 2000 + yy
    const mStr = String(mm).padStart(2, '0')
    // Primeiro dia do mês (aproximação — usuário pode editar)
    data_emissao = `${year}-${mStr}-01T12:00:00-03:00`
  }

  return {
    chave: clean,
    numero: nNF,
    serie,
    modelo: mod,
    uf: UF_BY_CODE[cUF],
    emitente_cnpj: cnpj,
    data_emissao,
    itens: [],
    source: 'xml',
    parse_warning:
      'Extraído apenas da chave de acesso. Preencha emitente, valor, data exata e itens manualmente.',
  }
}

// =============== XML PARSING ===============

export function parseNfeXml(xmlText: string): NfeParsed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: false,
    trimValues: true,
  })
  const doc = parser.parse(xmlText) as Record<string, unknown>

  // Accept either <nfeProc><NFe>...</NFe></nfeProc> or direct <NFe>
  type Any = Record<string, unknown>
  const procNode = (doc['nfeProc'] as Any | undefined)
  const nfe = (procNode?.['NFe'] as Any | undefined) ?? (doc['NFe'] as Any | undefined)
  if (!nfe) throw new Error('XML inválido: nó <NFe> não encontrado')
  const infNFe = nfe['infNFe'] as Any
  if (!infNFe) throw new Error('XML inválido: <infNFe> ausente')

  const chave = typeof infNFe['@_Id'] === 'string'
    ? (infNFe['@_Id'] as string).replace(/^NFe/, '')
    : undefined

  const ide = (infNFe['ide'] as Any) || {}
  const emit = (infNFe['emit'] as Any) || {}
  const dest = (infNFe['dest'] as Any) || {}
  const total = ((infNFe['total'] as Any)?.['ICMSTot'] as Any) || {}

  const emitEnderEmit = (emit['enderEmit'] as Any) || {}
  void emitEnderEmit

  // Items may be array or single object
  const detNode = infNFe['det']
  const detArray = Array.isArray(detNode) ? detNode as Any[] : detNode ? [detNode as Any] : []

  const itens: NfeItem[] = detArray.map((det) => {
    const prod = (det['prod'] as Any) || {}
    return {
      numero: parseInt(String(det['@_nItem'] ?? '0'), 10),
      codigo: String(prod['cProd'] ?? ''),
      descricao: String(prod['xProd'] ?? ''),
      ncm: prod['NCM'] ? String(prod['NCM']) : undefined,
      cfop: prod['CFOP'] ? String(prod['CFOP']) : undefined,
      unidade: prod['uCom'] ? String(prod['uCom']) : undefined,
      quantidade: parseFloat(String(prod['qCom'] ?? '0')),
      valor_unitario: parseFloat(String(prod['vUnCom'] ?? '0')),
      valor_total: parseFloat(String(prod['vProd'] ?? '0')),
    }
  })

  const dhEmi = ide['dhEmi'] as string | undefined
  const dEmi = ide['dEmi'] as string | undefined
  const data_emissao = dhEmi || dEmi

  // Payment forms: <pag><detPag>... or direct children (legacy layouts)
  const pagNode = (infNFe['pag'] as Any | undefined) || {}
  const detPagRaw = pagNode['detPag'] ?? pagNode
  const detPagArr: Any[] = Array.isArray(detPagRaw)
    ? (detPagRaw as Any[])
    : detPagRaw && typeof detPagRaw === 'object'
      ? [detPagRaw as Any]
      : []
  const formas_pagamento: NfePaymentForm[] = detPagArr
    .filter((p) => p && (p['tPag'] !== undefined || p['vPag'] !== undefined))
    .map((p) => {
      const tPag = p['tPag'] ? String(p['tPag']) : undefined
      const vPag = p['vPag'] ? parseFloat(String(p['vPag'])) : 0
      const indPag = p['indPag'] ? String(p['indPag']) : undefined
      return {
        tPag,
        kind: mapTPagToKind(tPag),
        valor: vPag,
        indPag,
      }
    })

  return {
    chave,
    numero: ide['nNF'] ? String(ide['nNF']) : undefined,
    serie: ide['serie'] ? String(ide['serie']) : undefined,
    modelo: ide['mod'] ? String(ide['mod']) : undefined,
    emitente_nome: emit['xNome'] ? String(emit['xNome']) : undefined,
    emitente_cnpj: emit['CNPJ'] ? String(emit['CNPJ']) : (emit['CPF'] ? String(emit['CPF']) : undefined),
    emitente_ie: emit['IE'] ? String(emit['IE']) : undefined,
    destinatario_cnpj_cpf: dest['CNPJ'] ? String(dest['CNPJ']) : (dest['CPF'] ? String(dest['CPF']) : undefined),
    data_emissao,
    natureza_operacao: ide['natOp'] ? String(ide['natOp']) : undefined,
    valor_total: total['vNF'] ? parseFloat(String(total['vNF'])) : undefined,
    valor_produtos: total['vProd'] ? parseFloat(String(total['vProd'])) : undefined,
    valor_frete: total['vFrete'] ? parseFloat(String(total['vFrete'])) : undefined,
    valor_desconto: total['vDesc'] ? parseFloat(String(total['vDesc'])) : undefined,
    itens,
    formas_pagamento: formas_pagamento.length > 0 ? formas_pagamento : undefined,
    source: 'xml',
    raw: doc,
  }
}

// =============== PDF PARSING ===============

function toNumber(s: string): number {
  if (!s) return 0
  // Brazilian format: "1.234,56" → 1234.56
  return parseFloat(s.replace(/\./g, '').replace(',', '.'))
}

function normalizeCnpj(s: string): string {
  return s.replace(/\D/g, '')
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * DANFE PDF parser. DANFE layout is highly standardized (SEFAZ layout 1.01)
 * but each provider's PDF library generates slightly different text extraction.
 * We use permissive regex patterns to grab what we can. Users can edit
 * the result before saving.
 */
export function parseNfeDanfePdf(pdfText: string): NfeParsed {
  const text = pdfText.replace(/\r/g, '')
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const full = lines.join(' ')

  // ---- Chave de Acesso (44 digits, typically formatted with spaces/dots in DANFE)
  // Try multiple patterns: bare 44 digits, 11x 4 digits, digits with dots/spaces mixed
  let chave: string | undefined
  const plainMatch = text.match(/\b\d{44}\b/)
  if (plainMatch) {
    chave = plainMatch[0]
  } else {
    // Looser: capture any 44+ digit sequence across whitespace/dots
    // Walk through all "long digit clusters" and concatenate
    const normalized = text.replace(/[^\d\s]/g, ' ').replace(/\s+/g, ' ')
    const groups = normalized.match(/(?:\d{4}\s*){11}/g)
    if (groups && groups.length > 0) {
      chave = groups[0].replace(/\s+/g, '')
    } else {
      // Last resort: strip all non-digits and look for 44-digit window right after "CHAVE DE ACESSO"
      const chaveSectionMatch = text.match(/CHAVE\s+DE\s+ACESSO[^\d]*([\d\s.]{44,})/i)
      if (chaveSectionMatch) {
        const digits = chaveSectionMatch[1].replace(/\D/g, '').substring(0, 44)
        if (digits.length === 44) chave = digits
      }
    }
  }

  // ---- Número / série
  const numSerieMatch = full.match(/N[º°o]\.?\s*(\d{3,})[^\d]{0,10}S[ée]rie\s*(\d{1,3})/i)
  const numero = numSerieMatch?.[1]
  const serie = numSerieMatch?.[2]

  // ---- Emitente (first CNPJ found = emitente)
  let emitente_cnpj: string | undefined
  const cnpjMatches = full.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)
  if (cnpjMatches && cnpjMatches.length > 0) {
    emitente_cnpj = normalizeCnpj(cnpjMatches[0])
  }

  // Emitente name: typically the first all-caps line before CNPJ
  let emitente_nome: string | undefined
  for (let i = 0; i < Math.min(40, lines.length); i++) {
    const l = lines[i]
    if (l.length > 6 && l.length < 80 && /[A-ZÀ-Ú]/.test(l) && !/DANFE|CHAVE|DOCUMENTO/i.test(l)) {
      const upperRatio = l.replace(/[^A-ZÀ-Ú]/g, '').length / Math.max(1, l.length)
      if (upperRatio > 0.4) {
        emitente_nome = cleanText(l)
        break
      }
    }
  }

  // ---- Natureza da operação
  const natMatch = full.match(/NATUREZA DA OPERA[CÇ][AÃ]O[:\s]+([^\n]{3,80}?)(?:\s{2,}|PROTOCOLO|INSCRI|CNPJ)/i)
  const natureza_operacao = natMatch?.[1]?.trim()

  // ---- Data de Emissão
  let data_emissao: string | undefined
  const dateMatch = full.match(/DATA DA EMISS[AÃ]O[:\s]+(\d{2}\/\d{2}\/\d{4})/i)
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split('/')
    data_emissao = `${y}-${m}-${d}T00:00:00-03:00`
  }

  // ---- Valor Total — muitos layouts diferentes; tentamos vários padrões
  let valor_total: number | undefined
  const totalPatterns = [
    /VALOR\s+TOTAL\s+DA\s+NOTA[^\d]{0,40}([\d.]+,\d{2})/i,
    /V\.?\s*TOTAL\s+DA\s+NOTA[^\d]{0,40}([\d.]+,\d{2})/i,
    /TOTAL\s+DA\s+NOTA[^\d]{0,40}([\d.]+,\d{2})/i,
    /VALOR\s+TOTAL\s+DO[S]?\s+SERVI[CÇ]O[S]?[^\d]{0,40}([\d.]+,\d{2})/i,
    /VL\.?\s*TOTAL\s+DA\s+NOTA[^\d]{0,40}([\d.]+,\d{2})/i,
    /V\s*\.\s*TOTAL\s*\(.*?\)[^\d]{0,40}([\d.]+,\d{2})/i,
  ]
  for (const re of totalPatterns) {
    const m = full.match(re)
    if (m) { valor_total = toNumber(m[1]); break }
  }
  // Fallback: line-by-line scan for "TOTAL DA NOTA" followed by number on same or next line
  if (valor_total == null) {
    for (let i = 0; i < lines.length; i++) {
      if (/TOTAL\s+DA\s+NOTA/i.test(lines[i])) {
        // Check current line
        const sameLine = lines[i].match(/([\d.]+,\d{2})/g)
        if (sameLine && sameLine.length > 0) {
          valor_total = toNumber(sameLine[sameLine.length - 1])
          break
        }
        // Check next 3 lines
        for (let j = 1; j <= 3 && i + j < lines.length; j++) {
          const nxt = lines[i + j].match(/([\d.]+,\d{2})/)
          if (nxt) { valor_total = toNumber(nxt[1]); break }
        }
        if (valor_total != null) break
      }
    }
  }

  // ---- Valor Desconto
  let valor_desconto: number | undefined
  const descPatterns = [
    /VALOR\s+DO\s+DESCONTO[^\d]{0,40}([\d.]+,\d{2})/i,
    /VALOR\s+DESCONTO[^\d]{0,40}([\d.]+,\d{2})/i,
    /V\.?\s*DESCONTO[^\d]{0,40}([\d.]+,\d{2})/i,
    /VL\.?\s*DESCONTO[^\d]{0,40}([\d.]+,\d{2})/i,
    /\bDESCONTO\b[^\d]{0,20}([\d.]+,\d{2})/i,
  ]
  for (const re of descPatterns) {
    const m = full.match(re)
    if (m) {
      const v = toNumber(m[1])
      if (v > 0) { valor_desconto = v; break }
    }
  }

  // ---- Valor Produtos / Frete
  let valor_produtos: number | undefined
  const prodPatterns = [
    /VALOR\s+TOTAL\s+DO[S]?\s+PRODUTO[S]?[^\d]{0,40}([\d.]+,\d{2})/i,
    /V\.?\s*TOTAL\s+PRODUTO[S]?[^\d]{0,40}([\d.]+,\d{2})/i,
    /VL\.?\s*TOTAL\s+PRODUTO[S]?[^\d]{0,40}([\d.]+,\d{2})/i,
  ]
  for (const re of prodPatterns) {
    const m = full.match(re)
    if (m) { valor_produtos = toNumber(m[1]); break }
  }

  let valor_frete: number | undefined
  const freteMatch = full.match(/VALOR\s+DO\s+FRETE[^\d]{0,40}([\d.]+,\d{2})/i)
  if (freteMatch) valor_frete = toNumber(freteMatch[1])

  // ---- Itens
  // DANFE item table columns: CÓDIGO | DESCRIÇÃO | NCM | CST | CFOP | UN | QTD | VL.UNIT | VL.TOTAL | BC.ICMS | VL.ICMS | VL.IPI | ALIQ.ICMS | ALIQ.IPI
  // Cada provedor gera texto com layout ligeiramente diferente. Usamos
  // múltiplas estratégias: detectar a seção, depois escanear por linhas
  // que tenham padrão numérico compatível com item de nota.
  const itens: NfeItem[] = []

  // 1. Tenta delimitar a seção "DADOS DOS PRODUTOS"
  const startIdx = lines.findIndex((l) =>
    /DADOS\s+DOS?\s+PRODUTOS?/i.test(l) ||
    /PRODUTO[S]?\s*\/\s*SERVI[CÇ]OS?/i.test(l) ||
    /DESCRI[CÇ][AÃ]O\s+DO\s+PRODUTO/i.test(l),
  )
  const endIdx = lines.findIndex((l, i) => i > startIdx && (
    /C[AÁ]LCULO\s+DO\s+IMPOSTO/i.test(l) ||
    /TRANSPORTADOR/i.test(l) ||
    /DADOS\s+ADICIONAIS/i.test(l) ||
    /INFORMA[CÇ][OÕ]ES?\s+COMPLEMENTARES/i.test(l) ||
    /ISSQN/i.test(l)
  ))
  const itemLinesRaw = startIdx > -1
    ? lines.slice(startIdx + 1, endIdx > startIdx ? endIdx : undefined)
    : lines // Fallback: scan everything

  // Remove cabeçalhos repetidos e linhas muito curtas
  const itemLines = itemLinesRaw.filter((l) =>
    l.length > 10 &&
    !/^(C[ÓO]DIGO|DESCRI|NCM|CST|CFOP|UNID|QTDE?|VL\.?UNIT|VALOR\s+UNIT|VL\.?TOTAL|ALIQ|B\.?CALC|BASE|VAL|VR|BC|V\.?BC)/i.test(l.replace(/\s+/g, ' ').trim()),
  )

  let itemNum = 0

  // Estratégia A: padrão estrito com NCM (8 dígitos) + CFOP (4 dígitos)
  const numPat = '[\\d.]+,\\d{2,4}'
  const numInt = '[\\d.]+(?:,\\d+)?'
  const strictRe = new RegExp(
    '^(\\S+)\\s+(.+?)\\s+(\\d{8})\\s+(?:\\d{2,4}\\s+)?(\\d{4})\\s+([A-Za-z]{1,6})\\s+(' + numInt + ')\\s+(' + numPat + ')\\s+(' + numPat + ')',
  )
  for (const raw of itemLines) {
    const m = raw.match(strictRe)
    if (m) {
      itemNum++
      itens.push({
        numero: itemNum,
        codigo: m[1],
        descricao: cleanText(m[2]),
        ncm: m[3],
        cfop: m[4],
        unidade: m[5],
        quantidade: toNumber(m[6]),
        valor_unitario: toNumber(m[7]),
        valor_total: toNumber(m[8]),
      })
    }
  }

  // Estratégia B: sem NCM obrigatório, procura UN + qtd + v.unit + v.total
  if (itens.length === 0) {
    const looseRe = new RegExp(
      '^(\\S+)\\s+(.+?)\\s+([A-Za-z]{1,4})\\s+(' + numInt + ')\\s+(' + numPat + ')\\s+(' + numPat + ')',
    )
    for (const raw of itemLines) {
      const m = raw.match(looseRe)
      if (m) {
        itemNum++
        itens.push({
          numero: itemNum,
          codigo: m[1],
          descricao: cleanText(m[2]),
          unidade: m[3],
          quantidade: toNumber(m[4]),
          valor_unitario: toNumber(m[5]),
          valor_total: toNumber(m[6]),
        })
      }
    }
  }

  // Estratégia C: últimos 3 números da linha são qtd, v.unit, v.total
  if (itens.length === 0) {
    const endNumsRe = /^(.+?)\s+([\d.]+(?:,\d+)?)\s+([\d.]+,\d{2,4})\s+([\d.]+,\d{2,4})\s*$/
    for (const raw of itemLines) {
      const m = raw.match(endNumsRe)
      if (m) {
        const descPart = m[1].trim()
        // Tenta separar código (primeira palavra) da descrição
        const tokens = descPart.split(/\s+/)
        const codigo = tokens[0]
        const descricao = tokens.slice(1).join(' ')
        itemNum++
        itens.push({
          numero: itemNum,
          codigo,
          descricao: cleanText(descricao || descPart),
          quantidade: toNumber(m[2]),
          valor_unitario: toNumber(m[3]),
          valor_total: toNumber(m[4]),
        })
      }
    }
  }

  // Estratégia D: multi-line — quando descrição quebra linha, tenta juntar
  // linhas curtas com a próxima que tem números no final
  if (itens.length === 0 && itemLines.length > 0) {
    const joinedLines: string[] = []
    let buffer = ''
    for (const raw of itemLines) {
      buffer = buffer ? buffer + ' ' + raw : raw
      // Se a linha termina com pelo menos 2 números no formato brasileiro, fecha o buffer
      if (/[\d.]+,\d{2,4}\s+[\d.]+,\d{2,4}\s*$/.test(buffer)) {
        joinedLines.push(buffer)
        buffer = ''
      }
    }
    const endNumsRe = /^(.+?)\s+([\d.]+(?:,\d+)?)\s+([\d.]+,\d{2,4})\s+([\d.]+,\d{2,4})\s*$/
    for (const joined of joinedLines) {
      const m = joined.match(endNumsRe)
      if (m) {
        const descPart = m[1].trim()
        const tokens = descPart.split(/\s+/)
        const codigo = tokens[0]
        const descricao = tokens.slice(1).join(' ')
        itemNum++
        itens.push({
          numero: itemNum,
          codigo,
          descricao: cleanText(descricao || descPart),
          quantidade: toNumber(m[2]),
          valor_unitario: toNumber(m[3]),
          valor_total: toNumber(m[4]),
        })
      }
    }
  }

  // ---- Formas de pagamento (DANFE geralmente mostra "FORMA PAGTO" ou "Pagto")
  const formas_pagamento: NfePaymentForm[] = []
  // Try to detect common patterns
  const pagSectionMatch = full.match(
    /(?:FORMA(?:\s+DE)?\s+PAGTO?|FORMAS?\s+DE\s+PAGAMENTO|PAGAMENTO)[:\s]+([^A-Z]{3,120}?)(?:VALOR|INFORMAÇ|DADOS|FRETE|OBS)/i,
  )
  const pagLine = pagSectionMatch?.[1]?.toLowerCase() || ''
  const fullLower = full.toLowerCase()

  const detectValue = (): number => (valor_total ?? 0)
  if (/\bpix\b/.test(pagLine) || /\bpix\b/.test(fullLower)) {
    formas_pagamento.push({ kind: 'pix', valor: detectValue(), tPag: '17' })
  } else if (/boleto|cobran[cç]a/.test(pagLine) || /boleto|cobran[cç]a banc/.test(fullLower)) {
    formas_pagamento.push({ kind: 'boleto', valor: detectValue(), tPag: '15' })
  } else if (/cart[aã]o.*(cr[eé]dito)/.test(pagLine) || /cart[aã]o.*cr[eé]dito/.test(fullLower)) {
    formas_pagamento.push({ kind: 'credito', valor: detectValue(), tPag: '03' })
  } else if (/cart[aã]o.*(d[eé]bito)/.test(pagLine) || /cart[aã]o.*d[eé]bito/.test(fullLower)) {
    formas_pagamento.push({ kind: 'debito', valor: detectValue(), tPag: '04' })
  } else if (/dinheiro/.test(pagLine)) {
    formas_pagamento.push({ kind: 'dinheiro', valor: detectValue(), tPag: '01' })
  } else if (/transfer[eê]ncia|ted\b|doc\b/.test(pagLine)) {
    formas_pagamento.push({ kind: 'transferencia', valor: detectValue(), tPag: '18' })
  }

  // Enrichment: if we have the chave, fill in any fields the PDF parser missed
  let uf: string | undefined
  let modelo: string | undefined
  let serieFromChave: string | undefined
  let numeroFromChave: string | undefined
  let emitenteCnpjFromChave: string | undefined
  let dataFromChave: string | undefined
  if (chave && chave.length === 44) {
    try {
      const fromChave = parseFromChave(chave)
      uf = fromChave.uf
      modelo = fromChave.modelo
      serieFromChave = fromChave.serie
      numeroFromChave = fromChave.numero
      emitenteCnpjFromChave = fromChave.emitente_cnpj
      dataFromChave = fromChave.data_emissao
    } catch {
      // ignore
    }
  }

  const finalNumero = numero || numeroFromChave
  const finalSerie = serie || serieFromChave
  const finalCnpj = emitente_cnpj || emitenteCnpjFromChave
  const finalData = data_emissao || dataFromChave

  // Determine if extraction was partial
  const hasEssentials = !!(emitente_nome && valor_total && data_emissao && itens.length > 0)
  const parse_warning = hasEssentials
    ? undefined
    : 'Extração parcial do PDF. Verifique e complete emitente, valores, data e itens antes de salvar.'

  return {
    chave,
    numero: finalNumero,
    serie: finalSerie,
    modelo,
    uf,
    emitente_nome,
    emitente_cnpj: finalCnpj,
    data_emissao: finalData,
    natureza_operacao,
    valor_total,
    valor_produtos,
    valor_frete,
    valor_desconto,
    itens,
    formas_pagamento: formas_pagamento.length > 0 ? formas_pagamento : undefined,
    source: 'pdf',
    raw: { lines: lines.slice(0, 400), full: full.substring(0, 8000) },
    parse_warning,
  }
}

/** Heuristic: categorize by NCM or keywords in description */
export function guessCategory(descricao: string, ncm?: string): string {
  const d = descricao.toLowerCase()
  if (/tomada|fio|cabo|disjuntor|interruptor|l[aâ]mpada|spot|led\b|lustre/.test(d)) return 'eletrica'
  if (/torneira|registro|tubo|cano|pia|vaso|chuveiro|ducha|ralo/.test(d)) return 'hidraulica'
  if (/tinta|pincel|rolo|massa corrida|solvente|thinner/.test(d)) return 'pintura'
  if (/cimento|areia|argamassa|tijolo|rejunte|cal\b/.test(d)) return 'alvenaria'
  if (/porcelanato|revest|piso|azulejo|cer[aâ]mica/.test(d)) return 'piso'
  if (/parafuso|prego|bucha|dobradi[cç]a|fechadura|ma[cç]aneta/.test(d)) return 'ferragem'
  if (/serra|furadeira|martelo|trena|chave|alicate/.test(d)) return 'ferramentas'
  if (/madeir|compensad|mdf|laminado/.test(d)) return 'marcenaria'
  if (/lumin[aá]ria|pendente|plafon|arandela/.test(d)) return 'iluminacao'
  // NCM fallback - rough groupings
  if (ncm) {
    if (ncm.startsWith('85')) return 'eletrica'
    if (ncm.startsWith('68')) return 'piso'
    if (ncm.startsWith('32')) return 'pintura'
    if (ncm.startsWith('73')) return 'ferragem'
  }
  return 'outro'
}
