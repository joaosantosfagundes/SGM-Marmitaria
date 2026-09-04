import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { menu } from "../lib/menu.js";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const activePath = location.pathname;

  function closeMobile() {
    setOpen(false);
    document.getElementById("mobile-overlay")?.classList.remove("show");
  }

  return (
    <aside id="sidebar" className={`sidebar ${open ? "mobile-show" : ""}`}>
      <div className="logo-area">
        <Link to="/" className="d-inline-flex align-items-center" onClick={closeMobile}>
          <span className="icon-shape bg-primary text-white rounded-2">M</span>
          <strong className="ms-2 text-dark">SGM</strong>
        </Link>
      </div>

      <nav className="pt-3">
        {menu.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="px-4 py-2 text-secondary small">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={closeMobile}
                className={`nav-link ${activePath === item.href ? "active" : ""}`}
              >
                <i className={`ti ${item.icon}`} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
