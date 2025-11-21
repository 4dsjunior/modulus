
import { updateUser, getUserById } from '../../../actions'
import Link from 'next/link'

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const { data: user, error } = await getUserById(params.id)

  if (error || !user) {
    return <div>Usuário não encontrado ou erro ao carregar: {error?.message}</div>
  }

  const updateUserWithId = updateUser.bind(null, user.id)

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Editar Usuário</h2>
        <Link href="/admin/users" className="text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
        <form action={updateUserWithId} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              name="fullName"
              className="w-full p-3 border border-slate-300 rounded-lg"
              defaultValue={user.user_metadata.full_name}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              className="w-full p-3 border border-slate-300 rounded-lg"
              defaultValue={user.email}
              required
            />
          </div>
          <p className="text-sm text-slate-500">
            Deixe a senha em branco para não a alterar.
          </p>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nova Senha</label>
            <input
              type="password"
              name="password"
              className="w-full p-3 border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md"
          >
            Atualizar Usuário
          </button>
        </form>
      </div>
    </div>
  )
}
