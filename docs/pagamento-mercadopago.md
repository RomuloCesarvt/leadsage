# Receber pelo Mercado Pago e liberar a licença sozinho

Como funciona (já está no sistema; só falta ligar com as suas credenciais):

1. O cliente escolhe o plano em **Assinatura** e clica em *Assinar*. O sistema cria o pedido e abre a página do Mercado Pago, onde ele autoriza o
   cartão para a cobrança **mensal**.
2. A cada cobrança aprovada, o Mercado Pago avisa o sistema por **webhook**. O sistema confere a assinatura do aviso, **pergunta ao Mercado Pago**
   se o pagamento foi mesmo aprovado (o corpo do aviso nunca autoriza nada) e só então:
   - soma os leads do mês ao saldo do cliente;
   - estende a licença em 1 mês (a partir do que sobrou, sem perder dia);
   - libera os recursos do plano (e o robô, se ele contratou).
3. Cada pagamento vale uma vez só: o Mercado Pago reenvia o aviso quando não recebe resposta, e o sistema ignora o repetido.
4. **Falta de pagamento:** a licença vale até a data de validade + 3 dias de tolerância. Depois disso a conta volta para a Prévia (nada é apagado:
   quem pagar de novo recupera tudo). Cancelar não derruba o que já foi pago: vale até o fim do período.

## O que você precisa fazer (uma vez)

1. Crie (ou use) uma conta no **Mercado Pago** e, em *Seu negócio → Configurações → Credenciais* (ou o painel de desenvolvedores,
   *Suas integrações*), crie uma aplicação e copie o **Access Token de produção**. Para testar antes, use as credenciais de **teste** e usuários de teste.
2. No painel da aplicação, em **Webhooks / Notificações**, cadastre a URL:
   `https://SEU-APP.vercel.app/api/webhooks/pagamento`
   e marque os eventos **Pagamentos** e **Planos e assinaturas** (`subscription_preapproval` e `subscription_authorized_payment`).
   Copie a **assinatura secreta** (chave do webhook) que o painel mostra.
3. Na Vercel (*Settings → Environment Variables → Production*), crie:

   | Variável | Valor |
   |---|---|
   | `PAYMENT_PROVIDER` | `mercadopago` |
   | `MERCADOPAGO_TOKEN` | o Access Token do passo 1 |
   | `PAYMENT_WEBHOOK_SECRET` | a assinatura secreta do passo 2 |
   | `APP_URL` | o endereço do app, sem barra no fim (ex.: `https://leadsageofc.vercel.app`) |
   | `CRON_SECRET` | um texto longo qualquer (protege a sincronização diária dos bancos) |

4. Faça *Redeploy*. Quando as variáveis estão certas, os botões de **Assinar** deixam de dizer "em breve" e ficam ativos.

## Como testar sem cobrar de verdade
- Use as **credenciais de teste** do Mercado Pago e os **usuários de teste** (vendedor e comprador) do painel deles, com os cartões de teste.
- Assine um plano com a conta de teste; confira que, depois da aprovação, aparece o cartão **Sua assinatura** com a validade e que o saldo de leads subiu.
- Reenvie o aviso pelo painel do Mercado Pago: o saldo **não** pode subir de novo.
- Depois troque pelas credenciais de produção.

## Atenção
- Os preços e as cotas ficam em `backend/app/payments.py` (`PLANOS_MENSAIS`) e na tela (`frontend/src/data/planos.ts`); um teste confere que os dois batem.
- O fluxo foi testado com o Mercado Pago **simulado**. A primeira cobrança de teste real é a verificação final: se os campos do aviso vierem
  diferentes do esperado, o sistema não libera nada (falha para o lado seguro) e o erro aparece nos logs da Vercel.
