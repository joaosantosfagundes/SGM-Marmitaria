export default function StatCard({ icon, title, value, helper, tone = "primary" }) {
  return (
    <div className="stat-card p-4">
      <div className="d-flex gap-3 align-items-center">
        <div className={`icon-shape bg-${tone} text-white rounded-2`}>
          <i className={`ti ${icon} fs-5`} />
        </div>
        <div>
          <div className="small text-secondary mb-1">{title}</div>
          <div className="h5 fw-bold mb-1">{value}</div>
          <div className={`small text-${tone}`}>{helper}</div>
        </div>
      </div>
    </div>
  );
}
