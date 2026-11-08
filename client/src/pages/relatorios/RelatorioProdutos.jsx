import { useState } from 'react';
import { formatarValor } from '../caixa/caixaUtils.js';
import TabelaRelatorio from './TabelaRelatorio.jsx';
import { formatarQuantidade } from './relatorioUtils.js';

function Ranking({ titulo, coluna, itens, ordem }) {
    let desempate = ordem === 'quantidade' ? 'totalVendido' : 'quantidade';
    let ordenados = [...itens].sort((a, b) => b[ordem] - a[ordem] || b[desempate] - a[desempate]
        || a.nome.localeCompare(b.nome, 'pt-BR') || a.id - b.id);

    return <TabelaRelatorio titulo={titulo} colunas={['Posição', coluna, 'Quantidade', 'Total vendido']}>
        {ordenados.map((item, indice) => <tr key={item.id}>
            <td>{indice + 1}</td>
            <th scope="row">{item.nome}</th>
            <td>{formatarQuantidade(item.quantidade)}</td>
            <td className="text-nowrap">{formatarValor(item.totalVendido)}</td>
        </tr>)}
    </TabelaRelatorio>;
}

export default function RelatorioProdutos({ dados }) {
    const [ordem, setOrdem] = useState('quantidade');

    return <>
        <p className="text-secondary">O ranking considera pedidos válidos no período. Produtos e adicionais usam seus subtotais registrados na venda.</p>
        <div className="relatorio-controles d-flex flex-wrap gap-2 align-items-center mb-3">
            <label htmlFor="ordem-ranking">Ordenar por</label>
            <select id="ordem-ranking" className="form-select w-auto" value={ordem} onChange={event => setOrdem(event.target.value)}>
                <option value="quantidade">Quantidade</option>
                <option value="totalVendido">Valor vendido</option>
            </select>
        </div>
        <p className="d-none d-print-block">Ranking por {ordem === 'quantidade' ? 'quantidade' : 'valor vendido'}.</p>
        <Ranking titulo="Produtos" coluna="Produto" itens={dados.produtos} ordem={ordem} />
        <Ranking titulo="Adicionais" coluna="Adicional" itens={dados.adicionais} ordem={ordem} />
    </>;
}
