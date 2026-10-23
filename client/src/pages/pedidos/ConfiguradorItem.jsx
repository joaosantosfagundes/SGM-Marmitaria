import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import { formatarValor, MAX_CENTAVOS, quantidadeValida, subtotalItem } from './pedidoUtils.js';

export default function ConfiguradorItem({ produto, item, cardapio, bloqueado, onAdicionar, onCancelar }) {
    const prefixo = useId();
    const [quantidade, setQuantidade] = useState(String(item?.quantidade ?? 1));
    const [mistura, setMistura] = useState(item?.opcaoMistura ?? '');
    const [observacao, setObservacao] = useState(item?.observacao ?? '');
    const [selecionados, setSelecionados] = useState(() => Object.fromEntries((item?.adicionais ?? []).map(adicional => [adicional.idAdicional, String(adicional.quantidade)])));
    let opcoes = produto.usaCardapio ? cardapio.preparacoes.filter(preparacao => preparacao.grupo === 'Mistura') : [];
    let adicionais = produto.usaCardapio ? cardapio.adicionais : [];
    let configurado = {
        idProduto: produto.id, nomeProduto: produto.nome, precoUnitario: Number(produto.precoPadrao),
        quantidade: Number(quantidade), opcaoMistura: opcoes.length ? mistura : null, observacao: observacao.trim() || null,
        adicionais: adicionais.filter(adicional => Object.hasOwn(selecionados, adicional.id)).map(adicional => ({
            idAdicional: adicional.id, nomeAdicional: adicional.nome, precoUnitario: Number(adicional.preco), quantidade: Number(selecionados[adicional.id]),
        })),
    };
    let quantidadesValidas = quantidadeValida(quantidade) && adicionais.every(adicional => !Object.hasOwn(selecionados, adicional.id) || quantidadeValida(selecionados[adicional.id]));

    function adicionar() {
        if (bloqueado) return;
        if (!quantidadesValidas) return toast.error('Informe quantidades inteiras de 1 a 99 para o item e seus adicionais.');
        if (opcoes.length && !opcoes.some(opcao => opcao.nome === mistura)) return toast.error('Escolha uma opção de mistura antes de adicionar o item.');
        if (subtotalItem(configurado) > MAX_CENTAVOS) return toast.error('O subtotal do item ultrapassa R$ 99.999.999,99.');
        onAdicionar(configurado);
    }

    function selecionarAdicional(id, marcado) {
        setSelecionados(atual => {
            let novos = { ...atual };
            if (marcado) novos[id] = '1';
            else delete novos[id];
            return novos;
        });
    }

    return (
        <section className="border border-primary rounded p-3 mt-3" aria-labelledby={`${prefixo}-titulo`}>
            <h3 id={`${prefixo}-titulo`} className="h6">{item ? 'Editar item' : 'Configurar item'}: {produto.nome}</h3>
            <label htmlFor={`${prefixo}-quantidade`} className="form-label">Quantidade</label>
            <input id={`${prefixo}-quantidade`} type="number" min="1" max="99" step="1" inputMode="numeric" className="form-control mb-3" value={quantidade} disabled={bloqueado} onChange={event => setQuantidade(event.target.value)} />
            {opcoes.length > 0 && <fieldset className="mb-3" disabled={bloqueado}>
                <legend className="fs-6">Escolha a mistura <span className="text-secondary small">(obrigatório)</span></legend>
                {opcoes.map((opcao, indice) => <div className="form-check mb-2" key={opcao.nome}>
                    <input id={`${prefixo}-mistura-${indice}`} className="form-check-input" type="radio" name={`${prefixo}-mistura`} value={opcao.nome} checked={mistura === opcao.nome} onChange={event => setMistura(event.target.value)} />
                    <label className="form-check-label" htmlFor={`${prefixo}-mistura-${indice}`}>{opcao.nome}</label>
                </div>)}
            </fieldset>}
            {adicionais.length > 0 && <fieldset className="mb-3" disabled={bloqueado}>
                <legend className="fs-6">Adicionais</legend>
                <p className="small text-secondary">Informe o total de cada adicional nesta linha do pedido.</p>
                {adicionais.map(adicional => <div key={adicional.id} className="mb-3">
                    <div className="form-check">
                        <input id={`${prefixo}-adicional-${adicional.id}`} className="form-check-input" type="checkbox" checked={Object.hasOwn(selecionados, adicional.id)} onChange={event => selecionarAdicional(adicional.id, event.target.checked)} />
                        <label className="form-check-label" htmlFor={`${prefixo}-adicional-${adicional.id}`}>{adicional.nome} — {formatarValor(adicional.preco)}</label>
                    </div>
                    {Object.hasOwn(selecionados, adicional.id) && <div className="mt-2">
                        <label className="form-label small" htmlFor={`${prefixo}-qtd-${adicional.id}`}>Quantidade de {adicional.nome}</label>
                        <input id={`${prefixo}-qtd-${adicional.id}`} className="form-control" type="number" min="1" max="99" step="1" inputMode="numeric" value={selecionados[adicional.id]} onChange={event => setSelecionados(atual => ({ ...atual, [adicional.id]: event.target.value }))} />
                    </div>}
                </div>)}
            </fieldset>}
            <label className="form-label" htmlFor={`${prefixo}-observacao`}>Observação do item (opcional)</label>
            <textarea id={`${prefixo}-observacao`} className="form-control" rows="2" maxLength={255} value={observacao} disabled={bloqueado} onChange={event => setObservacao(event.target.value)} />
            <p className="mt-3 mb-2">Subtotal: <strong>{quantidadesValidas ? formatarValor(subtotalItem(configurado) / 100) : 'Confira as quantidades'}</strong></p>
            <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" disabled={bloqueado} onClick={adicionar}>{item ? 'Salvar item' : 'Adicionar ao pedido'}</button>
                <button type="button" className="btn btn-light" disabled={bloqueado} onClick={onCancelar}>Cancelar item</button>
            </div>
        </section>
    );
}
