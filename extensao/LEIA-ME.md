# LeadSage Copiloto (extensão do Chrome/Edge): pronta, ainda desligada

Plano B para o WhatsApp **sem servidor e sem guardar conversa**: a extensão lê a conversa aberta
no WhatsApp Web, pede a resposta ao LeadSage (`POST /api/conector/responder`, que não grava nada)
e coloca o texto na caixa de mensagem. **Quem aperta Enter é a pessoa.** Ela nunca envia sozinha.

## Quando colocar em jogo
Quando guardar as conversas no banco ficar caro (o plano gratuito do Firestore encher) ou quando
alguém não puder rodar o Conector/OpenWA. Aí a conversa fica só no WhatsApp Web do usuário.

## Como testar agora (modo desenvolvedor)
1. Chrome ou Edge → `chrome://extensions` → ligar *Modo do desenvolvedor* → *Carregar sem compactação* → escolher esta pasta.
2. Clique no ícone da extensão, marque *Ativar no WhatsApp Web*, cole a chave `lsc_...` (a mesma do Conector,
   gerada no LeadSage) e salve.
3. Abra o WhatsApp Web, entre numa conversa em que o contato foi o último a falar e clique em **✨ Sugerir resposta**.

## O que falta antes de distribuir
- Ícones e publicação na Chrome Web Store (ou instalação por arquivo `.zip` para clientes).
- Se o WhatsApp Web mudar o HTML, ajustar os `SELETORES` em `conversa.js` (é o único ponto frágil).
- Um modo opcional de envio automático, com limite de ritmo, só se fizer sentido (aumenta o risco para o número).

Testes da leitura: `node --test teste.mjs`.
