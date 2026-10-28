# WhatsApp na nuvem sempre ligado, sem pagar e sem depender de um só lugar

## O que aconteceu em 27/10

O Render suspendeu o `leadsage-nuvem` por **"Monthly Quota Exceeded"**: o plano grátis dá **750 horas por mês para a conta inteira**, e a conta tinha
3 serviços grátis ligados (`leadsage-nuvem`, `sentinela-backend`, `engenhariadedados-engine`). Um serviço 24 h já gasta ~744 h num mês de 31 dias, então
três estouram a cota no meio do mês. Enquanto está suspenso, **o WhatsApp da nuvem não envia e o robô não responde**.

Regra: **nunca deixar o WhatsApp dependendo de um único lugar grátis.** O LeadSage já sabe se revezar: cada serviço pega uma "concessão" do número
(renovada a cada 30 s); se um some, outro assume em até 2 minutos, **sem pedir QR de novo**, porque a sessão fica no banco (cifrada).

## O plano (tudo grátis)

| Camada | Onde | Cartão? | Dorme? |
|---|---|---|---|
| 1. Principal, sempre ligado | **VM grátis do Google Cloud** (e2-micro, região dos EUA) | só para ativar a conta (sem cobrança dentro do limite) | não |
| 2. Reserva, sempre ligada | **Segunda VM grátis em outro provedor** (Oracle Always Free). O Koyeb tem um serviço grátis, mas não confirmei se dorme: verificar antes de contar com ele | cartão para confirmar a conta | não (Oracle) |
| 3. Extra | Render (quando a cota renova), **só com o `leadsage-nuvem` na conta** | não | sim (15 min sem visita) |

**Hugging Face deixou de servir** (conferido em 2026-10-28): conta grátis só cria Space *estático*; Space com Docker pede plano PRO. O kit em `nuvem/hospedagens/huggingface/` só vale para quem já tem PRO.

Com mais de uma camada de pé, qualquer uma pode cair e o número continua atendido.

## Regra de ouro: o mesmo `WORKER_SECRET` em todos

A sessão do WhatsApp é cifrada com o `WORKER_SECRET`. **Serviço novo com outro segredo não consegue ler as sessões** e todo mundo teria que ler o QR de novo.
Pegue o valor no painel do Render: `leadsage-nuvem` → **Environment** → `WORKER_SECRET` (é o mesmo que está na Vercel).

## Camada 1: VM grátis (Google Cloud)

1. console.cloud.google.com → **Compute Engine → Criar instância**. Tipo **e2-micro**, região **us-central1** (ou us-east1/us-west1), disco padrão de 30 GB, Ubuntu 22.04.
   (Essa configuração está na cota "Always Free". Se mostrar preço, troque a região.)
2. Abra a VM pelo botão **SSH** do console e rode:
   ```
   curl -fsSL https://raw.githubusercontent.com/RomuloCesarvt/leadsage/main/nuvem/instalar-vm.sh -o instalar.sh
   WORKER_SECRET="O_MESMO_DO_RENDER" bash instalar.sh
   ```
3. Conferir: `journalctl -u leadsage-nuvem -f` deve mostrar "LeadSage Nuvem ligado" e, para cada número, "Sessão ligada". Não precisa abrir porta nem ter endereço público.
4. Atualizar depois: rodar o mesmo comando de novo.

(Oracle Always Free serve igual e tem mais memória, mas o cadastro costuma recusar cartões e a conta ociosa pode ser recolhida. A do Google é mais simples.)

## Camada 2: segunda VM grátis (Oracle Always Free)

Mesmo comando da camada 1, em outra VM de outro provedor (assim uma queda de provedor não derruba as duas). Oracle Cloud → *Compute → Create instance*, forma
**Ampere (VM.Standard.A1.Flex)** com 1 OCPU e 6 GB, Ubuntu, região em que houver vaga. Depois rode o mesmo `instalar.sh` com o **mesmo** `WORKER_SECRET`.
A conta ociosa pode ser recolhida pela Oracle; manter o serviço ligado (ele usa CPU a cada poucos segundos) ajuda.

**Conta nova no Google Cloud:** ela começa em "modo expresso", sem Compute Engine. Para criar a VM é preciso concluir a **avaliação gratuita** (2 etapas, com cartão).
Ao fim dos 90 dias, confirme no console se é preciso "ativar conta completa" para manter a VM do nível Always Free, e crie um **alerta de orçamento** de R$ 1.

## Camada 3: Render

Para o Render não estourar de novo, deixe **só o `leadsage-nuvem`** na conta grátis (apague ou mova os outros dois). Mesmo assim ele cabe por muito pouco
(744 h de 750), então vale como extra, não como principal.

## O que muda na tela

- O aviso de "serviço suspenso" aparece quando o Render suspende **e ninguém mais atende o número**.
- A tela agora fala direto com **quem está atendendo** (o serviço informa o endereço dele na concessão), não só com o do Render. Serviços sem endereço
  público (a VM) continuam funcionando: a tela usa a cópia guardada no servidor para as conversas e a fila envia pelo mesmo caminho.

## Limites honestos

- Conexão **não oficial** do WhatsApp (como o WhatsApp Web): use número secundário, poucas abordagens frias por dia e sempre com opção de sair.
- Os planos grátis mudam. Se um deles acabar, os outros seguram; por isso mais de uma camada.
- Enquanto nenhuma camada estiver de pé, nada é enviado e o robô não responde.
