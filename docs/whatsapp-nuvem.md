# WhatsApp na nuvem (sem computador ligado)

Cada usuário conecta o número dele **uma vez** (QR code, ou código digitado no celular) e o
WhatsApp fica ligado num servidor do LeadSage: o robô responde, a fila de envio sai e o chat funciona
**sem computador ligado**. O número só desconecta se o usuário clicar em **Desligar**.

O LeadSage na Vercel não consegue manter um WhatsApp ligado (funções de até 60 s). Por isso existe
um serviço pequeno, `nuvem/`, que roda **o tempo todo** num servidor. Ele fala com o LeadSage pelas
mesmas rotas do Conector do computador, só que atende todos os usuários no mesmo processo.

## O que você precisa fazer (uma vez)

1. **Escolher onde roda** (precisa de cartão): Fly.io, Railway, Render (plano pago) ou uma VM
   (Oracle Always Free, Google Cloud e2-micro). Um servidor de 512 MB a 1 GB atende dezenas de
   números. Custo típico: poucos dólares por mês.
2. **Criar um segredo** (qualquer texto longo, 24+ caracteres). Ele vai nos dois lados:
   - Vercel → Environment Variables: `WORKER_SECRET` = o segredo. Faça *Redeploy*.
   - No servidor: `WORKER_SECRET` = o mesmo segredo, `LEADSAGE_URL` = `https://leadsageofc.vercel.app`,
     `DADOS_DIR` = a pasta que **persiste** (volume).
3. **Subir o serviço.** Exemplo no Fly.io, a partir da raiz do repositório:
   ```
   fly launch --no-deploy --copy-config --config nuvem/fly.toml --dockerfile nuvem/Dockerfile
   fly volumes create dados --size 1 --region gru
   fly secrets set WORKER_SECRET=SEU_SEGREDO LEADSAGE_URL=https://leadsageofc.vercel.app
   fly deploy --config nuvem/fly.toml --dockerfile nuvem/Dockerfile
   ```
   Em outra plataforma: use o `nuvem/Dockerfile` (contexto = raiz do repositório), exponha a porta
   8080 e monte um volume em `/dados`.
4. Conferir: `https://SEU-APP.fly.dev/` deve responder `{"ok":true,"sessoes":0}` e, no log, "LeadSage Nuvem ligado".

## Como o usuário usa

Robô → Canais → WhatsApp → **Conectar pela nuvem**. Aparece o QR code (ou ele digita o número e recebe
um código de 8 caracteres para digitar no WhatsApp). Pronto: pode fechar o LeadSage e desligar o computador.

## O que fica guardado e onde

- A sessão do WhatsApp de cada usuário e o histórico recente das conversas ficam no **volume** do servidor
  (`/dados/<uid>/`). Se o volume for perdido, os usuários precisam conectar de novo.
- Quem clica em **Desligar** é desconectado do WhatsApp e tem a sessão apagada.
- Se o LeadSage ficar fora do ar, **ninguém é desconectado**: o serviço só desliga um número quando o
  LeadSage confirma que o usuário pediu.

## Limites e riscos (dizer ao usuário)

- É conexão **não oficial** (como o WhatsApp Web): o WhatsApp pode restringir o número. Use número
  secundário, poucas abordagens frias por dia (o LeadSage já limita) e sempre com opção SAIR.
- Contatos novos e histórico: o chat mostra as conversas desde que a nuvem ligou (mais o que o WhatsApp
  sincroniza na primeira conexão).
- Um número = uma conexão: ligar a nuvem troca a chave do Conector do computador (e vice-versa).
