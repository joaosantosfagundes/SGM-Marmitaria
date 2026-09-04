import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }) {
  return (
    <>
      <Sidebar />
      <Topbar />
      <div id="mobile-overlay" className="mobile-overlay" />
      <main id="content" className="content py-4">
        <div className="container-fluid">{children}</div>
      </main>
    </>
  );
}
