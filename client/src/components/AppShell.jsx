import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }) {
  return (
    <>
      <Sidebar />
      <Topbar />
      <div id="mobile-overlay" className="mobile-overlay" onClick={() => {
        document.getElementById("sidebar")?.classList.remove("mobile-show");
        document.getElementById("mobile-overlay")?.classList.remove("show");
      }} />
      <main id="content" className="content py-4">
        <div className="container-fluid">{children}</div>
      </main>
    </>
  );
}
