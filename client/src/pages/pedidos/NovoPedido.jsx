import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { dataLocal } from '../../lib/dataLocal.js';
import useConsulta from './useConsulta.js';
import ConfiguradorItem from './ConfiguradorItem.jsx';
import ResumoCardapio from './ResumoCardapio.jsx';
import ResumoPedido from './ResumoPedido.jsx';
import PagamentoPedido from './PagamentoPedido.jsx';
import { centavos, converterValor, FORMAS_PAGAMENTO, formatarValor, MAX_CENTAVOS, TIPOS_ATENDIMENTO, totalPedido, tratarErro } from './pedidoUtils.js';

export default function NovoPedido({ bloqueado, onCancelar, onSucesso, onCaixaFechado }) {
    const confirmar = useConfirm();
    const envioRef = useRef(false);
    const sequenciaRef = useRef(0);
    const [data, setData] = useState(dataLocal);
    const catalogo = useConsulta('produto');
    const clientes = useConsulta('cliente');
    const menu = useConsulta(`cardapio?data=${data}`);
    // O cardápio mantém adicionais inativados no histórico; consultamos o cadastro para oferecer só os ativos.
    const adicionais = useConsulta('adicional');
    const [itens, setItens] = useState([]);
    const [configuracao, setConfiguracao] = useState(null);
    const [tipo, setTipo] = useState('BALCAO');
    const [endereco, setEndereco] = useState('');
    const [idCliente, setIdCliente] = useState('');
    const [buscaCliente, setBuscaCliente] = useState('');
    const [observacao, setObservacao] = useState('');
    const [forma, setForma] = useState('');
    const [valorRecebido, setValorRecebido] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erroEnvio, setErroEnvio] = useState('');
    let consultas = [catalogo, clientes, menu, adicionais];
    let carregando = consultas.some(consulta => consulta.carregando);
    let erros = consultas.filter(consulta => consulta.erro);
    let pronto = consultas.every(consulta => consulta.dados !== null) && !carregando && !erros.length;
    let ocupado = bloqueado || enviando || !pronto;
    let produtos = (catalogo.dados ?? []).filter(produto => produto.ativo);
    let clientesAtivos = (clientes.dados ?? []).filter(cliente => cliente.ativo);
    let clientesFiltrados = clientesAtivos.filter(cliente => cliente.id === Number(idCliente) || cliente.nome.toLocaleLowerCase('pt-BR').includes(buscaCliente.toLocaleLowerCase('pt-BR')));
    let cardapio = menu.dados && { ...menu.dados, adicionais: menu.dados.adicionais.filter(item => (adicionais.dados ?? []).some(adicional => adicional.id === item.id && adicional.ativo)) };
    let cardapioDisponivel = Boolean(cardapio?.existe && cardapio.preparacoes.length);
    let total = totalPedido(itens);
    let recebido = valorRecebido.trim() ? converterValor(valorRecebido) : null;
    let dinheiroInvalido = forma === 'DINHEIRO' && valorRecebido.trim() !== '' && (recebido === null || centavos(recebido) < total);

    function conferirDia() {
        let hoje = dataLocal();
        if (hoje === data) return true;
        setData(hoje); setItens([]); setConfiguracao(null); setErroEnvio('');
        toast.error('O dia mudou. Confira o cardápio de hoje e monte os itens novamente.');
        return false;
    }

    function configurar(produto, indice = null) {
        if (ocupado || !conferirDia()) return;
        if (produto.usaCardapio && !cardapioDisponivel) return toast.error('Monte o cardápio de hoje antes de lançar este produto.');
        setConfiguracao({ chave: ++sequenciaRef.current, produto, indice, item: indice === null ? null : itens[indice] });
    }

    function adicionarItem(item) {
        if (ocupado || !conferirDia()) return;
        let novos = configuracao.indice === null ? [...itens, item] : itens.map((atual, indice) => indice === configuracao.indice ? item : atual);
        if (totalPedido(novos) > MAX_CENTAVOS) return toast.error('O total do pedido ultrapassa R$ 99.999.999,99.');
        setItens(novos); setConfiguracao(null); setErroEnvio('');
    }

    async function cancelar() {
        if (enviando || envioRef.current) return;
        if ((itens.length || configuracao || endereco || idCliente || observacao || forma) && !(await confirmar({
            titulo: 'Descartar novo pedido', mensagem: 'Descartar os dados deste pedido que ainda não foi lançado?', textoConfirmar: 'Descartar pedido', tipo: 'padrao',
        }))) return;
        onCancelar();
    }

    async function lancar(event) {
        event.preventDefault();
        if (ocupado || envioRef.current || !conferirDia()) return;
        if (configuracao) return toast.error('Adicione ou cancele o item em configuração antes de lançar o pedido.');
        if (!itens.length) return toast.error('Adicione ao menos um item ao pedido.');
        if (!FORMAS_PAGAMENTO[forma]) return toast.error('Selecione uma forma de pagamento.');
        if (tipo === 'DELIVERY' && (endereco.trim().length < 5 || endereco.trim().length > 255)) return toast.error('Informe um endereço de entrega com 5 a 255 caracteres.');
        if (forma === 'FIADO' && !idCliente) return toast.error('Selecione um cliente para o pagamento fiado.');
        if (dinheiroInvalido) return toast.error('O valor recebido deve ser válido, ter até duas casas decimais e ser maior ou igual ao total do pedido.');
        let pagamento = { forma };
        if (forma === 'DINHEIRO' && recebido !== null) pagamento.valorRecebido = recebido;
        let corpo = {
            data, tipoAtendimento: tipo, idCliente: idCliente ? Number(idCliente) : null,
            enderecoEntrega: tipo === 'DELIVERY' ? endereco.trim() : null, observacao: observacao.trim() || null,
            itens: itens.map(item => ({
                idProduto: item.idProduto, quantidade: item.quantidade, opcaoMistura: item.opcaoMistura, observacao: item.observacao,
                adicionais: item.adicionais.map(adicional => ({ idAdicional: adicional.idAdicional, quantidade: adicional.quantidade })),
            })), pagamento,
        };
        envioRef.current = true; setEnviando(true); setErroEnvio('');
        try {
            let pedido = await ApiClient.post('pedido', corpo);
            toast.success('Pedido lançado com sucesso!');
            onSucesso(pedido);
        } catch (error) {
            setErroEnvio(tratarErro(error));
            if (error?.status === 409 && /caixa/i.test(error.msg ?? '')) onCaixaFechado(error.msg);
        } finally {
            envioRef.current = false; setEnviando(false);
        }
    }

    return (
        <section className="page-card p-3 p-sm-4 mb-4" aria-labelledby="novo-pedido-titulo">
            <h2 className="h5 mb-3" id="novo-pedido-titulo">Novo pedido</h2>
            {carregando && <p role="status" className="text-secondary">Carregando produtos, clientes e cardápio de hoje...</p>}
            {erros.length > 0 && <div className="alert alert-danger" role="alert">
                <p>Não foi possível preparar o formulário. {erros.map(consulta => consulta.erro).join(' ')}</p>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => erros.forEach(consulta => consulta.recarregar())}>Tentar novamente</button>
            </div>}
            {pronto && <form onSubmit={lancar} noValidate>
                <fieldset disabled={ocupado} className="pedido-campos">
                    <div className="row g-4">
                        <div className="col-12 col-lg-6">
                            <ResumoCardapio cardapio={cardapio} data={data} />
                            <h3 className="h6">Escolha um produto</h3>
                            {produtos.length === 0 && <p className="text-secondary">Nenhum produto ativo cadastrado.</p>}
                            <div className="row g-2">
                                {produtos.map(produto => <div className="col-12 col-sm-6" key={produto.id}>
                                    <button type="button" className="btn btn-outline-primary text-start w-100 h-100 pedido-produto" disabled={Boolean(configuracao) || (produto.usaCardapio && !cardapioDisponivel)} onClick={() => configurar(produto)}>
                                        <span className="d-block fw-semibold">{produto.nome}</span><span>{formatarValor(produto.precoPadrao)}</span>
                                        {produto.usaCardapio && !cardapioDisponivel && <span className="d-block small mt-1">Monte o cardápio de hoje</span>}
                                    </button>
                                </div>)}
                            </div>
                            {configuracao && <ConfiguradorItem key={configuracao.chave} {...configuracao} cardapio={cardapio} bloqueado={ocupado} onAdicionar={adicionarItem} onCancelar={() => setConfiguracao(null)} />}
                        </div>
                        <div className="col-12 col-lg-6">
                            <ResumoPedido itens={itens} total={total} bloqueado={ocupado || Boolean(configuracao)} onEditar={indice => configurar(produtos.find(produto => produto.id === itens[indice].idProduto), indice)} onRemover={indice => setItens(atual => atual.filter((_, i) => i !== indice))} />
                            <h3 className="h6">Dados do pedido</h3>
                            <label htmlFor="pedido-tipo" className="form-label">Tipo de atendimento</label>
                            <select id="pedido-tipo" className="form-select mb-3" value={tipo} onChange={event => { setTipo(event.target.value); if (event.target.value !== 'DELIVERY') setEndereco(''); }}>
                                {Object.entries(TIPOS_ATENDIMENTO).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                            </select>
                            {tipo === 'DELIVERY' && <div className="mb-3">
                                <label htmlFor="pedido-endereco" className="form-label">Endereço de entrega (obrigatório)</label>
                                <textarea id="pedido-endereco" className="form-control" rows="2" required minLength={5} maxLength={255} value={endereco} onChange={event => setEndereco(event.target.value)} />
                            </div>}
                            <label htmlFor="pedido-busca-cliente" className="form-label">Cliente {forma === 'FIADO' ? '(obrigatório para fiado)' : '(opcional)'}</label>
                            <input id="pedido-busca-cliente" type="search" className="form-control mb-2" placeholder="Buscar cliente por nome" value={buscaCliente} onChange={event => setBuscaCliente(event.target.value)} aria-label="Buscar cliente por nome" />
                            <label htmlFor="pedido-cliente" className="visually-hidden">Selecione o cliente</label>
                            <select id="pedido-cliente" className="form-select" value={idCliente} required={forma === 'FIADO'} onChange={event => setIdCliente(event.target.value)}>
                                <option value="">Sem cliente selecionado</option>
                                {clientesFiltrados.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                            </select>
                            {clientesFiltrados.length === 0 && <p className="form-text">Nenhum cliente ativo encontrado.</p>}
                            <label htmlFor="pedido-observacao" className="form-label mt-3">Observação do pedido (opcional)</label>
                            <textarea id="pedido-observacao" className="form-control" rows="2" maxLength={255} value={observacao} onChange={event => setObservacao(event.target.value)} />
                            <PagamentoPedido forma={forma} valorRecebido={valorRecebido} total={total} onForma={valor => { setForma(valor); if (valor !== 'DINHEIRO') setValorRecebido(''); }} onValor={setValorRecebido} />
                        </div>
                    </div>
                </fieldset>
                {erroEnvio && <div className="alert alert-danger mt-3 pedido-texto" role="alert">{erroEnvio}</div>}
                <div className="d-flex flex-wrap gap-2 mt-4">
                    <button type="submit" className="btn btn-primary" disabled={ocupado || !itens.length || !forma || dinheiroInvalido || Boolean(configuracao)}>{enviando ? 'Lançando pedido...' : 'Lançar pedido'}</button>
                    <button type="button" className="btn btn-light" disabled={enviando} onClick={cancelar}>Cancelar</button>
                </div>
            </form>}
            {!pronto && <button type="button" className="btn btn-light" onClick={cancelar}>Cancelar</button>}
        </section>
    );
}
