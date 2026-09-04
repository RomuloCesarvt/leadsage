/**
 * Modelos de proposta e contrato.
 *
 * Antes viviam dentro das telas, so como texto para copiar. Agora ficam
 * num modulo unico e alimentam o editor: os trechos entre colchetes,
 * como [NOME DO CLIENTE], viram campos de formulario.
 */

export type Template = {
  id: string;
  title: string;
  desc: string;
  content: string;
};

export const PROPOSALS: Omit<Template, 'id'>[] = [
  {
    title: 'Enxuta',
    desc: 'Uma página, direto ao ponto. Ideal para freelancers e consultores.',
    content: `PROPOSTA COMERCIAL

Para: [NOME DO CLIENTE]
De: [SEU NOME / EMPRESA]
Data: [DATA]

---

OBJETIVO
Apresentar nossa solução para [PROBLEMA] que irá [BENEFÍCIO PRINCIPAL].

ESCOPO DO PROJETO
• [Entregável 1]
• [Entregável 2]
• [Entregável 3]

INVESTIMENTO
Valor total: R$ [VALOR]
Forma de pagamento: [CONDIÇÕES]

PRAZO
Início: [DATA]
Entrega: [DATA]

PRÓXIMOS PASSOS
1. Aprovação desta proposta
2. Assinatura do contrato
3. Início do projeto

---
[SEU NOME]
[TELEFONE] | [EMAIL]`
  },
  {
    title: 'Premium',
    desc: 'Estrutura completa com ROI e casos de sucesso.',
    content: `PROPOSTA COMERCIAL PREMIUM

━━━━━━━━━━━━━━━━━━━━━━━━━━
Cliente: [NOME DO CLIENTE]
Consultor: [SEU NOME]
Data: [DATA]
Validade: 15 dias
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DIAGNÓSTICO
Após análise do seu negócio, identificamos que:
• [Problema 1 identificado]
• [Problema 2 identificado]
• [Oportunidade detectada]

2. SOLUÇÃO PROPOSTA
Nossa abordagem para resolver esses desafios:

Fase 1 - [Nome da Fase] (Semana 1-2)
• [Atividade 1]
• [Atividade 2]

Fase 2 - [Nome da Fase] (Semana 3-4)
• [Atividade 3]
• [Atividade 4]

3. RESULTADOS ESPERADOS
• [Métrica 1]: Aumento de X%
• [Métrica 2]: Redução de Y%
• ROI estimado: [VALOR]

4. INVESTIMENTO
┌─────────────────────────┬──────────┐
│ Item                    │ Valor    │
├─────────────────────────┼──────────┤
│ [Serviço 1]             │ R$ X.XXX │
│ [Serviço 2]             │ R$ X.XXX │
│ [Serviço 3]             │ R$ X.XXX │
├─────────────────────────┼──────────┤
│ TOTAL                   │ R$ X.XXX │
└─────────────────────────┴──────────┘

Condições: 50% na aprovação + 50% na entrega
Desconto para pagamento à vista: 10%

5. GARANTIAS
• Suporte por 30 dias após entrega
• Até 2 rodadas de revisão inclusas
• Satisfação garantida

━━━━━━━━━━━━━━━━━━━━━━━━━━
[SEU NOME] | [TELEFONE] | [EMAIL]`
  },
  {
    title: 'Corporativo',
    desc: 'Formato empresarial com SLA e termos técnicos.',
    content: `PROPOSTA TÉCNICA E COMERCIAL

Ref: PROP-[ANO]-[NÚMERO]
Data: [DATA]
Validade: 30 dias corridos

CONTRATANTE: [RAZÃO SOCIAL]
CNPJ: [CNPJ]
CONTRATADA: [SUA EMPRESA]

1. OBJETO
Prestação de serviços de [DESCRIÇÃO GERAL] conforme especificações técnicas abaixo.

2. ESPECIFICAÇÕES TÉCNICAS
2.1. [Módulo/Serviço 1]
   - Descrição: [Detalhes]
   - Prazo: [X dias úteis]
   
2.2. [Módulo/Serviço 2]
   - Descrição: [Detalhes]
   - Prazo: [X dias úteis]

3. CRONOGRAMA
| Etapa | Descrição | Prazo |
|-------|-----------|-------|
| 1     | Kickoff   | D+0   |
| 2     | Entrega 1 | D+15  |
| 3     | Entrega 2 | D+30  |
| 4     | Homologação | D+35 |

4. INVESTIMENTO
Valor total: R$ [VALOR] ([VALOR POR EXTENSO])

5. CONDIÇÕES DE PAGAMENTO
• 40% na assinatura do contrato
• 30% na entrega parcial
• 30% na homologação final

6. SLA (ACORDO DE NÍVEL DE SERVIÇO)
• Tempo de resposta: até 4 horas úteis
• Uptime garantido: 99.5%
• Suporte técnico: Seg-Sex, 9h-18h

7. CONFIDENCIALIDADE
As partes se comprometem a manter sigilo sobre informações trocadas.

___________________________
[SEU NOME]
[CARGO] - [SUA EMPRESA]`
  },
  {
    title: 'Criativo',
    desc: 'Visual moderno para agências e criativos.',
    content: `✦ PROPOSTA CRIATIVA ✦

Hey [NOME]! 👋

Ficamos empolgados com o seu projeto e preparamos algo especial.

━━ O QUE VAMOS FAZER ━━

🎯 [Entregável 1]
   Vamos criar [descrição] que vai [benefício]

🎨 [Entregável 2]
   Design [descrição] para [objetivo]

🚀 [Entregável 3]
   [Descrição] com foco em [resultado]

━━ TIMELINE ━━

📅 Semana 1: Discovery + Briefing
📅 Semana 2: Conceituação + 1ª versão
📅 Semana 3: Refinamento + Aprovação
📅 Semana 4: Entrega final + Implementação

━━ INVESTIMENTO ━━

💰 R$ [VALOR]
   → Pix/Transferência: 10% OFF
   → Parcelamento: até 3x sem juros

━━ O QUE ESTÁ INCLUSO ━━

✅ Até 3 revisões
✅ Arquivos editáveis
✅ Suporte por 15 dias
✅ Reunião de alinhamento semanal

━━ BORA? ━━

Se curtiu, é só responder este documento!
Estamos prontos para começar assim que der o GO. 🔥

[SEU NOME]
📱 [WHATSAPP]
📧 [EMAIL]`
  }
];

