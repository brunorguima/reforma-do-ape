@AGENTS.md

# Reforma do Apartamento — Estado do Projeto

> **Última atualização:** 2026-04-06
> **Donos:** Bruno Guimarães (brunorguima@gmail.com) & Graziela
> **Arquiteta:** Mariana Borges (Mari)
> **Pedreiro:** Rodolfo de Carvalho Chucai

---

## Links Importantes (NÃO ALTERAR)

| Recurso | URL |
|---------|-----|
| **App (Produção)** | https://reforma-app.vercel.app |
| **GitHub** | https://github.com/brunorguima/reforma-do-ape |
| **Supabase Project** | https://supabase.com/dashboard/project/muhjdnpstuxmoivubmyr |
| **Supabase API** | https://muhjdnpstuxmoivubmyr.supabase.co |
| **Vercel Dashboard** | https://vercel.com/brunorguima-1393s-projects/reforma-app |

### Credenciais

- **Supabase anon key:** `[VER_SUPABASE_KEY_NO_MEMORY_DO_CLAUDE]`
- **Vercel token:** `[VER_TOKEN_NO_MEMORY_DO_CLAUDE]` (expira 02/05/2026)
- **Supabase project_id:** `muhjdnpstuxmoivubmyr`

---

## Stack Técnica

- **Framework:** Next.js 16, App Router, TypeScript
- **DB:** Supabase (PostgreSQL) com RLS (anon role, full access)
- **Storage:** Supabase Storage, bucket `documents` (público)
- **Deploy:** Vercel CLI (`npx vercel --prod --yes --token TOKEN`)
- **Git:** Push para `origin main` após cada deploy

### Comando de Deploy

```bash
cd reforma-app
npm run build && npx vercel --prod --yes --token [VER_TOKEN_NO_MEMORY_DO_CLAUDE]
git add -A && git commit -m "descrição" && git push origin main
```

---

## Estrutura da App (4 abas)

### 1. Obra (ObraPanel.tsx)
- Tarefas por fase da obra (demolição, elétrica, hidráulica, piso, etc.)
- Upload de documentos com preview (fotos e PDFs)
- Viewer de documentos com botão "Voltar" e "Baixar" (não abre PDF cru)
- Cômodos gerenciáveis

### 2. Orçamentos (ProfessionalsPanel.tsx)
- Cadastro de profissionais com contato
- Orçamentos (quotes) com status: recebido → avaliando → aprovado → contratado → pago
- Contratos fechados com parcelas
- **Materiais comprados** — cadastro completo com categoria, loja, quem comprou, link, valor
- Filtros por categoria e status

### 3. Financeiro (FinanceiroPanel.tsx)
- Visão geral: Total Pago, Total Geral (serviços + materiais)
- Parcelas por profissional com mark as paid/edit/delete
- Gastos por categoria (serviços)
- **Seção Materiais** — breakdown por categoria e por comprador
- **Resumo Geral** — serviços + materiais = total investido
- Audit log de alterações

### 4. Lista de Compras (página principal)
- Itens por cômodo com preços
- Busca de promoções (crawler)
- Resumo de custos

---

## API Routes (21+ endpoints)

| Rota | Métodos | Descrição |
|------|---------|-----------|
| `/api/tasks` | GET, POST | Tarefas da obra |
| `/api/tasks/[id]` | PATCH, DELETE | Editar/deletar tarefa |
| `/api/documents` | GET, POST | Documentos |
| `/api/documents/[id]` | PATCH, DELETE | Editar/deletar documento |
| `/api/documents/upload` | POST | Upload de arquivo (FormData) |
| `/api/documents/view` | GET | **Viewer HTML** com header + iframe + botão Voltar |
| `/api/documents/raw` | GET | Arquivo bruto (PDF/imagem servido inline) |
| `/api/materials` | GET, POST | Materiais comprados |
| `/api/materials/[id]` | PATCH, DELETE | Editar/deletar material |
| `/api/quotes` | GET, POST | Orçamentos |
| `/api/quotes/[id]` | PUT, DELETE | Editar/deletar orçamento |
| `/api/professionals` | GET, POST | Profissionais |
| `/api/professionals/[id]` | PATCH | Editar profissional |
| `/api/contracts` | GET | Contratos |
| `/api/budget-items` | GET | Itens do orçamento detalhado |
| `/api/payments` | GET, POST, PATCH, DELETE | Parcelas |
| `/api/rooms` | GET, POST | Cômodos |
| `/api/service-categories` | GET | Categorias de serviço |
| `/api/items` | GET, POST | Itens de compra |
| `/api/items/[id]` | PATCH, DELETE | Editar/deletar item |
| `/api/audit-log` | GET, POST | Log de auditoria |
| `/api/auth` | POST | Autenticação simples |
| `/api/promotions` | POST | Busca de promoções |
| `/api/categories` | GET | Categorias de itens |

