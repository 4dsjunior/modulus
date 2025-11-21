
import { updateUser } from '../../actions'
import { createClient } from '@supabase/supabase-js'

// Inicializa o cliente Supabase para buscar os dados do usuário
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(id: string) {
  const { data, error } = await supabase.auth.admin.getUserById(id)
  if (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }
  return data.user
}

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id)

  if (!user) {
    return <div>Usuário não encontrado.</div>
  }

  // Bind da action para passar o ID do usuário
  const updateUserWithId = updateUser.bind(null, user.id)

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Editar Usuário</h2>
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
