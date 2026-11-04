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


## Manter os reservas com os dados (importante)

Os bancos **não são cópias um do outro**. Se o principal cair e o reserva estiver vazio, as contas aparecem sem perfil, plano, créditos e
conversas. Por isso existe a sincronização: do banco que está em uso para cada um dos outros, em lotes pequenos, sem sobrescrever o que o
reserva tem de mais novo (créditos só copiam o que falta: um saldo antigo nunca volta sobre um novo).

- **Automática:** o `vercel.json` agenda uma chamada diária a `/api/sistema/sincronizar-bancos`. Ela só aceita o segredo do cron: crie a variável
  `CRON_SECRET` (qualquer texto longo) na Vercel; a própria Vercel manda `Authorization: Bearer <CRON_SECRET>` na chamada agendada.
- **Na hora:** com o mesmo segredo, `curl -H "Authorization: Bearer <CRON_SECRET>" https://SEU-APP/api/sistema/sincronizar-bancos`. A resposta diz,
  por banco, quantas linhas copiou e quantas ainda faltam (cada execução copia até 600 por tabela; o dia seguinte continua de onde parou).

## Bancos gratuitos para colocar na rotação (confira os limites antes: mudam)
- **Neon**: limite de *horas de computação por mês*. O banco "dorme" sem uso; consultas constantes o mantêm acordado.
- **Supabase**: limite de tamanho (~500 MB) e de tráfego mensal; o projeto pausa depois de ~7 dias sem uso.
- **Aiven (PostgreSQL free)** e **CockroachDB serverless (free)**: aceitam conexão Postgres; entram como `DATABASE_URL_3`, `_4`.
- Cada banco extra é uma conta/projeto novo no provedor. Cole a *connection string* em `DATABASE_URL_N` e faça *Redeploy*.
- Para economizar a cota: coloque primeiro o banco que **não dorme** (Supabase) e deixe o que tem horas contadas (Neon) como reserva.

## O que já foi feito para gastar menos do banco
- Perguntas do conector (WhatsApp) filtram no banco só o que está em aberto, em vez de baixar o histórico inteiro.
- Perfil e canal do robô ficam alguns segundos na memória do servidor (quase toda requisição lia o banco para isso).
- Com o Postgres no ar, pipeline, perfil, integrações, documentos, sites e raio-x são copiados do Firestore **uma única vez** e nunca mais lidos
  nem gravados lá (o Firestore tem cota diária e já respondeu 429).
- Com o conector parado, ele pergunta de 2 em 2 minutos (antes 90 s).
