import { Children } from 'react';

export default function TabelaRelatorio({ titulo, colunas, children, mensagemVazia = 'Nenhum registro no período.' }) {
    return <section className="page-card p-3 p-sm-4 mb-3">
        <h3 className="h5 mb-3">{titulo}</h3>
        <div className="table-responsive">
            <table className="table align-middle mb-0" aria-label={titulo}>
                <thead className="text-nowrap"><tr>
                    {colunas.map(coluna => <th scope="col" key={coluna}>{coluna}</th>)}
                </tr></thead>
                <tbody>{Children.count(children) ? children : <tr>
                    <td colSpan={colunas.length} className="text-secondary">{mensagemVazia}</td>
                </tr>}</tbody>
            </table>
        </div>
    </section>;
}
