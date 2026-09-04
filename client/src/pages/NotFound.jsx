import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center">
        <h1 className="display-5 fw-semibold">Página não encontrada</h1>
        <p className="text-secondary mb-4">A rota informada ainda não existe.</p>
        <Link to="/" className="btn btn-primary">Voltar ao Dashboard</Link>
      </div>
    </main>
  );
}
