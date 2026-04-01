# Reforma do Apê 🏠

App de controle de mobília, eletrodomésticos e itens para reforma de apartamento.

## Funcionalidades

- **Controle por cômodo**: Organize itens por sala, quarto, cozinha, etc.
- **Gestão de itens**: Adicione, edite e exclua mobília, eletrodomésticos, janelas e mais
- **Fotos e referências**: Adicione URLs de imagens e links de referência para cada item
- **Controle de custos**: Veja o total estimado, aprovado e já comprado
- **Status de itens**: Desejado → Aprovado → Comprado
- **Busca de promoções**: Cadastre e compare preços de diferentes lojas
- **Multi-usuário**: Bruno, Esposa e Designer — sem necessidade de login
- **Histórico**: Saiba quem sugeriu e modificou cada item

## Setup

### 1. Criar projeto Supabase (grátis)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Vá em **SQL Editor** e cole o conteúdo do arquivo `supabase-schema.sql`
4. Execute o SQL para criar as tabelas
5. Vá em **Settings > API** e copie:
   - Project URL
   - anon/public key

### 2. Configurar variáveis de ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000

### 4. Deploy (Vercel)

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Adicione as variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Deploy automático!

## Usuários

| Nome | Papel |
|------|-------|
| Bruno | Proprietário |
| Esposa | Proprietária |
| Designer | Designer |

> Para alterar os nomes, edite `src/lib/constants.ts`

## Tech Stack

- **Next.js 16** + TypeScript
- **Supabase** (PostgreSQL + Storage)
- **Tailwind CSS**
- **Lucide React** (ícones)
