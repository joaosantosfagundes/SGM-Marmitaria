import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import ApiClient from '../../services/apiClient.js';
import { dataLocal } from '../../lib/dataLocal.js';
import useConsulta from '../pedidos/useConsulta.js';
import FormFinanceiro from './FormFinanceiro.jsx';
import { CATEGORIAS, converterValor, formatarValor, formatarDataHora, novoForm } from './financeiroUtils.js';

function tratarErro(error) {
    console.error(error);
    if (!error?.status) toast.error('Não foi possível comunicar com o servidor. Tente novamente.');
}

export default function FinanceiroPage() {
    const { usuario } = useAuth();
    const confirmar = useConfirm();
    const podeEditar = usuario?.perfil === 'ADMIN';
    const podeConsultar = podeEditar || usuario?.perfil === 'ATENDENTE';
    const [filtros, setFiltros] = useState(() => ({ dataInicio: `${dataLocal().slice(0, 7)}-01`, dataFim: dataLocal(), tipo: '', categoria: '' }));
    const [busca, setBusca] = useState(filtros);
    const [mostrarForm, setMostrarForm] = useState(false), [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(novoForm), [salvando, setSalvando] = useState(false);
    const acaoRef = useRef(false);
    let parametros = new URLSearchParams(Object.entries(busca).filter(([, valor]) => valor !== ''));
    const consulta = useConsulta(podeConsultar ? `financeiro?${parametros}` : null);

    function abrirNovo() { setForm(novoForm()); setEditandoId(null); setMostrarForm(true); }
    function fecharForm() { setMostrarForm(false); setEditandoId(null); setForm(novoForm()); }
    function abrirEdicao(item) {
        setEditandoId(item.id); setMostrarForm(true);
        setForm({ tipo: item.tipo, categoria: CATEGORIAS.includes(item.categoria) ? item.categoria : 'OUTRA',
            categoriaOutra: item.categoria, descricao: item.descricao || '', valor: String(item.valor).replace('.', ','),
            dataHora: item.dataHora.replace(' ', 'T'), recorrente: item.recorrente, quantidadeMeses: item.quantidadeMeses ?? '' });
    }
    async function salvar(event) {
        event.preventDefault();
        if (!podeEditar || acaoRef.current) return;
        let valor = converterValor(form.valor), categoria = (form.categoria === 'OUTRA' ? form.categoriaOutra : form.categoria).trim();
        let meses = form.recorrente ? Number(form.quantidadeMeses) : null;
        if (valor === null || valor <= 0) { toast.error('Informe um valor maior que zero, com até duas casas decimais.'); return; }
        if (!categoria || categoria.length > 100) { toast.error('Informe uma categoria com até 100 caracteres.'); return; }
        if (!form.dataHora) { toast.error('Informe a data e a hora do lançamento.'); return; }
        if (form.recorrente && (!Number.isInteger(meses) || meses < 2 || meses > 2147483647)) { toast.error('Informe uma quantidade de meses inteira, a partir de 2.'); return; }
        acaoRef.current = true; setSalvando(true);
        try {
            let dados = { tipo: form.tipo, categoria, descricao: form.descricao || null, valor, dataHora: form.dataHora, recorrente: form.recorrente, quantidadeMeses: meses };
            if (editandoId) await ApiClient.put(`financeiro/${editandoId}`, dados);
            else await ApiClient.post('financeiro', dados);
            toast.success(editandoId ? 'Lançamento atualizado!' : 'Lançamento registrado!'); fecharForm(); consulta.recarregar();
        } catch (error) { tratarErro(error); }
        finally { acaoRef.current = false; setSalvando(false); }
    }
    async function excluir(item) {
        if (!podeEditar || acaoRef.current) return;
        acaoRef.current = true; setSalvando(true);
        try {
            if (!(await confirmar({ titulo: 'Excluir lançamento financeiro', mensagem: `Excluir o lançamento de ${formatarValor(item.valor)} em "${item.categoria}"? Esta exclusão é definitiva e não pode ser desfeita.`, textoConfirmar: 'Excluir lançamento', tipo: 'perigo' }))) return;
            await ApiClient.delete(`financeiro/${item.id}`); toast.success('Lançamento excluído.');
            if (editandoId === item.id) fecharForm(); consulta.recarregar();
        } catch (error) { tratarErro(error); }
        finally { acaoRef.current = false; setSalvando(false); }
    }

    if (!podeConsultar) return <div className="alert alert-warning">O financeiro está disponível para administradores e atendentes.</div>;
    return <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <div className="page-header d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4">
            <div><h1 className="fs-3 mb-1">Financeiro</h1><p className="text-secondary mb-0">Entradas avulsas e despesas. Vendas e quitações são consultadas em Pagamento.</p></div>
            <div className="d-flex flex-wrap gap-2"><button type="button" className="btn btn-outline-primary" disabled={consulta.carregando || salvando} onClick={consulta.recarregar}>Atualizar</button>{podeEditar && !mostrarForm && <button type="button" className="btn btn-primary" disabled={salvando} onClick={abrirNovo}>Novo lançamento</button>}</div>
        </div>
        {podeEditar && mostrarForm && <FormFinanceiro form={form} setForm={setForm} editandoId={editandoId} salvando={salvando} onSalvar={salvar} onCancelar={fecharForm} />}
        <form className="page-card p-3 p-sm-4 mb-4" onSubmit={event => {
            event.preventDefault();
            if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) { toast.error('A data inicial não pode ser posterior à data final.'); return; }
            setBusca({ ...filtros, categoria: filtros.categoria.trim() }); consulta.recarregar();
        }}>
            <div className="row g-3 align-items-end">
                {[['dataInicio', 'Data inicial'], ['dataFim', 'Data final']].map(([campo, rotulo]) => <div className="col-12 col-sm-6 col-xl-3" key={campo}><label htmlFor={`filtro-${campo}`} className="form-label">{rotulo}</label><input id={`filtro-${campo}`} type="date" className="form-control" value={filtros[campo]} onChange={event => setFiltros(atual => ({ ...atual, [campo]: event.target.value }))} /></div>)}
                <div className="col-12 col-sm-6 col-xl-3"><label htmlFor="filtro-financeiro-tipo" className="form-label">Tipo</label><select id="filtro-financeiro-tipo" className="form-select" value={filtros.tipo} onChange={event => setFiltros(atual => ({ ...atual, tipo: event.target.value }))}><option value="">Todos</option><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></div>
                <div className="col-12 col-sm-6 col-xl-3"><label htmlFor="filtro-financeiro-categoria" className="form-label">Categoria</label><input id="filtro-financeiro-categoria" className="form-control" list="categorias-financeiro" maxLength={100} value={filtros.categoria} placeholder="Todas" onChange={event => setFiltros(atual => ({ ...atual, categoria: event.target.value }))} /><datalist id="categorias-financeiro">{CATEGORIAS.map(c => <option key={c} value={c} />)}</datalist></div>
                <div className="col-12 d-flex flex-wrap gap-2"><button type="submit" className="btn btn-primary" disabled={consulta.carregando || salvando}>Consultar</button><button type="button" className="btn btn-light" disabled={salvando} onClick={() => { let vazios = { dataInicio: '', dataFim: '', tipo: '', categoria: '' }; setFiltros(vazios); setBusca(vazios); }}>Limpar filtros</button></div>
            </div>
        </form>
        {consulta.erro && <div className="alert alert-danger" role="alert"><p>{consulta.erro}</p><button type="button" className="btn btn-outline-danger" onClick={consulta.recarregar}>Tentar novamente</button></div>}
        <div className="row g-3 mb-4">{[['Entradas', 'entradas', 'success'], ['Saídas', 'saidas', 'danger'], ['Saldo do período', 'saldo', 'primary']].map(([rotulo, campo, cor]) => <div className="col-12 col-md-4" key={campo}><div className="page-card p-3 p-sm-4 h-100"><div className="small text-secondary">{rotulo}</div><strong className={`fs-4 text-${cor}`}>{consulta.carregando ? 'Carregando...' : consulta.erro ? '—' : formatarValor(consulta.dados?.totais[campo] ?? 0)}</strong></div></div>)}</div>
        <section className="page-card">
            <div className="p-3 p-sm-4 border-bottom"><h2 className="h6 mb-1">Lançamentos do período</h2><p className="small text-secondary mb-0">Os totais seguem todos os filtros e incluem compras vinculadas ao estoque. Recorrência é apenas informativa.</p></div>
            <div className="table-responsive"><table className="table align-middle mb-0">
                <thead className="text-nowrap"><tr><th>Data e hora</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Recorrência</th><th>Origem</th><th>Registrado por</th>{podeEditar && <th>Ações</th>}</tr></thead>
                <tbody>{consulta.carregando ? <tr><td colSpan={podeEditar ? 9 : 8} className="text-secondary text-center p-4" role="status">Carregando lançamentos...</td></tr>
                    : consulta.erro ? <tr><td colSpan={podeEditar ? 9 : 8} className="text-secondary text-center p-4">Consulta indisponível.</td></tr>
                    : !consulta.dados?.movimentacoes.length ? <tr><td colSpan={podeEditar ? 9 : 8} className="text-secondary text-center p-4">Nenhum lançamento encontrado.</td></tr>
                    : consulta.dados.movimentacoes.map(item => <tr key={item.id}>
                        <td className="text-nowrap">{formatarDataHora(item.dataHora)}</td><td><span className={`badge ${item.tipo === 'ENTRADA' ? 'text-bg-success' : 'text-bg-danger'}`}>{item.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</span></td><td>{item.categoria}</td><td>{item.descricao || '—'}</td><td className="text-nowrap">{formatarValor(item.valor)}</td><td>{item.recorrente ? `${item.quantidadeMeses} meses` : 'Não'}</td><td>{item.idMovimentacaoEstoque ? `Estoque #${item.idMovimentacaoEstoque}` : 'Manual'}</td><td>{item.nomeUsuario}</td>
                        {podeEditar && <td>{item.idMovimentacaoEstoque ? <span className="small text-secondary">Vinculado ao estoque</span> : <div className="d-flex gap-2"><button type="button" className="btn btn-sm btn-outline-primary" disabled={salvando} onClick={() => abrirEdicao(item)}>Editar</button><button type="button" className="btn btn-sm btn-outline-danger" disabled={salvando} onClick={() => excluir(item)}>Excluir</button></div>}</td>}
                    </tr>)}</tbody>
            </table></div>
        </section>
    </div>;
}
