import express from 'express';

import loginRouter from './loginRoute.js';
import usuarioRouter from './usuarioRoute.js';
import produtoRouter from './produtoRoute.js';
import adicionalRouter from './adicionalRoute.js';
import insumoRouter from './insumoRoute.js';
import categoriaRouter from './categoriaRoute.js';
import unidadeRouter from './unidadeRoute.js';
import redefinicaoSenhaRouter from './redefinicaosenhaRoute.js';
import clienteRouter   from './clienteRoute.js';
import cardapioRouter from './cardapioRoute.js';
import caixaRouter from './caixaRoute.js';
import estoqueRouter from './estoqueRoute.js';
import pedidoRouter from './pedidoRoute.js';
import pagamentoRouter from './pagamentoRoute.js';
import financeiroRouter from './financeiroRoute.js';
import relatorioRouter from './relatorioRoute.js';

const router = express.Router();

router.use('/login', loginRouter);
router.use('/usuario', usuarioRouter);
router.use('/produto', produtoRouter);
router.use('/adicional', adicionalRouter);
router.use('/insumo', insumoRouter);
router.use('/categoria', categoriaRouter);
router.use('/unidade', unidadeRouter);
router.use('/senha', redefinicaoSenhaRouter);
router.use('/cliente', clienteRouter);
router.use('/cardapio', cardapioRouter);
router.use('/caixa', caixaRouter);
router.use('/estoque', estoqueRouter);
router.use('/pedido', pedidoRouter);
router.use('/pagamento', pagamentoRouter);
router.use('/financeiro', financeiroRouter);
router.use('/relatorio', relatorioRouter);

export default router;
