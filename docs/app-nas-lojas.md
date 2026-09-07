# LeadSage nas lojas

O que já está pronto, o que falta, e o que custa.

## A decisão de fundo

O LeadSage é um app React. Existem três caminhos para as lojas:

| Caminho | Reaproveita o código | Play Store | App Store |
|---|---|---|---|
| **Capacitor** | 100% | sim | sim |
| PWA + TWA | 100% | sim | **não** |
| Reescrever em React Native | ~0% | sim | sim |

**Capacitor** é o caminho. TWA só resolve a Play Store — a Apple não
aceita atalho para site. E reescrever joga fora tudo o que existe.

O Capacitor embrulha o app web num invólucro nativo e dá acesso a
câmera, notificação, compartilhamento. O código React continua sendo o
mesmo, e o `npm run build` continua sendo o build.

## O que já foi feito

- **Manifesto e ícones** (`public/manifest.webmanifest`, `icon-*.png`).
  Gerados a partir da marca por `python scripts/gerar-icones.py`.
- **Service worker** (`public/sw.js`) — o app abre sem rede e fica
  instalável. Política conservadora de propósito: rede primeiro para
  navegação e API, cache só para asset com hash no nome. Service worker
  guloso é a forma mais rápida de prender o usuário numa versão antiga.
- **CORS das origens nativas** (`backend/app/config.py`). Sem isto o app
  instalado toma erro em toda chamada, e o erro só aparece no aparelho.
- **Entrada com Google por estratégia** (`src/lib/autenticacao.ts`).
  `signInWithPopup` não funciona em WebView; no nativo vai por
  redirecionamento, recolhido em `AppContext`.
- **URL da API** (`.env.production.example`). No app, `/api` relativo
  aponta para o próprio aparelho — precisa ser absoluta.

## O que falta

1. `npm i @capacitor/core @capacitor/cli && npx cap init`
2. `npx cap add android` (e `ios`, num Mac)
3. `cp .env.production.example .env.production && npm run build && npx cap sync`
4. Gerar o pacote assinado e enviar.

## O que custa

Aqui não tem versão gratuita:

| Item | Custo |
|---|---|
| Conta de desenvolvedor Google Play | **US$ 25**, uma vez |
| Conta de desenvolvedor Apple | **US$ 99 por ano** |
| Mac para compilar o app iOS | obrigatório (ou serviço de build na nuvem) |

O Android dá para fazer no Windows. O iOS não: a Apple exige Xcode, que
só roda em macOS.

## O risco da Apple

A diretriz 4.2 ("minimum functionality") recusa app que seja só um site
embrulhado. Para passar, o app precisa fazer algo que o site não faz.
No caso do LeadSage, o que mais faz sentido:

- **notificação push** quando uma busca termina ou um lead responde;
- **compartilhar** o link do site gerado pela folha nativa do sistema;
- **funcionar offline** para consultar os leads já buscados.

Os três são plugin de Capacitor e nenhum exige reescrever tela.

A Play Store é bem mais tolerante — dá para publicar lá primeiro e
tratar a Apple depois.
