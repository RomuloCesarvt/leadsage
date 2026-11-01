# Conectar o Instagram (API oficial da Meta)

O Instagram entra pelo mesmo login do Facebook do WhatsApp/Messenger: a página escolhida traz junto o Instagram profissional ligado a ela.
O robô **lê e responde** as mensagens diretas de quem escreveu (até 24 h depois). A Meta não permite a primeira mensagem para quem nunca escreveu;
o disparo continua abrindo o link da conversa.

## No sistema (variáveis de ambiente do servidor)
- `META_APP_ID`, `META_APP_SECRET`: do app em developers.facebook.com.
- `META_VERIFY_TOKEN`: qualquer texto; o mesmo vai no webhook do app.
- `META_LOGIN_CONFIG_ID` (opcional): Login do Facebook para Empresas.

## No app da Meta (developers.facebook.com)
1. Produtos: **Facebook Login** (ou Login para Empresas) e **Webhooks**.
2. Facebook Login → URI de redirecionamento válido: `<APP_URL>/api/robo/meta/retorno`.
3. Webhooks → objeto **Instagram** (e **Page**): URL de retorno `<APP_URL>/api/robo/meta/webhook`, o mesmo `META_VERIFY_TOKEN`, campo `messages`.
4. Permissões: `instagram_basic`, `instagram_manage_messages`, `pages_show_list`, `pages_messaging`, `pages_manage_metadata`, `business_management`.
   Com o app em modo desenvolvimento só funcionam contas que são administradoras/testadoras do app; para o público é preciso a **Análise do app** da Meta.
5. URL de exclusão de dados: `<APP_URL>/api/robo/meta/exclusao`.

## Para cada cliente
Conta do Instagram **profissional**, ligada a uma **página do Facebook**, com "Permitir acesso às mensagens" ligado (Configurações → Mensagens).
Na tela Robô → Canais, o cartão do Instagram mostra o que falta (inclusive variáveis do sistema ainda não configuradas).
