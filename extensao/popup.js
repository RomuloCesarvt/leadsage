const $ = (id) => document.getElementById(id);

chrome.storage.local.get(['ativa', 'chave']).then(({ ativa, chave }) => {
  $('ativa').checked = !!ativa;
  $('chave').value = chave || '';
});

$('salvar').onclick = async () => {
  await chrome.storage.local.set({ ativa: $('ativa').checked, chave: $('chave').value.trim() });
  $('ok').style.display = 'block';
};
