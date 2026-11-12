import { formatarDataHora, formatarValor } from '../caixa/caixaUtils.js';
import { FORMAS_PAGAMENTO } from '../pedidos/pedidoUtils.js';
import { formatarQuantidade } from './relatorioUtils.js';
import TabelaRelatorio from './TabelaRelatorio.jsx';

export default function RelatorioDevedores({ dados }) {
    let { clientes } = dados;

    return <>
        <p className="text-secondary">
            Em aberto mostra as pendências atuais. O período selecionado filtra os pedidos pela data da quitação.
        </p>
        <TabelaRelatorio titulo="Resumo por cliente"
            colunas={['Cliente', 'Em aberto', 'Pedidos pendentes', 'Pendência mais antiga', 'Quitado no período']}
            mensagemVazia="Nenhum cliente com pendências atuais ou quitações no período.">
            {clientes.map(cliente => <tr key={cliente.idCliente}>
                <th scope="row">{cliente.nome} <small className="text-secondary">#{cliente.idCliente}</small></th>
                <td className="text-nowrap">{formatarValor(cliente.totalEmAberto)}</td>
                <td>{formatarQuantidade(cliente.quantidadePendentes)}</td>
                <td className="text-nowrap">{formatarDataHora(cliente.fiadoMaisAntigo)}</td>
                <td className="text-nowrap">{formatarValor(cliente.totalQuitadoNoPeriodo)}</td>
            </tr>)}
        </TabelaRelatorio>
        {clientes.map(cliente => <TabelaRelatorio key={cliente.idCliente}
            titulo={`Pedidos de ${cliente.nome} (#${cliente.idCliente})`}
            colunas={['Pedido', 'Lançado em', 'Situação', 'Valor', 'Quitado em', 'Forma de quitação']}>
            {[...cliente.pendentes, ...cliente.quitados].map(pedido => <tr key={pedido.idPagamento}>
                <th scope="row">#{pedido.idPedido}</th>
                <td className="text-nowrap">{formatarDataHora(pedido.dataHora)}</td>
                <td>{pedido.status === 'PENDENTE'
                    ? <span className="badge text-bg-warning">A receber</span>
                    : <span className="badge text-bg-success">Quitado</span>}</td>
                <td className="text-nowrap">{formatarValor(pedido.valor)}</td>
                <td className="text-nowrap">{formatarDataHora(pedido.dataQuitacao)}</td>
                <td>{FORMAS_PAGAMENTO[pedido.formaQuitacao] || '—'}</td>
            </tr>)}
        </TabelaRelatorio>)}
    </>;
}