export const CONTRACTS: Omit<Template, 'id'>[] = [
  {
    title: 'Prestação de Serviço Simples',
    desc: 'Modelo padrão com cláusulas de SLA, rescisão e escopo técnico fechado.',
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: [NOME/RAZÃO SOCIAL], inscrito(a) no CPF/CNPJ sob nº [NÚMERO], com sede em [ENDEREÇO].

CONTRATADA: [SUA EMPRESA], inscrita no CNPJ sob nº [CNPJ], com sede em [ENDEREÇO].

CLÁUSULA 1ª - OBJETO
A CONTRATADA se compromete a prestar serviços de [DESCRIÇÃO DOS SERVIÇOS], conforme especificações acordadas entre as partes.

CLÁUSULA 2ª - PRAZO
O presente contrato terá vigência de [X] meses, a contar da data de assinatura, podendo ser renovado por igual período mediante acordo entre as partes.

CLÁUSULA 3ª - VALOR E FORMA DE PAGAMENTO
3.1. O valor total dos serviços é de R$ [VALOR] ([VALOR POR EXTENSO]).
3.2. O pagamento será efetuado da seguinte forma: [CONDIÇÕES].
3.3. Em caso de atraso, incidirão juros de 1% ao mês e multa de 2%.

CLÁUSULA 4ª - OBRIGAÇÕES DA CONTRATADA
4.1. Executar os serviços com qualidade e dentro dos prazos acordados.
4.2. Manter sigilo sobre informações confidenciais do CONTRATANTE.
4.3. Comunicar quaisquer impedimentos ou atrasos com antecedência.

CLÁUSULA 5ª - OBRIGAÇÕES DO CONTRATANTE
5.1. Fornecer as informações e materiais necessários para execução dos serviços.
5.2. Efetuar os pagamentos nos prazos acordados.
5.3. Designar um responsável para aprovações e feedback.

CLÁUSULA 6ª - RESCISÃO
6.1. O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.
6.2. Em caso de rescisão antecipada, os serviços já executados serão cobrados proporcionalmente.

CLÁUSULA 7ª - FORO
As partes elegem o foro da Comarca de [CIDADE/UF] para dirimir quaisquer questões.

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  },
  {
    title: 'Criação de Site Institucional',
    desc: 'Contrato específico para projetos de desenvolvimento web.',
    content: `CONTRATO DE CRIAÇÃO DE SITE INSTITUCIONAL

CONTRATANTE: [NOME/RAZÃO SOCIAL]
CPF/CNPJ: [NÚMERO]
CONTRATADA: [SUA EMPRESA]
CNPJ: [CNPJ]

1. OBJETO
Desenvolvimento de site institucional contendo:
• Página inicial (Home)
• Página Sobre
• Página de Serviços/Produtos
• Página de Contato com formulário
• [PÁGINAS ADICIONAIS]

2. ESPECIFICAÇÕES TÉCNICAS
• Design responsivo (desktop, tablet e mobile)
• Otimização SEO básica
• Integração com Google Analytics
• SSL (certificado de segurança)
• Hospedagem: [DETALHES]
• Domínio: [DETALHES]

3. ETAPAS E CRONOGRAMA
Etapa 1 - Briefing e Wireframe: [X] dias úteis
Etapa 2 - Layout e Design: [X] dias úteis
Etapa 3 - Desenvolvimento: [X] dias úteis
Etapa 4 - Revisões (até 3): [X] dias úteis
Etapa 5 - Publicação: [X] dias úteis
Prazo total estimado: [X] dias úteis

4. INVESTIMENTO
Valor: R$ [VALOR]
Pagamento: [CONDIÇÕES]

5. REVISÕES
5.1. Estão incluídas até 3 (três) rodadas de revisões.
5.2. Revisões adicionais serão cobradas à parte (R$ [VALOR]/hora).

6. PROPRIEDADE INTELECTUAL
6.1. Após quitação total, o CONTRATANTE terá propriedade sobre o conteúdo e design do site.
6.2. A CONTRATADA poderá utilizar o projeto em portfólio.

7. SUPORTE PÓS-ENTREGA
Suporte técnico gratuito por 30 dias após publicação.
Manutenção mensal disponível por R$ [VALOR]/mês.

8. RESCISÃO E CANCELAMENTO
Em caso de cancelamento pelo CONTRATANTE, os valores pagos não serão devolvidos, correspondendo ao trabalho já executado.

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  },
  {
    title: 'Desenvolvimento de E-commerce',
    desc: 'Contrato para lojas virtuais com integrações de pagamento.',
    content: `CONTRATO DE DESENVOLVIMENTO DE E-COMMERCE

CONTRATANTE: [RAZÃO SOCIAL] - CNPJ: [NÚMERO]
CONTRATADA: [SUA EMPRESA] - CNPJ: [NÚMERO]

1. OBJETO
Desenvolvimento de loja virtual (e-commerce) com as seguintes funcionalidades:
• Catálogo de produtos (até [X] produtos iniciais)
• Carrinho de compras
• Checkout com integração de pagamento
• Painel administrativo
• Gestão de estoque básica
• Sistema de cupons de desconto

2. INTEGRAÇÕES
• Gateway de pagamento: [Mercado Pago / PagSeguro / Stripe]
• Frete: [Correios / Melhor Envio]
• ERP/NFe: [Se aplicável]

3. INVESTIMENTO
Valor de desenvolvimento: R$ [VALOR]
Manutenção mensal (opcional): R$ [VALOR]/mês

4. PRAZO DE ENTREGA
[X] dias úteis a partir da aprovação do briefing.

5. GARANTIAS
• 90 dias de garantia contra bugs
• Suporte técnico por [X] meses
• Backup diário automático

6. LIMITAÇÕES
• Não inclui produção de conteúdo/fotos
• Não inclui gestão de campanhas
• Alterações estruturais após entrega são cobradas à parte

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  },
  {
    title: 'Gestão de Tráfego Pago',
    desc: 'Contrato mensal para gestão de anúncios (Google/Meta Ads).',
    content: `CONTRATO DE GESTÃO DE TRÁFEGO PAGO

CONTRATANTE: [NOME/RAZÃO SOCIAL]
CONTRATADA: [SUA EMPRESA]

1. OBJETO
Gestão profissional de campanhas de mídia paga nas plataformas:
☐ Google Ads (Pesquisa, Display, YouTube)
☐ Meta Ads (Facebook e Instagram)
☐ TikTok Ads
☐ LinkedIn Ads

2. ESCOPO DOS SERVIÇOS
• Planejamento estratégico de campanhas
• Criação e otimização de anúncios
• Segmentação de público-alvo
• Testes A/B
• Relatórios mensais de performance
• Reunião mensal de alinhamento

3. INVESTIMENTO
Fee de gestão mensal: R$ [VALOR]
Investimento mínimo em mídia (pago pelo CONTRATANTE): R$ [VALOR]/mês

Obs: O fee de gestão NÃO inclui o valor investido em anúncios.

4. VIGÊNCIA
Contrato de [X] meses com renovação automática.
Cancelamento com 30 dias de aviso prévio.

5. RESULTADOS
5.1. A CONTRATADA se compromete a otimizar as campanhas para melhores resultados.
5.2. Não há garantia de resultados específicos, pois dependem de múltiplos fatores.
5.3. KPIs acompanhados: CPC, CTR, ROAS, CPL, Conversões.

6. RESPONSABILIDADES DO CONTRATANTE
• Aprovar criativos e copies
• Fornecer acesso às contas de anúncio
• Pagar o investimento em mídia diretamente às plataformas

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  },
  {
    title: 'Social Media Mensal',
    desc: 'Contrato para gestão de redes sociais com entregas definidas.',
    content: `CONTRATO DE GESTÃO DE REDES SOCIAIS

CONTRATANTE: [NOME/RAZÃO SOCIAL]
CONTRATADA: [SUA EMPRESA]

1. OBJETO
Gestão profissional das redes sociais do CONTRATANTE:
☐ Instagram
☐ Facebook
☐ LinkedIn
☐ TikTok

2. ENTREGAS MENSAIS
• [X] posts para feed (design + copy)
• [X] stories
• [X] reels/vídeos curtos
• Calendário editorial mensal
• Monitoramento de comentários e DMs (horário comercial)
• Relatório mensal de performance

3. INVESTIMENTO
Valor mensal: R$ [VALOR]
Vigência mínima: [X] meses

4. PROCESSO DE TRABALHO
Semana 1: Planejamento e calendário editorial
Semana 2-3: Produção de conteúdo e aprovações
Semana 4: Publicações e relatórios

5. APROVAÇÕES
• Todo conteúdo será enviado para aprovação com [X] dias de antecedência.
• O CONTRATANTE terá [X] dias úteis para aprovar ou solicitar ajustes.
• Até 2 revisões por peça estão incluídas.

6. NÃO INCLUSO
• Produção fotográfica profissional
• Investimento em mídia paga
• Criação de vídeos com mais de 60 segundos

[CIDADE], [DATA].

________________________          ________________________
CONTRATANTE                       CONTRATADA`
  }
];

/** Gera um id estavel a partir do titulo. */
export const slug = (titulo: string) =>
  titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const PROPOSAL_TEMPLATES: Template[] = PROPOSALS.map(t => ({ ...t, id: slug(t.title) }));
export const CONTRACT_TEMPLATES: Template[] = CONTRACTS.map(t => ({ ...t, id: slug(t.title) }));

/**
 * Campo do modelo: colchetes com até 60 caracteres, sem quebra de linha.
 * O `g` obriga a recriar o regex a cada uso — um literal compartilhado
 * guardaria `lastIndex` entre chamadas e passaria a pular ocorrências.
 */
const criarCampoRe = () => /\[([^\]\r\n]{1,60})\]/g;

/**
 * Encontra os campos [ENTRE COLCHETES] do modelo, na ordem em que
 * aparecem e sem repetir.
 */
export const extrairCampos = (conteudo: string): string[] => {
  const achados = conteudo.match(criarCampoRe()) || [];
  const vistos = new Set<string>();
  const campos: string[] = [];
  for (const bruto of achados) {
    const campo = bruto.slice(1, -1).trim();
    if (campo && !vistos.has(campo)) {
      vistos.add(campo);
      campos.push(campo);
    }
  }
  return campos;
};

/** Troca cada [CAMPO] pelo valor preenchido; o que ficou vazio permanece. */
export const aplicarCampos = (conteudo: string, valores: Record<string, string>): string =>
  conteudo.replace(criarCampoRe(), (original, campo) => {
    const valor = valores[String(campo).trim()];
    return valor && valor.trim() ? valor : original;
  });
