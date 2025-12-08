import { ReactNode } from 'react'
import { logout } from '../login/actions'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Painel</h1>
        <form action={logout}>
          <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
            Sair
          </button>
        </form>
      </header>
      <main className="p-8">
        {children}
      </main>
    </div>
  )
}
