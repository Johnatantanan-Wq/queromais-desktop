const { test } = require('node:test')
const assert = require('node:assert')
const L = require('../renderer/elo/tela-lista')

const def = {
  titulo: 'Gestão de pedido',
  subtitulo: 'pedidos do turno',
  kpis: [{ rotulo: 'Em produção', valor: '12', sub: 'agora' }, { rotulo: 'Prontos', valor: '4', sub: 'aguardando' }],
  filtros: [{ chave: 'todos', rotulo: 'Todos' }, { chave: 'producao', rotulo: 'Em produção' }],
  busca: 'Buscar pedido, cliente ou telefone',
  colunas: ['Pedido', 'Cliente', 'Status', 'Valor'],
  grade: '90px 1fr 150px 120px',
  acoes: [{ chave: 'novo', rotulo: '+ Novo pedido', primaria: true }],
}
const linhas = [
  { chave: '1042', celulas: ['#1042', 'Maria S.', { texto: 'Em produção', etiqueta: 'amarelo' }, 'R$ 89,90'] },
  { chave: '1041', celulas: ['#1041', 'João P.', { texto: 'Pronto', etiqueta: 'verde' }, 'R$ 54,00'] },
]

test('desenha título, KPIs, filtros, busca e colunas', () => {
  const h = L.htmlLista(def, linhas, { filtro: 'todos', online: true, ts: Date.now() })
  assert.ok(h.includes('Gestão de pedido') && h.includes('Em produção'))
  assert.ok(h.includes('data-filtro="producao"'))
  assert.ok(h.includes('Buscar pedido'))
  assert.ok(h.includes('Cliente') && h.includes('Valor'))
})

test('o filtro ativo vem marcado', () => {
  const h = L.htmlLista(def, linhas, { filtro: 'producao', online: true, ts: Date.now() })
  assert.ok(/is-on/.test(h.split('data-filtro="producao"')[1].slice(0, 80)))
  assert.ok(!/is-on/.test(h.split('data-filtro="todos"')[1].slice(0, 80)))
})

test('etiqueta colorida vira pílula, texto puro fica texto', () => {
  const h = L.htmlLista(def, linhas, { filtro: 'todos', online: true, ts: Date.now() })
  assert.ok(h.includes('border-radius:999px'), 'a etiqueta é pílula')
  assert.ok(h.includes('Maria S.'))
})

test('cada linha carrega a chave, para o clique saber o que abrir', () => {
  const h = L.htmlLista(def, linhas, { filtro: 'todos', online: true, ts: Date.now() })
  assert.ok(h.includes('data-linha="1042"') && h.includes('data-linha="1041"'))
})

test('lista vazia mostra recado, não tabela em branco', () => {
  const h = L.htmlLista(def, [], { filtro: 'todos', online: true, ts: Date.now() })
  assert.ok(/nenhum|nada/i.test(h))
})

test('sem dado nenhum (nem lista) avisa que ainda não carregou', () => {
  const h = L.htmlLista(def, null, { filtro: 'todos', online: false, ts: 0 })
  assert.ok(/sem dados/i.test(h))
})

test('offline mostra a idade do dado', () => {
  const h = L.htmlLista(def, linhas, { filtro: 'todos', online: false, ts: Date.now() - 3600 * 1000 })
  assert.ok(/sem internet/i.test(h) && /há 1 h/.test(h))
})

test('botão de ação aparece com a marcação de primário', () => {
  const h = L.htmlLista(def, linhas, { filtro: 'todos', online: true, ts: Date.now() })
  assert.ok(h.includes('data-acao="novo"'))
  assert.ok(h.includes('+ Novo pedido'))
})

test('escapa conteúdo vindo de dado', () => {
  const h = L.htmlLista(def, [{ chave: 'x', celulas: ['<script>', 'a', 'b', 'c'] }], { filtro: 'todos', online: true, ts: Date.now() })
  assert.ok(h.includes('&lt;script&gt;'))
})

test('apenasGrade não embrulha em cartão (senão vira cartão dentro de cartão)', () => {
  const h = L.apenasGrade({ colunas: ['A', 'B'], grade: '1fr 1fr' }, [{ chave: '1', celulas: ['x', 'y'] }])
  assert.ok(!h.includes('class="ecard"'), 'não pode trazer cartão próprio')
  assert.ok(h.includes('x') && h.includes('A'))
  assert.ok(h.includes('1 registro'))
})
