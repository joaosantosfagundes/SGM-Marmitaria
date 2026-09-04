// Menu do SGM — mapeado nas 17 funções (RF_B, RF_F, RF_S) do ERS.
// OBS: "Produtos" aqui = item vendável com preço fixo (RF_B2, tabela `produto` pós-rename).
//      "Insumos" = matéria-prima (RF_B3, tabela `insumo` pós-rename). Não são a mesma coisa
//      que o mockup original tratava como "Produtos" + "Itens de Venda" (nomenclatura antiga).
export const menu = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Dashboard", icon: "ti-home" },
      { href: "/pedidos", label: "Pedidos", icon: "ti-receipt" },              // RF_F2 / RF_F3
      { href: "/cardapio", label: "Cardápio do Dia", icon: "ti-tools-kitchen-2" }, // RF_F1
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/clientes", label: "Clientes", icon: "ti-users" },      // RF_B4
      { href: "/produtos", label: "Produtos", icon: "ti-shopping-cart" }, // RF_B2
      { href: "/insumos", label: "Insumos", icon: "ti-package" },      // RF_B3
      { href: "/estoque", label: "Estoque", icon: "ti-box" },          // RF_F4
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/caixa/abrir", label: "Abrir Caixa", icon: "ti-lock-open" },   // RF_F8
      { href: "/caixa/fechar", label: "Fechar Caixa", icon: "ti-lock" },      // RF_F9
      { href: "/financeiro", label: "Financeiro", icon: "ti-wallet" },       // RF_F7
      { href: "/fiado", label: "Fiado", icon: "ti-credit-card-pay" },        // RF_F6
      { href: "/pagamento", label: "Pagamento", icon: "ti-cash" },           // RF_F5
    ],
  },
  {
    label: "Relatórios",
    items: [
      // RF_S1–S5: por enquanto uma entrada só; quando implementar, vira
      // /relatorios/vendas, /relatorios/estoque etc. (sub-itens).
      { href: "/relatorios", label: "Relatórios", icon: "ti-chart-bar" },
    ],
  },
  {
    label: "Administração",
    items: [
      { href: "/usuarios", label: "Usuários", icon: "ti-user-cog" }, // RF_B1
    ],
  },
];

export const pages = {
  "/pedidos": { title: "Pedidos", description: "Gerenciamento e acompanhamento dos pedidos." },
  "/cardapio": { title: "Cardápio do Dia", description: "Defina a composição de insumos da marmita para a data selecionada." },
  "/clientes": { title: "Clientes", description: "Cadastro e consulta de clientes." },
  "/produtos": { title: "Produtos", description: "Itens vendáveis com preço fixo (cardápio fixo, bebidas, etc)." },
  "/insumos": { title: "Insumos", description: "Cadastro de matérias-primas usadas na produção." },
  "/estoque": { title: "Estoque", description: "Controle manual de entradas e saídas de insumos." },
  "/caixa/abrir": { title: "Abrir Caixa", description: "Abertura do caixa diário." },
  "/caixa/fechar": { title: "Fechar Caixa", description: "Conferência e fechamento do caixa diário." },
  "/financeiro": { title: "Financeiro", description: "Entradas, despesas e movimentações financeiras." },
  "/fiado": { title: "Fiado", description: "Consulta e quitação de valores em aberto." },
  "/pagamento": { title: "Pagamento", description: "Registro de pagamentos dos pedidos." },
  "/relatorios": { title: "Relatórios", description: "Relatórios gerenciais (RF_S1–S5)." },
  "/usuarios": { title: "Usuários", description: "Cadastro e gerenciamento de usuários do sistema." },
};

export function getPageByPath(path) {
  return pages[path];
}
