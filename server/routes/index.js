import express from 'express';

import loginRouter from './loginRoute.js';
import usuarioRouter from './usuarioRoute.js';
import produtoRouter from './produtoRoute.js';
import insumoRouter from './insumoRoute.js';
import categoriaRouter from './categoriaRoute.js';
import unidadeRouter from './unidadeRoute.js';
import redefinicaoSenhaRouter from './redefinicaosenhaRoute.js';

// TODO (Sprint 2/3, seguindo o padrão de usuarioRoute.js):
// import clienteRouter   from './clienteRoute.js';   // RF_B4 - Clientes
// import cardapioRouter  from './cardapioRoute.js';  // RF_F1 - Cardápio do Dia
// import pedidoRouter    from './pedidoRoute.js';    // RF_F2/F3 - Pedido / Status
// import estoqueRouter   from './estoqueRoute.js';   // RF_F4 - Mov. Estoque
// import pagamentoRouter from './pagamentoRoute.js'; // RF_F5/F6 - Pagamento / Quitação
// import financeiroRouter from './financeiroRoute.js'; // RF_F7 - Mov. Financeira
// import caixaRouter     from './caixaRoute.js';     // RF_F8 - Abrir/Fechar Caixa

const router = express.Router();

router.use('/login', loginRouter);
router.use('/usuario', usuarioRouter);
router.use('/produto', produtoRouter);
router.use('/insumo', insumoRouter);
router.use('/categoria', categoriaRouter);
router.use('/unidade', unidadeRouter);
router.use('/senha', redefinicaoSenhaRouter);

// router.use('/cliente', clienteRouter);
// router.use('/cardapio', cardapioRouter);
// router.use('/pedido', pedidoRouter);
// router.use('/estoque', estoqueRouter);
// router.use('/pagamento', pagamentoRouter);
// router.use('/financeiro', financeiroRouter);
// router.use('/caixa', caixaRouter);

export default router;