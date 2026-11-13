import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getPageByPath, menu } from "../lib/menu.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { usuario } = useAuth();
  const location = useLocation();
  const activePath = location.pathname;
  const navRef = useRef(null);
  const gruposVisiveis = menu.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const perfis = getPageByPath(item.href)?.perfis;
      return !perfis || perfis.includes(usuario?.perfil);
    }),
  })).filter(group => group.items.length);

  useEffect(() => {
    navRef.current?.querySelector(".nav-link.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activePath]);

  function closeMobile() {
    setOpen(false);
    document.getElementById("sidebar")?.classList.remove("mobile-show");
    document.getElementById("mobile-overlay")?.classList.remove("show");
  }

  return (
    <aside id="sidebar" data-tour="menu-lateral" className={`sidebar ${open ? "mobile-show" : ""}`}>
      <div className="logo-area">
        <Link to="/" className="d-inline-flex align-items-center" onClick={closeMobile}>
          <span className="sidebar-marca">M</span>
          <strong className="ms-2">SGM</strong>
        </Link>
      </div>

      <nav className="pt-3" ref={navRef}>
        {gruposVisiveis.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="sidebar-grupo">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                data-tour={`menu-${item.href.slice(1) || "dashboard"}`}
                onClick={closeMobile}
                aria-label={item.label}
                aria-current={activePath === item.href ? "page" : undefined}
                title={item.label}
                className={`nav-link ${activePath === item.href ? "active" : ""}`}
              >
                <i className={`ti ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
