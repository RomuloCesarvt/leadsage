# Motores de IA gratuitos (para o robô responder rápido)

O robô e a abordagem usam o **Gemini** por padrão. No plano gratuito ele oscila: às vezes responde em
3 segundos, às vezes recusa (limite por minuto, 503) ou leva 20 a 80 segundos. Para resposta de vendedor
no WhatsApp isso é lento demais.

O LeadSage agora **corre vários motores ao mesmo tempo e usa o primeiro que responder**. Cada motor extra
liga sozinho quando a chave dele existe na Vercel; sem chave, ele é ignorado. Os extras ficam na frente do
Gemini porque respondem em cerca de 1 segundo (chips próprios para IA).

| Motor | Para quê | Onde criar a chave | Variável na Vercel |
|---|---|---|---|
| **Groq** (recomendado) | Mais rápido; sem cartão; modelos abertos (gpt-oss, Llama, Qwen) | console.groq.com/keys | `GROQ_API_KEY` |
| **Cerebras** | Também muito rápido; a franquia gratuita hoje pede conferir condições no painel | cloud.cerebras.ai | `CEREBRAS_API_KEY` |
| **OpenRouter** | Reserva: modelos ":free", limite baixo (cerca de 20 por minuto) | openrouter.ai/keys | `OPENROUTER_API_KEY` |
| Gemini | Já configurado | aistudio.google.com | `GEMINI_API_KEY` |

## Como ligar (2 minutos)
1. Crie a conta e a chave no site do motor (Groq é o melhor primeiro passo).
2. Vercel → projeto → *Settings → Environment Variables* → adicione a variável (ambiente *Production*).
3. Faça um novo deploy (*Redeploy*).
4. Confira em `https://leadsageofc.vercel.app/api/health`: o campo `"ia"` lista os motores ligados,
   por exemplo `["groq", "gemini"]`.

O modelo é escolhido sozinho a partir do que a sua conta enxerga, preferindo `gpt-oss-120b` e
`llama-3.3-70b`. Para forçar outro, use `GROQ_MODEL`, `CEREBRAS_MODEL` ou `OPENROUTER_MODEL`.

## Cuidados
- Planos gratuitos têm limites e, em alguns, o provedor pode usar os textos para melhorar modelos.
  Leia a política do plano antes de colocar dados sensíveis de clientes.
- Os limites e os modelos mudam. Se um motor falhar, o LeadSage passa para o próximo sozinho.
