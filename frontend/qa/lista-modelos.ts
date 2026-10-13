import { SITE_TEMPLATES } from '../src/templates/sites/layouts';
for (const t of SITE_TEMPLATES) console.log(`${t.id} | ${t.nome} | ${t.descricao} | ${t.nichos.join(', ')}`);
