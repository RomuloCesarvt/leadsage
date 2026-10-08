// Testa a leitura da conversa com um HTML de mentira (sem navegador).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { lerMensagens, telefoneDoTitulo } = createRequire(import.meta.url)('./conversa.js');

// DOM mínimo, só o que o leitor usa
function no(classe, texto = '', filhos = []) {
  return {
    className: classe,
    textContent: texto,
    querySelector: () => null,
    querySelectorAll: (s) => (s.includes('selectable-text') ? filhos : []),
    getAttribute: () => null,
  };
}

const doc = {
  querySelectorAll: () => [
    no('message-in x', '', [no('', 'Oi, vi sua mensagem')]),
    no('message-out x', '', [no('', 'Boa tarde! Montei uma prévia.')]),
    no('message-in x', '', [no('', 'Quanto custa?'), no('', 'Me manda o valor')]),
    no('outra-coisa', '', [no('', 'ignorar')]),
  ],
  querySelector: () => ({ getAttribute: () => '+55 14 99800-3784', textContent: '' }),
};

test('le quem falou e junta as linhas da mesma mensagem', () => {
  const m = lerMensagens(doc, 20);
  assert.deepEqual(m.map((x) => x.de), ['contato', 'voce', 'contato']);
  assert.equal(m[2].texto, 'Quanto custa?\nMe manda o valor');
});

test('respeita o limite e pega as mais recentes', () => {
  assert.equal(lerMensagens(doc, 2).length, 2);
  assert.equal(lerMensagens(doc, 2)[1].texto, 'Quanto custa?\nMe manda o valor');
});

test('telefone so quando o titulo e um numero', () => {
  assert.equal(telefoneDoTitulo(doc), '5514998003784');
  const nome = { querySelector: () => ({ getAttribute: () => 'Padaria da Ana', textContent: '' }) };
  assert.equal(telefoneDoTitulo(nome), '');
});
