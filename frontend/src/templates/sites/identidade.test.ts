import { montarPrevia, notaComMerito } from './previa';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${nome}`); if (!cond) falhas++; };

const base = { id: 'x1', company: 'Clínica Sorriso Pleno', niche: 'Dentistas', city: 'Salvador', phone: '5571988887777', whatsapp: true };

console.log('--- nota só com mérito ---');
ok('5,0 com 3 avaliações não é mérito', notaComMerito(5, 3) === null);
ok('4,2 com 200 avaliações não é mérito', notaComMerito(4.2, 200) === null);
ok('4,8 com 120 avaliações é mérito', notaComMerito(4.8, 120) !== null);
const fraca = montarPrevia({ ...base, rating: 5, rating_count: 3 }, []);
ok('site de nota fraca não cita avaliações do Google', !/avalia(ç|c)(õ|o)es (no|de)|no Google/i.test(fraca.html) && !JSON.parse(fraca.builder_data).nota);
const forte = montarPrevia({ ...base, rating: 4.9, rating_count: 210 }, []);
ok('site de nota forte mostra a nota', JSON.parse(forte.builder_data).nota === 4.9);

console.log('--- identidade do lead ---');
const comIdent = montarPrevia({ ...base, identidade: { logo: 'https://exemplo.com.br/logo.png', cor: '#0a7d5a', imagens: ['https://exemplo.com.br/fachada.jpg'], instagram: 'https://www.instagram.com/sorrisopleno/' } }, ['https://images.pexels.com/a.jpg']);
const d = JSON.parse(comIdent.builder_data);
ok('usa a logo do próprio negócio', d.logo === 'https://exemplo.com.br/logo.png');
ok('usa a cor da marca', d.corPrimaria === '#0a7d5a');
ok('a foto do próprio negócio vem antes do banco de imagens', d.capa === 'https://exemplo.com.br/fachada.jpg');
ok('traz o Instagram achado', d.instagram.includes('sorrisopleno'));
ok('logo fora de https é recusada', JSON.parse(montarPrevia({ ...base, identidade: { logo: 'javascript:alert(1)' } }, []).builder_data).logo === undefined);

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
