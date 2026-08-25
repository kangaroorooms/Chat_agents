import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <aside className="app-sidebar">
          <Sidebar />
        </aside>
        <main className="app-content">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </div>
  )
}
