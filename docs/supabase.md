# Banco de dados no Supabase (saindo do Firestore)

O login continua no Firebase (Google). O que muda é onde ficam os **dados**: perfil, créditos,
funil, fila, conversas do robô, sites, documentos. Eles passam a ficar no Postgres do Supabase.

O sistema já sabia gravar tudo em SQL; faltava um banco SQL que não se apague. É isso que o
Supabase entrega. Nada muda para o usuário final.

## Passo a passo

1. **Criar o projeto** em supabase.com (plano gratuito), na região **South America (São Paulo)**,
   a mesma da Vercel (`gru1`). Guarde a senha do banco.
2. **Pegar a conexão**: *Project Settings → Database → Connection string → Transaction pooler*
   (porta **6543**). Ela se parece com
   `postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`.
   Use a do **pooler**: a direta usa IPv6 e a Vercel não alcança.
3. **Conferir** (opcional, na sua máquina, a partir da pasta `backend`):
   `python scripts/verificar_postgres.py --url "A_CONEXAO"` deve terminar em "tudo certo".
4. **Copiar o que já existe** do Firestore (só leitura no Firestore; pode repetir):
   ```
   npx vercel env pull .env.migracao --environment production
   ```
   Edite `.env.migracao` e ponha a conexão do Supabase em `DATABASE_URL=`. Depois:
   ```
   python scripts/migrar_firestore_para_sql.py --env .env.migracao --simular
   python scripts/migrar_firestore_para_sql.py --env .env.migracao
   ```
   Se disser que o Firestore está sem cota, espere voltar (cerca de 4h da manhã, horário de Brasília)
   e rode de novo. Apague o `.env.migracao` depois: ele tem segredos de produção.
5. **Ligar na Vercel** (Project Settings → Environment Variables, Production):
   - `DATABASE_URL` = a conexão do pooler
   - `FIRESTORE_DESLIGADO` = `1`
   e faça um novo deploy (*Redeploy*). Confira em `/api/health`: `"armazenamento": "postgres"`.
6. **Voltar atrás**, se precisar: remova `FIRESTORE_DESLIGADO` e faça outro deploy. O Firestore
   continua intacto, porque a migração só lê dele.

## Depois de ligar
- Gere de novo a chave do **WhatsApp pelo computador** (ela fica guardada no banco novo).
- A cota de leituras do Firestore deixa de importar.
