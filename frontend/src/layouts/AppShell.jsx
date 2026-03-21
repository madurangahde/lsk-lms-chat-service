export default function AppShell({ topbar, sidebar, content }) {
  return (
    <div className="app-shell">
      {topbar}
      <div className="app-shell__body">
        <aside className="sidebar">{sidebar}</aside>
        <main className="content">{content}</main>
      </div>
    </div>
  );
}
