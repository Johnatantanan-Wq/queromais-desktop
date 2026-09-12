// config-local.js — Configurações em demonstração: o que foi salvo pelo app aparece na
// tela por cima do dado fictício, como no app conectado depois de recarregar. Mesma
// ideia de contas-local.js e estoque-local.js: registro em memória, ninguém finge que
// persiste. As abas de leitura são redesenhadas com os MESMOS formatadores do adaptador,
// para a demonstração mostrar exatamente o que o app conectado mostraria.
const A = require('./adaptadores')

function criarRegistro() {
  const st = {
    loja: {}, horarios: null, timezone: null, bairros: null, comanda: null,
    formasNovas: [], formasEditadas: {}, contasNovas: [], contasEditadas: {}, contasExcluidas: new Set(),
    mesasNovas: [], mesasEditadas: {}, mesasExcluidas: new Set(), colaboradores: [],
  }
  let seq = 0
  const idLocal = (p) => p + '-app-' + (++seq)

  // O alvo (forma, conta, mesa) vem nos args do canal; sem eles, o id está no caminho
  // da decisão ('/api/admin/mesas/m1' → 'm1') — é o mesmo que o painel receberia.
  const idDoCaminho = (d) => ('' + (d.caminho || '')).split('/').pop()
  const alvo = (args, chave, d) => (args && args[chave] && args[chave].id) ? args[chave].id : idDoCaminho(d)

  function aplicarDecisao(canal, d, args) {
    const c = d.corpo || {}
    if (canal === 'config-loja') { Object.assign(st.loja, c); return null }
    if (canal === 'config-horarios') { st.horarios = c.horarios; if (c.timezone) st.timezone = c.timezone; return null }
    if (canal === 'config-bairros') { st.bairros = c; return null }
    if (canal === 'config-comanda') { st.comanda = c; return null }
    if (canal === 'config-forma-nova') { const id = idLocal('forma'); st.formasNovas.push({ id, habilitado: true, ...c }); return { id } }
    if (canal === 'config-forma-editar') { const id = alvo(args, 'forma', d); st.formasEditadas[id] = { ...(st.formasEditadas[id] || {}), ...c }; return null }
    if (canal === 'config-conta-financeira') {
      if (d.metodo === 'PATCH') { const id = alvo(args, 'conta', d); st.contasEditadas[id] = { ...(st.contasEditadas[id] || {}), ...c }; return null }
      const id = idLocal('conta'); st.contasNovas.push({ id, ativo: true, ...c }); return { id }
    }
    if (canal === 'config-conta-financeira-excluir') { st.contasExcluidas.add(alvo(args, 'conta', d)); return null }
    if (canal === 'config-mesas-criar') {
      for (let i = 0; i < c.quantidade; i++) st.mesasNovas.push({ id: idLocal('mesa'), numero: String(c.numeroInicio + i), capacidade: c.capacidade, tipo: c.tipo, reservada: false })
      return null
    }
    if (canal === 'config-mesa-editar') { const id = alvo(args, 'mesa', d); st.mesasEditadas[id] = { ...(st.mesasEditadas[id] || {}), ...c }; return null }
    if (canal === 'config-mesa-excluir') { st.mesasExcluidas.add(alvo(args, 'mesa', d)); return null }
    if (canal === 'config-colaborador-novo') {
      const id = idLocal('colab')
      st.colaboradores.push({ id, nome: c.nome, papel: c.papeis[0], funcao: rotuloPapel(c.papeis[0]), email: '', cpf: c.cpf, tipo: 'colaborador', ativo: true })
      return { id }
    }
    return null
  }

  const mudou = () => Object.keys(st.loja).length || st.horarios || st.bairros || st.comanda || st.formasNovas.length
    || Object.keys(st.formasEditadas).length || st.contasNovas.length || Object.keys(st.contasEditadas).length || st.contasExcluidas.size
    || st.mesasNovas.length || Object.keys(st.mesasEditadas).length || st.mesasExcluidas.size || st.colaboradores.length

  /** Aplica o registro por cima do dado da tela (bruto + abas de leitura). */
  function aplicar(dados) {
    if (!dados || !mudou()) return dados
    const b = JSON.parse(JSON.stringify(dados.bruto || {}))
    const abas = { ...(dados.abas || {}) }

    // Loja: o PATCH parcial vira campos do bruto e os rótulos da aba de leitura.
    const l = b.loja = { ...(b.loja || {}), endereco: { ...((b.loja || {}).endereco || {}) } }
    const p = st.loja
    if (p.nome) l.nome = p.nome
    if (p.telefone) l.telefone = p.telefone
    if (p.maps_url) l.mapsUrl = p.maps_url
    if (p.endereco) l.endereco = { ...p.endereco }
    if (p.modalidades_pedido) l.modalidades = p.modalidades_pedido.slice()
    l.tempos = { ...(l.tempos || {}) }
    if (p.tempo_estimado_balcao) l.tempos.balcao = p.tempo_estimado_balcao
    if (p.tempo_estimado_delivery) l.tempos.delivery = p.tempo_estimado_delivery
    if (p.tempo_estimado_local) l.tempos.local = p.tempo_estimado_local
    if (p.pix_chave) l.pixChave = p.pix_chave
    if (typeof p.numeracao_diaria === 'boolean') l.numeracaoDiaria = p.numeracao_diaria
    if (p.modo_horario) l.modoHorario = p.modo_horario
    if (Object.keys(p).length && Array.isArray(abas.config)) {
      const NOME_MOD = { entrega: 'Entrega', retirada: 'Retirada na loja', consumo_local: 'Consumir no local' }
      const valores = {
        'Nome fantasia / nome da loja': l.nome, 'Telefone / WhatsApp': l.telefone,
        'Rua / avenida': l.endereco.rua, 'Número': l.endereco.numero, 'CEP': l.endereco.cep, 'Bairro': l.endereco.bairro,
        'Cidade': l.endereco.cidade, 'UF': l.endereco.uf, 'Complemento': l.endereco.complemento, 'Link Google Maps': l.mapsUrl,
        'Chave Pix': l.pixChave, 'Tempo retirada (min)': l.tempos.balcao, 'Tempo delivery (min)': l.tempos.delivery,
        'Tempo consumo local (min)': l.tempos.local,
        'Modalidades': (l.modalidades || []).map((m) => NOME_MOD[m] || m).join(' · '),
        'Como numera': l.numeracaoDiaria ? 'Reinicia todo dia (#1, #2, #3…)' : 'Sequencial, sem reiniciar',
        'Regra': l.numeracaoDiaria ? 'Reinicia todo dia (#1, #2, #3…)' : 'Sequencial, sem reiniciar',
      }
      abas.config = abas.config.map((s) => ({ ...s, campos: s.campos.map((c) =>
        (valores[c.rotulo] != null && valores[c.rotulo] !== '') ? { ...c, valor: String(valores[c.rotulo]) } : c) }))
    }

    if (st.horarios) {
      b.horarios = st.horarios
      if (st.timezone) b.timezone = st.timezone
      abas.horarios = [{ titulo: 'Funcionamento', colunas: 2, campos: A.horariosDaLoja(st.horarios).concat([
        { rotulo: 'Situação agora', valor: l.aberta ? 'aberta' : 'fechada' }, { rotulo: 'Fuso da loja', valor: b.timezone || '' }]) }]
    }
    if (st.bairros) {
      const taxas = {}
      for (const n of Object.keys(st.bairros.taxas_bairro || {})) taxas[n] = { ...st.bairros.taxas_bairro[n] }
      b.bairros = { bairros: st.bairros.bairros.slice(), taxas, taxaPadrao: (b.bairros || {}).taxaPadrao || 0,
        entregaGratisAcima: st.bairros.entrega_gratis_valor_min != null ? st.bairros.entrega_gratis_valor_min : ((b.bairros || {}).entregaGratisAcima || null) }
      abas.rotas = A.rotasDeEntrega({ bairros: b.bairros.bairros, taxas_bairro: taxas, taxa_padrao: b.bairros.taxaPadrao, entrega_gratis_valor_min: b.bairros.entregaGratisAcima })
    }
    if (st.comanda) b.comanda = { ...st.comanda }

    b.formas = (b.formas || []).map((f) => (st.formasEditadas[f.id] ? { ...f, ...st.formasEditadas[f.id] } : f)).concat(st.formasNovas)
    b.contasFinanceiras = (b.contasFinanceiras || []).filter((c) => !st.contasExcluidas.has(c.id))
      .map((c) => (st.contasEditadas[c.id] ? { ...c, ...st.contasEditadas[c.id] } : c)).concat(st.contasNovas)
    if (st.formasNovas.length || Object.keys(st.formasEditadas).length || st.contasNovas.length || Object.keys(st.contasEditadas).length || st.contasExcluidas.size) {
      abas.pagamento = A.formasDePagamento(b.formas, b.contasFinanceiras)
    }
    b.mesas = (b.mesas || []).filter((m) => !st.mesasExcluidas.has(m.id))
      .map((m) => (st.mesasEditadas[m.id] ? { ...m, ...st.mesasEditadas[m.id] } : m)).concat(st.mesasNovas)
    if (st.mesasNovas.length || Object.keys(st.mesasEditadas).length || st.mesasExcluidas.size) {
      abas.mesas = A.mesasDoSalao({ mesas: b.mesas.map((m) => ({ ...m, lugares: m.capacidade })) })
    }
    if (st.colaboradores.length) {
      b.usuarios = (b.usuarios || []).concat(st.colaboradores)
      abas.usuario = (Array.isArray(abas.usuario) ? abas.usuario : []).concat(st.colaboradores)
    }
    return { ...dados, bruto: b, abas }
  }

  /** A aba Contas bancárias do Financeiro lista as mesmas contas: reflete o que foi salvo aqui. */
  function aplicarBancos(dados) {
    if (!dados || (!st.contasNovas.length && !Object.keys(st.contasEditadas).length && !st.contasExcluidas.size)) return dados
    const bancos = (dados.bancos || []).filter((c) => !st.contasExcluidas.has(c.id))
      .map((c) => {
        const e = st.contasEditadas[c.id]
        return e ? { ...c, nome: e.nome || c.nome, tipo: e.tipo || c.tipo,
          diaFechamento: e.dia_fechamento != null ? e.dia_fechamento : c.diaFechamento,
          diaVencimento: e.dia_vencimento != null ? e.dia_vencimento : c.diaVencimento } : c
      })
      .concat(st.contasNovas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, diaFechamento: c.dia_fechamento || null, diaVencimento: c.dia_vencimento || null })))
    return { ...dados, bancos }
  }

  return { aplicarDecisao, aplicar, aplicarBancos }
}

const ROTULO_PAPEL = { garcom: 'Garçom', atendente: 'Atendente', cozinheiro: 'Cozinheiro', motoboy: 'Entregador',
  caixa_operador: 'Caixa — operador', caixa_supervisor: 'Caixa — supervisor', caixa_gestor: 'Caixa — gestor' }
function rotuloPapel(p) { return ROTULO_PAPEL[p] || p }

module.exports = { criarRegistro }
