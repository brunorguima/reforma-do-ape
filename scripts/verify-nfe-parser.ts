// Quick verification script: runs parseNfeDanfePdf against Bruno's real NF-e sample.
// Run: npx tsx scripts/verify-nfe-parser.mjs
// (Uses tsx to import TS directly.)

import { parseNfeDanfePdf } from '../src/lib/nfe-parser'

const SAMPLE = `NF-e Nº SÉRIE DATA DE RECEBIMENTO IDENTIFICACAO E ASSINATURA DO RECEBEDOR RECEBEMOS DE PISO PROTECTOR E.V.A. LTDA OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO Av Doutor Severino Tostes Meirelles, 2240, Nao consta - Sao Miguel, Franca, SP - CEP: 14406004 Fone: 00000000 PISO PROTECTOR E.V.A. LTDA DANFE Documento Auxiliar da Nota Fiscal Eletrônica 0: Entrada 1: Saída Nº SÉRIE: Folha CHAVE DE ACESSO Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora 1 3526 0454 0676 2900 0188 5500 2000 0017 0512 8556 9857 NATUREZA DA OPERAÇÃO Venda de mercadorias PROTOCOLO DE AUTORIZAÇÃO DE USO INSCRIÇÃO ESTADUAL INSC. ESTADUAL DO SUBST. TRIBUTÁRIO CNPJ 137110219110 54.067.629/0001-88 002 000.001.705 000.001.705 002 135261260493 03/04/2026 15:59:42 1 d 1 DATA DA EMISSÃO DATA DA ENTRADA / SAÍDA HORA DE SAÍDA C.N.P.J / C.P.F. CEP INSCRIÇÃO ESTADUALUF BAIRRO/DISTRITO FONE/FAXMUNICÍPIO ENDEREÇO NOME/RAZÃO SOCIAL Bruno Roberto Guimaraes 350.555.188-04 DESTINATÁRIO / REMETENTE Rua Alvares de Azevedo, 55 - Nao consta Jardim Belvedere 13601173 Araras SP 03/04/2026 03/04/2026 15:59:40 FATURA/DUPLICATA BASE DE CÁLCULO DO ICMS VALOR DO ICMS BASE DE CÁLCULO DO ICMS SUBSTITUIÇÃO VALOR DO ICMS SUBSTITUIÇÃO VALOR TOTAL DOS PRODUTOS VALOR DO FRETE VALOR DO SEGURO DESCONTO OUTRAS DESPESAS ACESSÓRIAS VALOR DO IPI VALOR TOTAL DA NOTA 0,00 0,00 0,00 0,00 157,00 0,00 0,00 0,00 0,00 157,000,00 CÁLCULO DO IMPOSTO TRANSPORTADOR/VOLUME RAZÃO SOCIAL FRETE POR CONTA CODIGO ANTT PLACA DO VEÍCULO UF CNPJ/CPF ENDEREÇO QUANTIDADE ESPÉCIE MARCA NUMERAÇÃO PESO BRUTO PESO LÍQUIDO MUNICÍPIO UF INSCRIÇÃO ESTADUAL EBAZAR.COM.BR LTDA AVENIDA DAS NACOES UNIDAS 3000 3003 OSASCO SP 03.007.331/0122-39 1 2,700 2,630 2 - Terceiros 120519234116 C.N.P.J / C.P.F. CEP UF BAIRRO/DISTRITO FONE/FAXMUNICÍPIO ENDEREÇO NOME/RAZÃO SOCIAL INFORMAÇÕES DO LOCAL DE ENTREGA / RETIRADA INSCRIÇÃO ESTADUAL DADOS DO PRODUTO / SERVIÇOS CÓDIGO DESCRIÇAO DOS PRODUTOS / SERVIÇOS NCM/SH CSOSN CFOP UNID. QTD. VLR UNIT. VALOR TOTAL ICMS IPI ALÍQUOTASB. CALC. ICMS VALOR ICMS IPI VALOR PRODUTO PP22191204/12 PF PROTETOR PISO PROTECTOR 12 M2 40082100 0102 5106 UN 1 136,26 136,26 0,00 0,000,00 0,00 0,00 02354 FITA ADESIVA 48114110 0102 5106 UN 1 20,74 20,74 0,00 0,000,00 0,00 0,00 INSCRIÇÃO MUNICIPAL VALOR TOTAL DOS SERVIÇOS BASE DE CÁLCULO DO ISSQN VALOR DO ISSQN CÁLCULO DO ISSQN DADOS ADICIONAIS`

const result = parseNfeDanfePdf(SAMPLE)

const checks = [
  ['chave', result.chave, '35260454067629000188550020000017051285569857'],
  ['emitente_nome', result.emitente_nome, 'PISO PROTECTOR E.V.A. LTDA'],
  ['emitente_cnpj', result.emitente_cnpj, '54067629000188'],
  ['data_emissao starts 2026-04-03', result.data_emissao?.startsWith('2026-04-03'), true],
  ['valor_total', result.valor_total, 157],
  ['valor_produtos', result.valor_produtos, 157],
  ['valor_desconto', result.valor_desconto, 0],
  ['itens.length', result.itens.length, 2],
  ['item1.codigo', result.itens[0]?.codigo, 'PP22191204/12'],
  ['item1.ncm', result.itens[0]?.ncm, '40082100'],
  ['item1.valor_total', result.itens[0]?.valor_total, 136.26],
  ['item2.codigo', result.itens[1]?.codigo, '02354'],
  ['item2.ncm', result.itens[1]?.ncm, '48114110'],
  ['item2.valor_total', result.itens[1]?.valor_total, 20.74],
]

let passed = 0, failed = 0
for (const [name, actual, expected] of checks) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
  if (ok) passed++; else failed++
}

console.log(`\n${passed}/${passed + failed} passed`)
process.exit(failed > 0 ? 1 : 0)
