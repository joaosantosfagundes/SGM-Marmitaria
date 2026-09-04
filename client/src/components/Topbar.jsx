import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Topbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const content = document.getElementById("content");
    const overlay = document.getElementById("mobile-overlay");

    if (window.innerWidth <= 992) {
      sidebar?.classList.toggle("mobile-show");
      overlay?.classList.toggle("show");
      return;
    }

    sidebar?.classList.toggle("collapsed");
    content?.classList.toggle("full");
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav id="topbar" className="navbar bg-white border-bottom fixed-top topbar px-3">
      <button
        type="button"
        className="btn btn-light btn-icon btn-sm"
        onClick={toggleSidebar}
        aria-label="Alternar menu"
      >
        <i className="ti ti-layout-sidebar-left-expand" />
      </button>

      <div className="ms-auto position-relative">
        <button
          type="button"
          className="btn btn-light btn-icon btn-sm rounded-circle"
          onClick={() => setProfileOpen((value) => !value)}
          aria-label="Perfil"
        >
          <i className="ti ti-user" />
        </button>

        {profileOpen && (
          <div className="dropdown-menu dropdown-menu-end show position-absolute end-0 mt-2 p-0">
            <div className="px-3 py-3 border-bottom">
              <strong>{usuario?.nome ?? "Usuário"}</strong>
              <div className="small text-secondary">{usuario?.perfil ?? "-"}</div>
            </div>
            <button type="button" className="dropdown-item py-2" onClick={handleLogout}>
              Sair
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
