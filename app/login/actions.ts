'use server'

import { createClient } from '../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // 1. Autenticar
  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return redirect('/login?error=invalid_credentials')
  }

  // ==============================================================
  // 2. VERIFICAÇÃO DE SUPER ADMIN (O Passo que Faltava)
  // ==============================================================
  
  // Buscamos o perfil para saber se é o dono do SaaS
  const { data: profile } = await supabase
   .from('profiles')
   .select('is_super_admin')
   .single()

  // Se for Super Admin, vai direto para o painel de criação
  if (profile && profile.is_super_admin) {
    return redirect('/admin/users')
  }

  // ==============================================================
  // 3. FLUXO DE CLIENTE COMUM (Roteamento Inteligente)
  // ==============================================================
  
  const { data: rawMember } = await supabase
   .from('tenant_members')
   .select(`
      tenant_id,
      tenants (
        slug,
        tenant_modules (
          module_id
        )
      )
    `)
   .maybeSingle()

  const member: any = rawMember

  // Se não for Admin e não tiver empresa, aí sim é erro
  if (!member || !member.tenants) {
    return redirect('/login?error=no_tenant') 
  }

  // Tratamento de dados (Arrays vs Objetos)
  let tenantData = member.tenants
  if (Array.isArray(tenantData)) {
    tenantData = tenantData[0]
  }

  const slug = tenantData.slug
  let activeModule = 'core'

  const modules = tenantData.tenant_modules

  if (modules) {
    if (Array.isArray(modules)) {
      if (modules.length > 0) {
        activeModule = modules[0].module_id
      }
    } else {
      if (modules.module_id) {
        activeModule = modules.module_id
      }
    }
  }

  // 4. Redirecionamento Final do Cliente
  return redirect(`/${activeModule}/${slug}/dashboard`)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/login')
}