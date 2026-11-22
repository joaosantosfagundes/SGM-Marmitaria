import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import BotaoAjuda from "./BotaoAjuda.jsx";

export default function Topbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const perfilRef = useRef(null);
  const botaoPerfilRef = useRef(null);
  const perfilId = useId();
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const nome = usuario?.nome?.trim() || "Usuário";
  const partesNome = nome.split(/\s+/);
  const iniciais = (partesNome[0][0] + (partesNome.length > 1 ? partesNome.at(-1)[0] : "")).toLocaleUpperCase("pt-BR");

  useEffect(() => {
    if (!profileOpen) return;

    function fecharAoSair(event) {
      if (!perfilRef.current?.contains(event.target)) setProfileOpen(false);
    }
    function fecharAoTeclar(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setProfileOpen(false);
        botaoPerfilRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", fecharAoSair);
    document.addEventListener("focusin", fecharAoSair);
    document.addEventListener("keydown", fecharAoTeclar);
    return () => {
      document.removeEventListener("pointerdown", fecharAoSair);
      document.removeEventListener("focusin", fecharAoSair);
      document.removeEventListener("keydown", fecharAoTeclar);
    };
  }, [profileOpen]);

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
    <nav id="topbar" className="navbar border-bottom fixed-top topbar px-3">
      <button
        type="button"
        className="btn btn-light btn-icon btn-sm"
        onClick={toggleSidebar}
        aria-label="Alternar menu"
        data-tour="menu-alternar"
      >
        <i className="ti ti-layout-sidebar-left-expand" />
      </button>

      <div className="ms-auto d-flex align-items-center gap-2">
        <BotaoAjuda />
        <div className="position-relative" ref={perfilRef}>
          <button
            ref={botaoPerfilRef}
            type="button"
            className="btn topbar-perfil d-inline-flex align-items-center gap-2"
            onClick={() => setProfileOpen((value) => !value)}
            aria-label="Perfil"
            data-tour="perfil"
            aria-expanded={profileOpen}
            aria-controls={profileOpen ? perfilId : undefined}
          >
            <span className="topbar-nome text-truncate">{nome}</span>
            <span className="topbar-avatar" aria-hidden="true">{iniciais}</span>
          </button>

          {profileOpen && (
            <div id={perfilId} className="dropdown-menu dropdown-menu-end show position-absolute top-100 end-0 mt-2 p-0">
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
      </div>
    </nav>
  );
}
