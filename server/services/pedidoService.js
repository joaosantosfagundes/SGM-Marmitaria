import PedidoEntity from "../entities/pedidoEntity.js";
import ItemPedidoEntity from "../entities/itemPedidoEntity.js";
import ItemPedidoAdicionalEntity from "../entities/itemPedidoAdicionalEntity.js";
import PagamentoEntity from "../entities/pagamentoEntity.js";
import PedidoRepository from "../repositories/pedidoRepository.js";
import ProdutoRepository from "../repositories/produtoRepository.js";
import AdicionalRepository from "../repositories/adicionalRepository.js";
import CardapioRepository from "../repositories/cardapioRepository.js";
import CaixaRepository from "../repositories/caixaRepository.js";
import ClienteRepository from "../repositories/clienteRepository.js";
import { validarData } from "./cardapioService.js";
import { centavos, lerInteiro, MAX_CENTAVOS, validarDinheiro, validarId } from "../utils/pedidoUtils.js";

const STATUS = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'SAIU_ENTREGA', 'CANCELADO'];

function textoOpcional(valor, campo, maximo = 255) {
    if (valor == null) return null;
    if (typeof valor !== 'string' || valor.length > maximo) throw { status: 400, msg: `${campo} deve ser um texto de até ${maximo} caracteres.` };
    return valor;
}

function subtotal(preco, quantidade) {
    if (!validarDinheiro(preco) || preco <= 0) throw { status: 409, msg: 'O catálogo contém preço inválido. Corrija o cadastro antes de lançar o pedido.' };
    let unitario = centavos(preco);
    if (quantidade > Math.floor(MAX_CENTAVOS / unitario)) throw { status: 400, msg: 'O subtotal ultrapassa o limite de R$ 99.999.999,99.' };
    return unitario * quantidade;
}

export default class PedidoService {
    #repo = new PedidoRepository();
    #produtoRepo = new ProdutoRepository();
    #adicionalRepo = new AdicionalRepository();
    #cardapioRepo = new CardapioRepository();
    #caixaRepo = new CaixaRepository();
    #clienteRepo = new ClienteRepository();

    async listar({ status, idCaixa, limite = '50' } = {}) {
        if (status !== undefined && !STATUS.includes(status)) throw { status: 400, msg: 'Informe um status de pedido válido.' };
        return this.#repo.listar({ status, idCaixa: idCaixa === undefined ? undefined : lerInteiro(idCaixa, 'um ID de caixa'), limite: lerInteiro(limite, 'um limite entre 1 e 200', 200) });
    }

    async obter(id) {
        let pedido = await this.#repo.obter(lerInteiro(id, 'um ID de pedido'));
        if (!pedido) throw { status: 404, msg: 'Pedido não encontrado.' };
        return pedido;
    }

