export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="fs-3 mb-1">{title}</h1>
        <p className="text-secondary mb-0">{description}</p>
      </div>

      <section className="page-card p-5 text-center">
        <i className="ti ti-layout-dashboard fs-1 text-primary" />
        <h2 className="h5 mt-3">Tela preparada</h2>
        <p className="text-secondary mb-0">
          A estrutura visual está pronta para receber a implementação da função.
        </p>
      </section>
    </div>
  );
}
