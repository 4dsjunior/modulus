import { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Painel</h1>
        {/* Futuramente, pode ter um menu ou botão de sair aqui */}
      </header>
      <main className="p-8">
        {children}
      </main>
    </div>
  )
}