---

## Banco de Dados (19 tabelas no Supabase)

| Tabela | Registros (06/04) | Descrição |
|--------|-----------|-----------|
| `contracts` | 1 | Rodolfo — R$38K negociado (original R$40.110) |
| `payments` | 6 | Parcelas do Rodolfo |
| `budget_items` | 25 | Itens detalhados do orçamento (PDF Baggio Primo) |
| `quotes` | 3 | Orçamentos recebidos |
| `professionals` | 4 | Profissionais cadastrados |
| `documents` | 2 | Documentos/fotos enviados |
| `materials` | 0 | Materiais comprados (feature nova 06/04) |
| `tasks` | 41 | Tarefas da obra por fase |
| `rooms` | 13 | Cômodos do apartamento |
| `service_categories` | 12 | Categorias de serviço |
| `items` | — | Itens da lista de compras |
| `audit_log` | — | Histórico de alterações |
| `access_keys` | — | Chaves de acesso por usuário |
| `activity_log` | — | Log de atividade |
| `categories` | — | Categorias de itens |
| `item_images` | — | Imagens de itens |
| `price_suggestions` | — | Sugestões de preço (crawler) |
| `quote_attachments` | — | Anexos de orçamentos |
| `professional_activity_log` | — | Log de atividade profissional |

### Colunas importantes
- **documents:** usa `doc_type` (NÃO `type`) — erro anterior causou bug
- **materials:** `name, description, category, quantity, unit_price, total_price, store, purchase_url, purchased_by, purchase_date, receipt_url, notes`

---

## Contrato do Pedreiro (Rodolfo)

- **Original:** R$ 40.110 (base R$25K + complementar R$15.110)
- **Negociado:** R$ 38.000
- **Parcelas:** 5, a cada 15 dias, início 17/04/2026
- **Materiais:** NÃO inclusos (por conta de Bruno e Grazi)
- **Início da obra:** 06/04/2026

---

## Categorias de Materiais

elétrica, hidráulica, acabamento, pintura, alvenaria, piso, iluminação, marcenaria, ferragem, limpeza, ferramentas, outro

---

## Regras Importantes para o Agente

1. **NUNCA alterar URLs** do Supabase, Vercel ou GitHub — usar exatamente as listadas acima
2. **SEMPRE deploy + commit + push** após alterações de código
3. Coluna de tipo de documento é `doc_type`, não `type`
4. Documents viewer: `/api/documents/view` retorna HTML com header, `/api/documents/raw` retorna o arquivo
5. Tudo deve ser editável (inputs, dropdowns, sem dados fixos)
6. Após DDL no Supabase: rodar `NOTIFY pgrst, 'reload schema'`
7. Usuários: Bruno, Graziela, Mari (arquiteta) — selecionados via UserSelector
8. App é mobile-first, funciona em desktop (max-width 1600px)
9. Scope do Vercel: NÃO usar `--scope` (dá erro), apenas `--token`

---

## Bugs Já Corrigidos (não reintroduzir)

- `doc_type` vs `type` na tabela documents
- PDF viewer sem botão de voltar (agora tem header com Voltar + Baixar)
- URL feia do Supabase aparecendo (agora usa proxy via /api/documents/raw)
- Overflow no mobile (fontes, tabs, containers)
- Vercel `--scope` causando erro

---

## Próximos Passos / Roadmap

- [ ] Sync diário Notion → Supabase (7h, tarefas da arquiteta)
- [ ] Transformar em SaaS (auth, multi-tenant, billing)
- [ ] Busca de preços de materiais na internet (crawler)
- [ ] Notificações de parcelas vencendo
- [ ] Dashboard com gráficos de gastos ao longo do tempo
