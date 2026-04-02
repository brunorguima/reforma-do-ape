# Reforma Ap 62 🏠

App completo de gestao de reforma de apartamento — orcamentos, obras, financeiro e mobilia.

**Live:** [reforma-app.vercel.app](https://reforma-app.vercel.app)

## Visao Geral

Aplicacao web mobile-first para Bruno e Graziela controlarem toda a reforma do apartamento 62, incluindo orcamentos com profissionais, acompanhamento de obra, controle financeiro de parcelas/pagamentos, e planejamento de mobilia e eletrodomesticos. A designer de interiores (Mari) tem acesso restrito ao que e relevante para ela.

## Funcionalidades

### Orcamentos (Profissionais)
- Cadastro de profissionais com contato, especialidade e indicacao
- Orcamentos por profissional com status progressivo (Recebido -> Avaliando -> Aprovado -> Contratado)
- Contratos fechados com valor original vs. negociado e economia calculada
- Status "Pago" automatico (reconhecido quando todas as parcelas sao quitadas)
- Edicao completa de contratos, orcamentos e profissionais (sem travas)
- Forma de pagamento e detalhes por contrato

### Obra
- Acompanhamento de documentos e projetos da obra
- Upload e organizacao de arquivos
- Tarefas e checklist da obra

### Financeiro
- Visao unificada de todos os contratos e pagamentos
- Parcelas com timeline visual e status (pendente/pago)
- Adicionar, editar e excluir parcelas
- Proximos pagamentos com alerta de urgencia
- Gastos por categoria com diluicao proporcional de descontos
- Botao "Desfazer" para reverter status de pagamento
- Audit log completo de todas as exclusoes

### Mobilia
- Itens organizados por comodo (sala, quarto, cozinha, etc.)
- Status: Ja Temos -> Desejado -> Aprovado -> Comprado
- Fotos, links de referencia e busca de promocoes
- Resumo de custos por status e comodo

### Seguranca e Permissoes
- Acesso por chave na URL (sem login tradicional)
- Bruno e Graziela: acesso total a tudo (editar, adicionar, excluir)
- Mari (designer): pode excluir apenas itens que ela criou
- Audit log registra quem deletou, quando e o que

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| UI | Inline styles + Lucide React icons |
| Backend | Next.js API Routes (serverless) |
| Banco de dados | Supabase (PostgreSQL) com RLS |
| Deploy | Vercel (auto-deploy) |
| Controle | GitHub |

## Estrutura do Projeto

```
src/
├── app/
│   ├── page.tsx                    # Pagina principal com abas
│   ├── layout.tsx                  # Layout global
│   └── api/
│       ├── audit-log/route.ts      # Log de auditoria
│       ├── auth/route.ts           # Autenticacao por chave
│       ├── budget-items/route.ts   # Itens de orcamento detalhado
│       ├── categories/route.ts     # Categorias de mobilia
│       ├── contracts/route.ts      # Contratos (GET, PATCH)
│       ├── documents/              # Documentos da obra (CRUD)
│       ├── items/                  # Itens de mobilia (CRUD)
│       ├── payments/route.ts       # Parcelas (CRUD completo)
│       ├── professionals/          # Profissionais (CRUD)
│       ├── promotions/route.ts     # Busca de promocoes
│       ├── quotes/                 # Orcamentos (CRUD)
│       ├── rooms/route.ts          # Comodos
│       ├── service-categories/     # Categorias de servico
│       └── tasks/                  # Tarefas da obra (CRUD)
├── components/
│   ├── FinanceiroPanel.tsx         # Aba Financeiro
│   ├── ProfessionalsPanel.tsx      # Aba Orcamentos
│   ├── ObraPanel.tsx               # Aba Obra
│   ├── ItemCard.tsx                # Card de item de mobilia
│   ├── AddItemModal.tsx            # Modal de adicionar/editar item
│   ├── CostSummary.tsx             # Resumo de custos
│   ├── RoomSelector.tsx            # Seletor de comodos
│   ├── UserSelector.tsx            # Seletor de usuario
│   ├── WelcomeScreen.tsx           # Tela de boas-vindas
│   └── PromotionSearch.tsx         # Busca de promocoes
└── lib/
    ├── supabase.ts                 # Cliente Supabase
    ├── constants.ts                # Usuarios, status, formatacao
    └── crawler.ts                  # Web crawler de precos
```

## Banco de Dados (Supabase)

### Tabelas Principais

| Tabela | Descricao |
|--------|-----------|
| `rooms` | Comodos do apartamento |
| `categories` | Categorias de mobilia |
| `items` | Itens de mobilia/eletrodomesticos |
| `professionals` | Cadastro de profissionais |
| `service_categories` | Categorias de servico (pintura, eletrica, etc.) |
| `quotes` | Orcamentos recebidos |
| `contracts` | Contratos fechados |
| `budget_items` | Itens detalhados do orcamento |
| `payments` | Parcelas de pagamento |
| `tasks` | Tarefas da obra |
| `documents` | Documentos e projetos |
| `audit_log` | Log de auditoria (exclusoes) |
| `promotions` | Promocoes encontradas |

## URLs de Acesso

| Usuario | URL |
|---------|-----|
| Bruno / Graziela | `?key=reforma62bg` |
| Mari (designer) | `?key=mari-bp62` |

## Setup Local

```bash
# 1. Clone
git clone https://github.com/brunorguima/reforma-do-ape.git
cd reforma-do-ape

# 2. Instale dependencias
npm install

# 3. Configure variaveis de ambiente
# Crie .env.local na raiz com:
# NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon

# 4. Rode localmente
npm run dev
```

## Deploy

O app e deployado na Vercel. Cada push no branch `main` faz deploy automatico.

```bash
# Deploy manual
npx vercel --prod
```

## Validacao e Seguranca

Todas as 21 API routes possuem:
- Validacao de campos obrigatorios
- Protecao contra valores negativos em campos monetarios
- Verificacao de NaN/Infinity em calculos
- Protecao contra divisao por zero
- Validacao de IDs em operacoes de update/delete
- Audit log em todas as exclusoes

## Roadmap para Produto de Mercado

Este app foi construido como ferramenta pessoal, mas tem potencial para SaaS de gestao de reformas.

### Arquitetura para Escalar
- Autenticacao real (Supabase Auth ou NextAuth)
- Multi-tenancy (cada reforma e um "workspace")
- Roles dinamicos (proprietario, designer, pedreiro, etc.)
- Onboarding wizard para nova reforma
- Internacionalizacao (pt-BR, en, es)

### Features para Mercado
- Dashboard com timeline da obra
- Notificacoes push de vencimento de parcelas
- Integracao com WhatsApp para comunicacao com profissionais
- Comparativo automatico de precos (crawler expandido)
- Galeria de fotos antes/depois por comodo
- Templates de orcamento padrao por tipo de servico
- Relatorios PDF exportaveis
- App mobile nativo (React Native)

### Infraestrutura
- Testes automatizados (Jest + Playwright)
- CI/CD pipeline no GitHub Actions
- Monitoring (Sentry)
- Analytics (PostHog ou Mixpanel)
- Backup automatico do banco

## Licenca

Projeto privado de Bruno Guimaraes e Graziela.
