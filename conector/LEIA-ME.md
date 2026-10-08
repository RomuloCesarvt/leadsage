# LeadSage Conector (WhatsApp pelo seu computador)

Liga o WhatsApp do seu computador ao robô do LeadSage, sem pagar API e sem servidor.
Quem usa continua com os dados na própria máquina; o LeadSage só decide o que responder.

> **Atenção:** isso usa o WhatsApp Web (via OpenWA), não a API oficial. O WhatsApp pode
> restringir o número. Use um número secundário, não aumente o ritmo de envio e mantenha o
> aviso "responda SAIR" nas mensagens. Os limites do LeadSage (poucas abordagens no começo,
> aumentando a cada dia, e intervalo entre elas) existem para reduzir esse risco.

## O que você precisa
- Windows, macOS ou Linux, ligado e com internet enquanto o robô trabalha.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o OpenWA).
- [Node.js 18 ou mais novo](https://nodejs.org).
- Um plano do LeadSage com o Robô de Atendimento (Pro).

## Passo a passo
1. **Suba o OpenWA** (uma vez). Em um terminal:
   ```
   git clone https://github.com/rmyndharis/OpenWA.git
   cd OpenWA
   docker compose -f docker-compose.dev.yml up -d
   docker exec openwa-api cat /app/data/.api-key
   ```
   O último comando mostra a chave de API do OpenWA. Guarde.
2. **No LeadSage**, vá em *Robô de Atendimento → Configurar → WhatsApp pelo computador* e clique em
   **Gerar chave**. Ela aparece uma única vez.
3. **Baixe os arquivos do Conector** (links na mesma tela) numa pasta, por exemplo `C:\leadsage-conector`.
4. Copie `exemplo.env` para `.env` e preencha `LEADSAGE_KEY` (passo 2) e `OPENWA_KEY` (passo 1).
5. Dê dois cliques em **iniciar.bat** (ou rode `node leadsage-conector.mjs`).
6. Na primeira vez abre uma imagem com o **QR code**: no celular, WhatsApp → *Aparelhos conectados* →
   *Conectar um aparelho*.
7. Pronto: a tela do LeadSage mostra **Conectado**. Deixe a janela aberta.

## O que ele faz
- **Responde** os leads que escrevem para o seu número, com o mesmo robô do LeadSage.
- **Envia a Fila de envio** (abordagens de WhatsApp) devagar: no máximo 5 no primeiro dia, mais 3 a cada dia
  (teto de 30), com pelo menos 90 segundos entre uma e outra.
- Só conversas individuais; grupos são ignorados. Mensagens antigas, de antes de ligar, não são respondidas.

## Se algo der errado
- *"Não encontrei o OpenWA"*: o Docker não está rodando. Abra o Docker Desktop e rode o passo 1 de novo.
- *"OpenWA recusou a chave"*: confira `OPENWA_KEY`.
- *"LeadSage recusou"* ou *chave revogada*: gere outra chave na tela e atualize o `.env`.
- Número restrito pelo WhatsApp: pare o Conector, não tente de novo no mesmo dia.

## Segurança
A chave do LeadSage e a do OpenWA ficam só no seu computador (`.env`). Gerar uma chave nova no LeadSage
derruba a antiga na hora. Nada daqui abre portas no seu roteador: o Conector só faz chamadas para fora.
