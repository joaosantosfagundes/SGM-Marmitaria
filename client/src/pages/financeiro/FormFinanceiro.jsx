import { CATEGORIAS } from './financeiroUtils.js';

export default function FormFinanceiro({ form, setForm, editandoId, salvando, onSalvar, onCancelar }) {
    function alterar(event) { setForm(atual => ({ ...atual, [event.target.name]: event.target.value })); }
    return <section className="page-card p-3 p-sm-4 mb-4">
        <h2 className="h5 mb-3">{editandoId ? 'Editar lançamento' : 'Novo lançamento'}</h2>
        <form onSubmit={onSalvar} noValidate>
            <fieldset disabled={salvando}>
                <div className="row g-3">
                    <div className="col-12 col-md-4"><label htmlFor="financeiro-tipo" className="form-label">Tipo</label><select id="financeiro-tipo" name="tipo" className="form-select" value={form.tipo} onChange={alterar}><option value="ENTRADA">Entrada avulsa</option><option value="SAIDA">Saída / despesa</option></select></div>
                    <div className="col-12 col-md-4"><label htmlFor="financeiro-categoria" className="form-label">Categoria</label><select id="financeiro-categoria" name="categoria" className="form-select" value={form.categoria} onChange={alterar}><option value="">Selecione</option>{CATEGORIAS.map(categoria => <option key={categoria}>{categoria}</option>)}<option value="OUTRA">Outra (digitar)</option></select></div>
                    {form.categoria === 'OUTRA' && <div className="col-12 col-md-4"><label htmlFor="financeiro-outra" className="form-label">Outra categoria</label><input id="financeiro-outra" name="categoriaOutra" className="form-control" maxLength={100} value={form.categoriaOutra} onChange={alterar} /></div>}
                    <div className="col-12 col-md-4"><label htmlFor="financeiro-valor" className="form-label">Valor (R$)</label><input id="financeiro-valor" name="valor" type="text" inputMode="decimal" className="form-control" placeholder="0,00" value={form.valor} onChange={alterar} /><div className="form-text">Maior que zero. Use vírgula ou ponto.</div></div>
                    <div className="col-12 col-md-6"><label htmlFor="financeiro-data-hora" className="form-label">Data e hora do lançamento</label><input id="financeiro-data-hora" name="dataHora" type="datetime-local" step="1" className="form-control" value={form.dataHora} onChange={alterar} /></div>
                    <div className="col-12 col-md-6"><label htmlFor="financeiro-descricao" className="form-label">Descrição (opcional)</label><textarea id="financeiro-descricao" name="descricao" className="form-control" maxLength={255} rows={2} value={form.descricao} onChange={alterar} /></div>
                    <div className="col-12 col-md-6"><div className="form-check"><input id="financeiro-recorrente" type="checkbox" className="form-check-input" checked={form.recorrente} onChange={event => setForm(atual => ({ ...atual, recorrente: event.target.checked, quantidadeMeses: '' }))} /><label htmlFor="financeiro-recorrente" className="form-check-label">Recorrente</label></div><div className="form-text">Informativo: não gera lançamentos futuros.</div></div>
                    {form.recorrente && <div className="col-12 col-md-6"><label htmlFor="financeiro-meses" className="form-label">Quantidade de meses</label><input id="financeiro-meses" name="quantidadeMeses" type="number" min="2" max="2147483647" step="1" className="form-control" value={form.quantidadeMeses} onChange={alterar} /></div>}
                </div>
            </fieldset>
            <div className="d-flex flex-wrap gap-2 mt-3"><button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button><button type="button" className="btn btn-light" disabled={salvando} onClick={onCancelar}>Cancelar</button></div>
        </form>
    </section>;
}
