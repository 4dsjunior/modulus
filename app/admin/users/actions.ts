'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// Usamos a chave SERVICE_ROLE para ter poder total
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function getUsers() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) {
    console.error('Erro ao buscar usuários:', error)
    return { data: [], error }
  }
  return { data: users, error: null }
}

export async function getUserById(userId: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (error) {
    console.error('Erro ao buscar usuário:', error)
    return { data: null, error }
  }
  return { data: user, error: null }
}

export async function updateUser(userId: string, formData: FormData) {
  const email = formData.get('email') as string
  const fullName = formData.get('fullName') as string
  const password = formData.get('password') as string

  const userUpdateData: any = {
    email,
    user_metadata: { full_name: fullName },
  }

  if (password) {
    userUpdateData.password = password
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, userUpdateData)

  if (error) {
    console.error('Erro ao atualizar usuário:', error)
    return redirect(`/admin/users/edit/${userId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/users')
  redirect('/admin/users?success=Usuário atualizado com sucesso!')
}

export async function deleteUser(userId: string) {
  // Primeiro, remova as associações do usuário em `tenant_members`
  const { error: deleteMembersError } = await supabaseAdmin
    .from('tenant_members')
    .delete()
    .eq('user_id', userId)

  if (deleteMembersError) {
    console.error('Erro ao remover associações do usuário:', deleteMembersError)
    // Redirecionar com mensagem de erro
    return redirect('/admin/users?error=' + encodeURIComponent(deleteMembersError.message))
  }

  // Agora, delete o usuário do `auth.users`
  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (deleteUserError) {
    console.error('Erro ao excluir usuário:', deleteUserError)
    // Redirecionar com mensagem de erro
    return redirect('/admin/users?error=' + encodeURIComponent(deleteUserError.message))
  }

  revalidatePath('/admin/users')
  redirect('/admin/users?success=Usuário excluído com sucesso!')
}