    async criar(dados, idUsuarioLogado) {
        if (!dados || typeof dados !== 'object' || !validarData(dados.data)) throw { status: 400, msg: 'Informe uma data válida para o cardápio (AAAA-MM-DD).' };
        let pedido = new PedidoEntity({ idUsuario: idUsuarioLogado, idCliente: dados.idCliente ?? null, tipoAtendimento: dados.tipoAtendimento });
        if (!pedido.validar()) throw { status: 400, msg: 'Informe um tipo de atendimento válido: BALCAO, MESA ou DELIVERY.' };
        if (pedido.idCliente !== null && !validarId(pedido.idCliente)) throw { status: 400, msg: 'Informe um cliente válido.' };
        pedido.observacao = textoOpcional(dados.observacao, 'A observação do pedido');
        pedido.enderecoEntrega = textoOpcional(dados.enderecoEntrega, 'O endereço de entrega');
        if (pedido.tipoAtendimento === 'DELIVERY') {
            if (!pedido.enderecoEntrega || pedido.enderecoEntrega.trim().length < 5) throw { status: 400, msg: 'DELIVERY exige endereço de entrega com 5 a 255 caracteres.' };
            pedido.enderecoEntrega = pedido.enderecoEntrega.trim();
        } else if (pedido.enderecoEntrega !== null) throw { status: 400, msg: 'Endereço de entrega só é permitido para DELIVERY.' };
        if (!Array.isArray(dados.itens) || !dados.itens.length) throw { status: 400, msg: 'Informe ao menos um item no pedido.' };
        pedido.itens = dados.itens.map(entrada => {
            let item = new ItemPedidoEntity({ idProduto: entrada?.idProduto, quantidade: entrada?.quantidade });
            if (!item.validar()) throw { status: 400, msg: 'Cada item exige produto válido e quantidade inteira de 1 a 99.' };
            item.observacao = textoOpcional(entrada.observacao, 'A observação do item');
            item.opcaoMistura = textoOpcional(entrada.opcaoMistura, 'A opção de mistura', 150);
            let adicionais = entrada.adicionais === undefined ? [] : entrada.adicionais;
            if (!Array.isArray(adicionais)) throw { status: 400, msg: 'Os adicionais devem ser uma lista.' };
            item.adicionais = adicionais.map(entradaAdicional => {
                let adicional = new ItemPedidoAdicionalEntity({ idAdicional: entradaAdicional?.idAdicional, quantidade: entradaAdicional?.quantidade });
                if (!adicional.validar()) throw { status: 400, msg: 'Cada adicional exige ID válido e quantidade inteira de 1 a 99.' };
                return adicional;
            });
            return item;
        });
        pedido.pagamento = new PagamentoEntity({ forma: dados.pagamento?.forma, valorRecebido: dados.pagamento?.valorRecebido ?? null });
        if (!pedido.pagamento.validar()) throw { status: 400, msg: 'Informe pagamento com forma DINHEIRO, PIX, DEBITO, CREDITO ou FIADO.' };
        if (pedido.pagamento.forma === 'FIADO' && pedido.idCliente === null) throw { status: 400, msg: 'Pagamento FIADO exige um cliente vinculado.' };
        if (pedido.pagamento.forma === 'DINHEIRO') {
            if (pedido.pagamento.valorRecebido !== null && !validarDinheiro(pedido.pagamento.valorRecebido)) throw { status: 400, msg: 'Quando informado para DINHEIRO, valorRecebido deve ser numérico, com até duas casas decimais e no máximo R$ 99.999.999,99.' };
        } else if (dados.pagamento.valorRecebido !== undefined) throw { status: 400, msg: 'valorRecebido só é aceito para pagamento em DINHEIRO.' };

        return this.#repo.criar(pedido, async consultar => {
            let caixa = await this.#caixaRepo.obterAtual(consultar);
            if (!caixa) throw { status: 409, msg: 'Abra o caixa antes de lançar pedidos.' };
            pedido.idCaixa = caixa.id;
            if (pedido.idCliente !== null) {
                let cliente = await this.#clienteRepo.obter(pedido.idCliente, consultar);
                if (!cliente || !cliente.ativo) throw { status: 400, msg: 'O cliente não existe ou está inativo.' };
            }
            let cardapio;
            let total = 0;
            for (let item of pedido.itens) {
                let produto = await this.#produtoRepo.obter(item.idProduto, consultar);
                if (!produto || !produto.ativo) throw { status: 400, msg: 'O produto não existe ou está inativo.' };
                if (!produto.usaCardapio) {
                    if (item.opcaoMistura !== null || item.adicionais.length) throw { status: 400, msg: 'Este produto não permite mistura nem adicionais do dia.' };
                } else {
                    cardapio ??= await this.#cardapioRepo.obterPorData(dados.data, consultar);
                    let opcoes = cardapio.preparacoes.filter(preparacao => preparacao.grupo === 'Mistura');
                    if (opcoes.length) {
                        let normalizar = valor => valor.toLocaleLowerCase('pt-BR').replace(/\s/g, '');
                        let opcao = item.opcaoMistura === null ? null : opcoes.find(opcao => normalizar(opcao.nome) === normalizar(item.opcaoMistura));
                        if (!opcao) throw { status: 400, msg: 'Escolha uma opção de mistura válida do cardápio dessa data.' };
                        item.opcaoMistura = opcao.nome;
                    } else if (item.opcaoMistura !== null) throw { status: 400, msg: 'Não há opções de mistura nessa data; opcaoMistura deve ser nula.' };
                }
                item.precoUnitario = produto.precoPadrao;
                item.subtotal = subtotal(item.precoUnitario, item.quantidade) / 100;
                total += centavos(item.subtotal);
                for (let adicional of item.adicionais) {
                    let cadastro = await this.#adicionalRepo.obter(adicional.idAdicional, consultar);
                    if (!cadastro || !cadastro.ativo || !cardapio?.adicionais.some(item => item.id === adicional.idAdicional)) {
                        throw { status: 400, msg: 'O adicional não existe, está inativo ou não está disponível no cardápio dessa data.' };
                    }
                    adicional.precoUnitario = cadastro.preco;
                    adicional.subtotal = subtotal(adicional.precoUnitario, adicional.quantidade) / 100;
                    total += centavos(adicional.subtotal);
                }
                if (total > MAX_CENTAVOS) throw { status: 400, msg: 'O total do pedido ultrapassa R$ 99.999.999,99.' };
            }
            pedido.valorTotal = total / 100;
            pedido.pagamento.valor = pedido.valorTotal;
            pedido.pagamento.status = pedido.pagamento.forma === 'FIADO' ? 'PENDENTE' : 'PAGO';
            if (pedido.pagamento.forma === 'DINHEIRO' && pedido.pagamento.valorRecebido !== null && centavos(pedido.pagamento.valorRecebido) < total) {
                throw { status: 400, msg: 'O valor recebido é menor que o total do pedido.' };
            }
        });
    }
}
