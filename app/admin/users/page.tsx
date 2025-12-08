
import { getUsers, deleteUser } from './actions'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const { data: users, error } = await getUsers()

  if (error) {
    return <div className="text-red-500">Erro ao carregar usuários: {error.message}</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h2>
        <Link href="/admin/create" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition shadow-md">
          Novo Usuário
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-slate-600">Email</th>
              <th className="p-4 text-left text-sm font-semibold text-slate-600">Criado em</th>
              <th className="p-4 text-left text-sm font-semibold text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users?.map(user => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="p-4 text-slate-800">{user.email}</td>
                <td className="p-4 text-slate-600">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="p-4 flex gap-2">
                  <Link href={`/admin/users/edit/${user.id}`} className="text-blue-600 hover:underline">
                    Editar
                  </Link>
                  <form action={deleteUser.bind(null, user.id)}>
                    <button type="submit" className="text-red-600 hover:underline">
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
