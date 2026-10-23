import { Link } from 'react-router-dom';
import { formatarValor } from './pedidoUtils.js';

export default function ResumoCardapio({ cardapio, data }) {
    let fixos = cardapio.preparacoes.filter(item => item.grupo === null);
    let misturas = cardapio.preparacoes.filter(item => item.grupo === 'Mistura');
    return (
        <section className="rounded border p-3 mb-3 bg-light">
            <h3 className="h6">Cardápio de hoje <span className="small text-secondary">({data.split('-').reverse().join('/')})</span></h3>
            {!cardapio.existe ? <div className="mb-0">
                Não há cardápio para hoje. Você pode lançar produtos sem mistura e adicionais.
                {' '}<Link to="/cardapio">Montar cardápio</Link>
            </div> : <dl className="small mb-0">
                <dt>Itens fixos</dt><dd>{fixos.map(item => item.nome).join(', ') || 'Nenhum item fixo.'}</dd>
                <dt>Opções de mistura</dt><dd>{misturas.map(item => item.nome).join(', ') || 'Nenhuma opção de mistura.'}</dd>
                <dt>Adicionais do dia</dt><dd className="mb-0">{cardapio.adicionais.map(item => `${item.nome} (${formatarValor(item.preco)})`).join(', ') || 'Nenhum adicional disponível.'}</dd>
            </dl>}
        </section>
    );
}
