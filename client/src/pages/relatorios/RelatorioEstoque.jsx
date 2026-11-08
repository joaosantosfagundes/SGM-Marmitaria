import TabelaRelatorio from './TabelaRelatorio.jsx';
import { formatarQuantidade } from './relatorioUtils.js';

export default function RelatorioEstoque({ dados }) {
    let insumos = dados.insumos;
    let movimentados = insumos.filter(linha => linha.entradas || linha.perdas || linha.ajustesEntrada || linha.ajustesSaida);

    return <>
        <p className="text-secondary">O saldo reflete o estoque atual. O período selecionado filtra as movimentações.</p>
        <TabelaRelatorio titulo="Saldo atual por insumo"
            colunas={['Insumo', 'Categoria', 'Unidade', 'Saldo atual', 'Estoque mínimo', 'Situação']}
            mensagemVazia="Nenhum insumo cadastrado.">
            {insumos.map(({ insumo }) => <tr key={insumo.id} className={insumo.abaixoDoMinimo ? 'table-warning' : undefined}>
                <th scope="row">{insumo.nome}</th>
                <td>{insumo.categoria}</td>
                <td>{insumo.siglaUnidade}</td>
                <td>{formatarQuantidade(insumo.quantidade)}</td>
                <td>{formatarQuantidade(insumo.estoqueMinimo)}</td>
                <td>
                    {insumo.abaixoDoMinimo ? <span className="badge text-bg-warning">Abaixo do mínimo</span> : 'No mínimo ou acima'}
                    {!insumo.ativo && <span className="badge text-bg-secondary ms-1">Inativo</span>}
                </td>
            </tr>)}
        </TabelaRelatorio>
        <TabelaRelatorio titulo="Movimentações por insumo"
            colunas={['Insumo', 'Unidade', 'Entradas de compra', 'Perdas', 'Ajustes de entrada', 'Ajustes de saída']}
            mensagemVazia="Nenhuma movimentação no período.">
            {movimentados.map(linha => <tr key={linha.insumo.id}>
                <th scope="row">{linha.insumo.nome}</th>
                <td>{linha.insumo.siglaUnidade}</td>
                <td>{formatarQuantidade(linha.entradas)}</td>
                <td>{formatarQuantidade(linha.perdas)}</td>
                <td>{formatarQuantidade(linha.ajustesEntrada)}</td>
                <td>{formatarQuantidade(linha.ajustesSaida)}</td>
            </tr>)}
        </TabelaRelatorio>
    </>;
}
