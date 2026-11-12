import './auth.scss';

export default function AuthLayout({ children }) {
    return (
        <div className="auth-layout">
            <aside className="auth-brand">
                <span className="auth-brand-logo" aria-hidden="true">M</span>
                <div className="auth-brand-copy">
                    <p className="auth-brand-title">
                        Gestão simples para uma <span>marmitaria</span> mais eficiente.
                    </p>
                    <ul className="auth-brand-benefits">
                        <li><i className="ti ti-check" aria-hidden="true" />Pedidos, cardápio e cozinha em um só lugar</li>
                        <li><i className="ti ti-check" aria-hidden="true" />Financeiro e caixa mais claros</li>
                        <li><i className="ti ti-check" aria-hidden="true" />Mais agilidade no dia a dia</li>
                    </ul>
                </div>
                <small className="auth-brand-footer">SGM Marmitaria · Sistema de Gestão</small>
            </aside>
            <main className="auth-content">
                <div className="auth-form">{children}</div>
            </main>
        </div>
    );
}
