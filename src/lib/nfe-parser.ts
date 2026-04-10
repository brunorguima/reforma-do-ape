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

export interface NfeParsed {
  chave?: string
  numero?: string
  serie?: string
  modelo?: string
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
  source: 'pdf' | 'xml'
  raw?: unknown
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

  // ---- Chave de Acesso (44 digits, typically formatted with spaces in DANFE)
  let chave: string | undefined
  const chaveMatch = text.match(/(\d{4}\s*){11}/)
  if (chaveMatch) {
    chave = chaveMatch[0].replace(/\s+/g, '')
  } else {
    const plain = text.match(/\b\d{44}\b/)
    if (plain) chave = plain[0]
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

  // ---- Valor Total
  let valor_total: number | undefined
  const totalMatch = full.match(/VALOR TOTAL DA NOTA[:\s]+R?\$?\s*([\d.,]+)/i)
  if (totalMatch) valor_total = toNumber(totalMatch[1])

  // ---- Itens
  // DANFE item table typically has columns:
  // CÓDIGO | DESCRIÇÃO | NCM/SH | CST | CFOP | UN | QTD | VL.UNIT | VL.TOTAL | ...
  // We try to find a table section and parse line by line
  const itens: NfeItem[] = []

  // Heuristic: find "DADOS DOS PRODUTOS" section and parse until "CÁLCULO DO IMPOSTO" or similar footer
  const startIdx = lines.findIndex((l) => /DADOS DOS PRODUTOS/i.test(l) || /DESCRI[CÇ][AÃ]O DO PRODUTO/i.test(l))
  const endIdx = lines.findIndex((l, i) => i > startIdx && /C[AÁ]LCULO|TRANSPORTADOR|DADOS ADICION/i.test(l))
  const itemLines = startIdx > -1 ? lines.slice(startIdx + 1, endIdx > startIdx ? endIdx : undefined) : []

  // Line pattern: codigo descricao ncm cst cfop un qtd vunit vtot ...
  // Brazilian numbers so greedy match
  const numPat = '[\\d.]+(?:,\\d+)?'
  const lineRe = new RegExp(
    '^(\\S+)\\s+(.+?)\\s+(\\d{8})\\s+(\\d{2,4})?\\s*(\\d{4})\\s+(\\w{1,4})\\s+(' + numPat + ')\\s+(' + numPat + ')\\s+(' + numPat + ')',
  )

  let itemNum = 0
  for (const raw of itemLines) {
    const m = raw.match(lineRe)
    if (m) {
      itemNum++
      itens.push({
        numero: itemNum,
        codigo: m[1],
        descricao: cleanText(m[2]),
        ncm: m[3],
        cfop: m[5],
        unidade: m[6],
        quantidade: toNumber(m[7]),
        valor_unitario: toNumber(m[8]),
        valor_total: toNumber(m[9]),
      })
    }
  }

  // Fallback: if regex didn't match any lines (common due to layout noise),
  // try a simpler heuristic: look for lines ending with three numbers (qtd, vunit, vtot)
  if (itens.length === 0 && itemLines.length > 0) {
    const simpleRe = /^(\S+)\s+(.+?)\s+(\w{1,4})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/
    for (const raw of itemLines) {
      const m = raw.match(simpleRe)
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

  return {
    chave,
    numero,
    serie,
    modelo: chave && chave.length === 44 ? chave.substring(20, 22) : undefined,
    emitente_nome,
    emitente_cnpj,
    data_emissao,
    natureza_operacao,
    valor_total,
    itens,
    source: 'pdf',
    raw: { lines: lines.slice(0, 200) },
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
