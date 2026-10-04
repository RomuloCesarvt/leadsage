/**
 * Gera proposta e contrato de amostra em cada tema premium, para conferir
 * o resultado na tela e no PDF.
 *
 *   npx tsx scripts/amostras-docs.ts <pasta> [url-da-foto-de-capa]
 */
import { writeFileSync } from 'node:fs';
import { TEMAS_PREMIUM } from '../src/templates/docs/premium';
import type { MarcaDocumento } from '../src/templates/docs/base';

const [dir, foto] = [process.argv[2], process.argv[3] || ''];

const proposta = `PROPOSTA COMERCIAL

Para: Padaria Antiga Jacarandá
De: LeadSage Studio
Data: 04/10/2026

---

1. DIAGNÓSTICO
A Padaria Antiga Jacarandá tem 4,7 estrelas e 312 avaliações no Google, mas o perfil não leva a um site.
Quem procura "encomenda de bolo Botucatu" encontra o concorrente.

2. O QUE VAMOS ENTREGAR
• Site de uma página com cardápio e fotos
• Formulário de encomenda direto no WhatsApp
• Perfil do Google completo e vinculado ao site
• Duas rodadas de ajuste após a entrega

3. INVESTIMENTO
Valor total: R$ 2.500,00
Forma de pagamento: 50% na assinatura, 50% na entrega
Validade da proposta: 15 dias

| Item | Prazo | Valor |
| Site institucional | 15 dias | R$ 1.800,00 |
| Google Meu Negócio | 3 dias | R$ 400,00 |
| Ajustes pós-entrega | 30 dias | R$ 300,00 |
| Total | | R$ 2.500,00 |

4. PRÓXIMOS PASSOS
1. Aprovação desta proposta
2. Envio das fotos e do cardápio
3. Início da produção

_____________________________          _____________________________
LeadSage Studio                        Padaria Antiga Jacarandá`;

const contrato = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: Padaria Antiga Jacarandá Ltda., CNPJ 12.345.678/0001-90, com sede em Botucatu/SP.
CONTRATADA: LeadSage Studio, CNPJ 98.765.432/0001-10.

CLÁUSULA 1ª - DO OBJETO
A CONTRATADA prestará à CONTRATANTE os serviços de criação de site institucional e configuração do perfil no Google, conforme a proposta aprovada.

CLÁUSULA 2ª - DO PRAZO
Os serviços serão entregues em até 30 (trinta) dias corridos a partir do envio, pela CONTRATANTE, dos materiais necessários.

CLÁUSULA 3ª - DO PREÇO E DA FORMA DE PAGAMENTO
Pelos serviços, a CONTRATANTE pagará R$ 2.500,00 (dois mil e quinhentos reais), sendo 50% na assinatura e 50% na entrega.

CLÁUSULA 4ª - DAS OBRIGAÇÕES DA CONTRATANTE
A CONTRATANTE fornecerá textos, fotos e acessos necessários em até 5 (cinco) dias úteis da assinatura.

CLÁUSULA 5ª - DA RESCISÃO
O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 15 (quinze) dias, sem multa.

CLÁUSULA 6ª - DO FORO
Fica eleito o foro da comarca de Botucatu/SP para dirimir quaisquer dúvidas oriundas deste contrato.

Botucatu, 4 de outubro de 2026.

_____________________________          _____________________________
CONTRATANTE                            CONTRATADA`;

const marca: MarcaDocumento = {
  empresa: 'LeadSage Studio', corPrimaria: '#1e3a8a', corDestaque: '#f59e0b',
  contato: 'contato@leadsage.studio\n(14) 99800-3784', fotoCapa: foto,
};

for (const t of TEMAS_PREMIUM) {
  writeFileSync(`${dir}/doc-${t.id}-proposta.html`, t.render(proposta, { ...marca, tipo: 'proposta' }, 'Proposta de presença digital'), 'utf-8');
  writeFileSync(`${dir}/doc-${t.id}-contrato.html`, t.render(contrato, { ...marca, tipo: 'contrato' }, 'Contrato de prestação de serviços'), 'utf-8');
}
console.log('documentos gerados em', dir);
