# LeadSage Conector (WhatsApp pelo seu computador)

O jeito normal de usar é pelo próprio LeadSage: **Robô de Atendimento → Configurar → WhatsApp pelo
computador**. Lá você gera sua chave e baixa **um único arquivo** (`Conectar-WhatsApp.bat`) já com a chave
dentro. Dois cliques nele e uma página abre com o **QR code**. Escaneou, conectou.

> **Atenção:** é o WhatsApp Web automatizado, não a API oficial. O WhatsApp pode restringir o número.
> Use um número secundário, não aumente o ritmo e mantenha o aviso "responda SAIR" nas mensagens.
> Os limites do LeadSage (poucas abordagens no começo, mais a cada dia, e intervalo entre elas)
> existem para reduzir esse risco, não para eliminá-lo.

## O que o arquivo faz sozinho (na primeira vez)
1. Instala o Node.js (pelo `winget` do Windows 10/11), se não houver.
2. Baixa o Conector e instala os componentes (cerca de 1 minuto, 80 MB).
3. Abre o programa e a página do QR code. Usa o Edge ou o Chrome que você já tem; não baixa outro navegador.

Nas vezes seguintes ele só atualiza o Conector e abre. Se a sessão do WhatsApp ainda valer, nem pede o QR.

## O que ele faz
- **Responde** os leads que escrevem para o seu número, com o mesmo robô do LeadSage.
- **Envia a Fila de envio** (abordagens de WhatsApp) devagar: no máximo 5 no primeiro dia, mais 3 a cada dia
  (teto de 30), com pelo menos 90 segundos entre uma e outra, "digitando…" antes de cada mensagem, e só para
  números que existem no WhatsApp.
- Só conversas individuais; grupos e status são ignorados. Mensagens antigas, de antes de ligar, não são respondidas.
- O computador precisa estar ligado, com a janela do Conector aberta, para o robô responder.

## Manualmente (Mac, Linux ou quem prefere)
```
npm install
node leadsage-conector.mjs
```
Abre `http://127.0.0.1:2790`: cole a chave, escaneie o QR. A chave fica em `config.json`, na mesma pasta.
Precisa de Node 18+ e do Chrome ou Edge instalado.

## Se algo der errado
- *Windows avisa "Windows protegeu o computador"*: clique em *Mais informações* → *Executar assim mesmo*.
  É um arquivo de texto que você pode abrir no Bloco de Notas para conferir.
- *"Não achei o Edge nem o Chrome"*: instale um deles.
- *"chave inválida ou revogada"*: gere outra no LeadSage e baixe o arquivo de novo.
- Número restrito pelo WhatsApp: pare o Conector e não tente de novo no mesmo dia.

## Segurança
A chave fica só no seu computador. Gerar outra no LeadSage derruba a antiga na hora. O Conector não abre portas
no roteador: só faz chamadas para fora (e uma página local, `127.0.0.1`, que só o seu computador enxerga).


## Dois números no mesmo computador (agência e empresa)

Cada modo do LeadSage tem a sua chave e o seu WhatsApp. Para ter os dois conectados ao mesmo tempo, rode **um Conector por modo, cada um na sua pasta**:

1. Crie uma pasta nova (por exemplo `Conector-Empresa`) e baixe nela o `Conectar-WhatsApp.bat` gerado **no modo Empresa**.
2. Abra esse `.bat` de dentro da pasta nova. O Conector da agência continua rodando na pasta dele.
3. O segundo Conector usa a próxima porta livre (2791, 2792...) e mostra o endereço no próprio painel.

**Não coloque os dois `.bat` na mesma pasta:** o `config.json` guarda uma chave só, e o último que abrir apaga a chave do outro.
