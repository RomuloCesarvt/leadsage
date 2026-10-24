import { alternarFiltro, aplicarFiltros, contarFiltro, temSite, temWhatsApp, type ChaveFiltro } from './filtrosDeLeads';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome}`); if (!cond) falhas++; };
const ids = (l: { id?: string }[]) => l.map(x => x.id).join(',');
const S = (...k: ChaveFiltro[]) => new Set<ChaveFiltro>(k);

console.log('\n--- tem site ou não ---');
ok('o status do Google manda: own tem site', temSite({ site_status: 'own', missingDigitalAssets: ['website'] } as any) === true);
ok('rede social, agregador, whatsapp e nenhum não são site', ['none', 'social', 'aggregator', 'whatsapp'].every(s => temSite({ site_status: s } as any) === false));
ok('sem status, a lista de lacunas decide', temSite({ missingDigitalAssets: ['website'] }) === false && temSite({ missingDigitalAssets: ['instagram'] }) === true);
ok('sem nada além do endereço: site de verdade conta', temSite({ website: 'https://padariaestrela.com.br' }) === true);
ok('endereço que é só Instagram/Linktree/WhatsApp não conta', temSite({ website: 'https://instagram.com/padaria' }) === false && temSite({ website: 'https://linktr.ee/x' }) === false && temSite({ website: 'https://wa.me/5514' }) === false);
ok('sem nenhuma informação: não se sabe', temSite({}) === null);

console.log('\n--- filtros combinados ---');
const leads = [
  { id: 'a', site_status: 'own', whatsapp: true },                         // tem site, tem whatsapp
  { id: 'b', site_status: 'own', whatsapp: false },                        // tem site, sem whatsapp
  { id: 'c', site_status: 'none', whatsapp: true },                        // sem site, tem whatsapp
  { id: 'd', site_status: 'none' },                                        // sem site, sem whatsapp
  { id: 'e' },                                                             // não se sabe do site, sem whatsapp
] as any[];
ok('Com site', ids(aplicarFiltros(leads, S('com-site'))) === 'a,b');
ok('Sem site', ids(aplicarFiltros(leads, S('sem-site'))) === 'c,d');
ok('quem não se sabe não aparece em Com site nem em Sem site (não é descartado por engano)', !ids(aplicarFiltros(leads, S('com-site'))).includes('e') && !ids(aplicarFiltros(leads, S('sem-site'))).includes('e'));
ok('Sem WhatsApp inclui quem não tem telefone', ids(aplicarFiltros(leads, S('sem-whatsapp'))) === 'b,d,e');
ok('Com WhatsApp', ids(aplicarFiltros(leads, S('com-whatsapp'))) === 'a,c');
ok('Com site + Sem WhatsApp: só quem é os dois', ids(aplicarFiltros(leads, S('com-site', 'sem-whatsapp'))) === 'b');
ok('Sem site + Sem WhatsApp (os mais fáceis de descartar)', ids(aplicarFiltros(leads, S('sem-site', 'sem-whatsapp'))) === 'd');
ok('nenhum filtro ligado: todos', ids(aplicarFiltros(leads, S())) === 'a,b,c,d,e');
ok('sem WhatsApp: telefone sem a marca de WhatsApp também conta', temWhatsApp({ whatsapp: undefined }) === false);

console.log('\n--- contagem nos botões ---');
ok('contagens', contarFiltro(leads, 'com-site') === 2 && contarFiltro(leads, 'sem-site') === 2 && contarFiltro(leads, 'sem-whatsapp') === 3 && contarFiltro(leads, 'com-whatsapp') === 2);
ok('instagram e oportunidade', contarFiltro([{ socials: { instagram: 'x' } }, {}, { opportunityScore: 80 }] as any[], 'sem-instagram') === 2 && contarFiltro([{ opportunityScore: 70 }, { opportunityScore: 69 }] as any[], 'alta-oportunidade') === 1);

console.log('\n--- ligar e desligar ---');
ok('ligar Com site desliga Sem site', JSON.stringify([...alternarFiltro(S('sem-site'), 'com-site')]) === '["com-site"]');
ok('ligar Sem WhatsApp desliga Com WhatsApp', JSON.stringify([...alternarFiltro(S('com-whatsapp'), 'sem-whatsapp')]) === '["sem-whatsapp"]');
ok('site e whatsapp se combinam', alternarFiltro(S('com-site'), 'sem-whatsapp').size === 2);
ok('clicar de novo desliga', alternarFiltro(S('com-site'), 'com-site').size === 0);
ok('não altera o conjunto original', (() => { const o = S('sem-site'); alternarFiltro(o, 'com-site'); return o.has('sem-site'); })());
ok('Sem Instagram não desliga nada', alternarFiltro(S('com-site', 'sem-whatsapp'), 'sem-instagram').size === 3);

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
