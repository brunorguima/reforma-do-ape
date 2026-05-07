/**
 * Gemini-based orçamento parser
 * ------------------------------------------------------------------
 * Uses Gemini 2.5 Flash (multimodal) to read a free-form PDF budget
 * from a construction professional and return a structured object.
 *
 * Gemini accepts PDF bytes directly via `inlineData`, so this works
 * for both native PDFs and scanned/image-only PDFs (OCR in one shot).
 *
 * Requires env var GEMINI_API_KEY (get it free at
 * https://aistudio.google.com/apikey).
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'

export interface OrcamentoItem {
  numero: number
  descricao: string
  quantidade: number
  unidade: string | null
  valor_unitario: number
  valor_total: number
  categoria: string | null
  ambiente_sugerido: string | null
  observacoes: string | null
}

export interface OrcamentoParsed {
  profissional_sugerido: string | null
  especialidade_sugerida: string | null
  telefone: string | null
  email: string | null
  cnpj_cpf: string | null
  data_orcamento: string | null
  validade_dias: number | null
  condicoes_pagamento: string | null
  total: number
  total_mao_obra: number | null
  total_material: number | null
  itens: OrcamentoItem[]
  observacoes: string | null
  confidence: 'alta' | 'media' | 'baixa'
  warnings: string[]
}

const CATEGORIES = [
  'eletrica',
  'hidraulica',
  'alvenaria',
  'piso',
  'pintura',
  'gesso',
  'marcenaria',
  'serralheria',
  'vidraçaria',
  'impermeabilizacao',
  'ar_condicionado',
  'demolicao',
  'limpeza',
  'mao_de_obra',
  'material',
  'outro',
] as const

const SYSTEM_PROMPT = `Você é um assistente especializado em ler orçamentos de reforma de apartamento no Brasil.
Dado um PDF de orçamento (pode ser de pedreiro, eletricista, marceneiro, arquiteto, etc.), extraia os dados estruturados.

Regras importantes:
1. Valores SEMPRE em número (não string). Converta "R$ 1.234,56" para 1234.56. Use ponto como separador decimal.
2. Datas no formato ISO YYYY-MM-DD. Se só tiver mês/ano, assuma dia 01. Se estiver em formato brasileiro "10/04/2026", converta.
3. Quantidades em número. Se não explícito, use 1.
4. Se o orçamento tem uma lista de itens/serviços, extraia CADA UM como linha separada, mesmo que o preço não esteja ao lado (às vezes só o total final aparece). Nesse caso, coloque valor_unitario=0 e valor_total=0 no item e deixe só o total geral preenchido.
5. Categoria: escolha UMA da lista: ${CATEGORIES.join(', ')}. Se não der pra classificar, use "outro".
6. Ambiente sugerido: texto livre se o item mencionar um cômodo específico (ex: "Sala de estar", "Cozinha", "Banheiro suíte"). Senão null.
7. CNPJ/CPF: só números, sem máscara.
8. Campos não encontrados = null (não invente).
9. confidence: "alta" se você tá 95%+ certo, "media" se faltou algum detalhe, "baixa" se o PDF tá ilegível ou mal estruturado.
10. warnings: lista de avisos úteis pro usuário (ex: "valores individuais não encontrados, só total geral", "validade não especificada", etc).

Retorne EXCLUSIVAMENTE um JSON válido seguindo o schema, sem markdown, sem \`\`\`json, sem explicação.`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    profissional_sugerido: { type: 'string', nullable: true },
    especialidade_sugerida: { type: 'string', nullable: true },
    telefone: { type: 'string', nullable: true },
    email: { type: 'string', nullable: true },
    cnpj_cpf: { type: 'string', nullable: true },
    data_orcamento: { type: 'string', nullable: true },
    validade_dias: { type: 'number', nullable: true },
    condicoes_pagamento: { type: 'string', nullable: true },
    total: { type: 'number' },
    total_mao_obra: { type: 'number', nullable: true },
    total_material: { type: 'number', nullable: true },
    itens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'number' },
          descricao: { type: 'string' },
          quantidade: { type: 'number' },
          unidade: { type: 'string', nullable: true },
          valor_unitario: { type: 'number' },
          valor_total: { type: 'number' },
          categoria: { type: 'string', nullable: true },
          ambiente_sugerido: { type: 'string', nullable: true },
          observacoes: { type: 'string', nullable: true },
        },
        required: ['numero', 'descricao', 'quantidade', 'valor_unitario', 'valor_total'],
      },
    },
    observacoes: { type: 'string', nullable: true },
    confidence: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['total', 'itens', 'confidence', 'warnings'],
}

let cachedModel: GenerativeModel | null = null
function getModel(): GenerativeModel {
  if (cachedModel) return cachedModel
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY não configurada. Gere uma grátis em https://aistudio.google.com/apikey e adicione como variável de ambiente no Vercel.',
    )
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  cachedModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: RESPONSE_SCHEMA as any,
    },
  })
  return cachedModel
}

/**
 * Parse an orçamento PDF using Gemini multimodal.
 * Accepts raw PDF bytes and returns the structured object.
 */
export async function parseOrcamentoPdfWithGemini(
  pdfBytes: Uint8Array | Buffer,
): Promise<OrcamentoParsed> {
  const model = getModel()
  const base64 = Buffer.from(pdfBytes).toString('base64')

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64,
      },
    },
    {
      text: 'Extraia o orçamento deste PDF e retorne o JSON estruturado.',
    },
  ])

  const text = result.response.text()
  let parsed: OrcamentoParsed
  try {
    parsed = JSON.parse(text) as OrcamentoParsed
  } catch (e) {
    throw new Error(`Gemini retornou JSON inválido: ${text.slice(0, 200)}`)
  }

  // Defensive normalization
  parsed.itens = (parsed.itens ?? []).map((it, i) => ({
    numero: typeof it.numero === 'number' ? it.numero : i + 1,
    descricao: String(it.descricao ?? ''),
    quantidade: Number(it.quantidade ?? 1) || 1,
    unidade: it.unidade ?? null,
    valor_unitario: Number(it.valor_unitario ?? 0) || 0,
    valor_total: Number(it.valor_total ?? 0) || 0,
    categoria: it.categoria ?? null,
    ambiente_sugerido: it.ambiente_sugerido ?? null,
    observacoes: it.observacoes ?? null,
  }))
  parsed.total = Number(parsed.total ?? 0) || 0
  parsed.total_mao_obra = parsed.total_mao_obra != null ? Number(parsed.total_mao_obra) : null
  parsed.total_material = parsed.total_material != null ? Number(parsed.total_material) : null
  parsed.warnings = parsed.warnings ?? []
  if (!['alta', 'media', 'baixa'].includes(parsed.confidence)) {
    parsed.confidence = 'media'
  }

  // Sanity check: if itens sum is way off from total, warn
  const itensSum = parsed.itens.reduce((s, it) => s + (it.valor_total || 0), 0)
  if (parsed.total > 0 && itensSum > 0) {
    const diff = Math.abs(itensSum - parsed.total) / parsed.total
    if (diff > 0.02) {
      parsed.warnings.push(
        `Soma dos itens (R$ ${itensSum.toFixed(2)}) não bate com o total declarado (R$ ${parsed.total.toFixed(2)}). Revise manualmente.`,
      )
    }
  }

  return parsed
}
