
import { createUser } from '../actions'

export default function CreateUserPage() {
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Criar Novo Usuário</h2>
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
        <form action={createUser} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              name="fullName"
              className="w-full p-3 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              className="w-full p-3 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              name="password"
              className="w-full p-3 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md"
          >
            Salvar Usuário
          </button>
        </form>
      </div>
    </div>
  )
}
