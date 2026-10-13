# Bancos de reserva (gratuitos) com troca automática

O LeadSage guarda os dados no Firestore e, quando ele falha (cota do plano gratuito, instabilidade), grava no banco SQL.
Para o SQL não depender de um só lugar, dá para ligar **vários** bancos gratuitos: se um cai, o próximo assume sozinho.

## Como ligar (Vercel → Project Settings → Environment Variables → Production)

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | banco principal (ex.: Supabase) |
| `DATABASE_URL_2` | reserva 1 (ex.: Neon ou Render) |
| `DATABASE_URL_3` … `_8` | mais reservas |
| `DATABASE_URLS` | alternativa: várias conexões separadas por vírgula |

Depois, *Redeploy*. Confira em `/api/status`: o campo `bancos` mostra cada banco (`ok`, `ativo`) sem expor conexão.

## O jeito mais rápido (sem copiar nada)
Vercel → seu projeto → **Storage** → **Create Database** → **Neon** (plano grátis) → **Connect Project**. A Vercel cria o banco e
coloca as variáveis sozinha (`DATABASE_URL`, `POSTGRES_URL`...); o LeadSage já lê esses nomes. Repita com **Supabase** para ter dois.
Depois, *Redeploy*.

## Onde conseguir bancos gratuitos
- **Supabase** (supabase.com): usar a conexão *Transaction pooler* (porta 6543). Veja `docs/supabase.md`.
- **Neon** (neon.tech): copiar a *connection string* do projeto.
- **Render Postgres** (plano free): External Database URL. Atenção: o plano free **expira em 30 dias**; serve de reserva, não de principal.

## Como funciona
- O primeiro banco que responde é usado. Falhou (recusou conexão, cota, fora do ar)? Fica de lado por 60 s e o próximo assume
  na mesma chamada. Passado o tempo, o principal volta a ser tentado.
- Todos recebem as mesmas tabelas na subida do sistema.
- Dados gravados enquanto o principal esteve fora ficam no reserva. Para juntar de novo, copie com `scripts/migrar_firestore_para_sql.py`
  (Firestore → SQL) ou um `pg_dump`/`pg_restore` entre os dois.
