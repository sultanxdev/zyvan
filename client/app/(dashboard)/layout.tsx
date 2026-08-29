import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--bg-base)' }}>
      <Sidebar />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
