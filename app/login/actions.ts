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

  // 2. Verificar Roteamento Inteligente
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

  if (!member || !member.tenants) {
    return redirect('/login?error=no_tenant') 
  }

  // 3. Extração de Dados
  
  // Garante que 'tenantData' seja um Objeto único
  let tenantData = member.tenants
  if (Array.isArray(tenantData)) {
    tenantData = tenantData[0] // Pega o primeiro se for array
  }

  const slug = tenantData.slug
  let activeModule = 'core'

  // Lógica do Módulo (CORREÇÃO DO ERRO DE ARRAY)
  const modules = tenantData.tenant_modules

  if (modules) {
    if (Array.isArray(modules)) {
      // SE FOR LISTA: Pega o primeiro item com [0]
      if (modules.length > 0) {
        activeModule = modules[0].module_id
      }
    } else {
      // SE FOR OBJETO: Acessa direto
      if (modules.module_id) {
        activeModule = modules.module_id
      }
    }
  }

  // 4. Redirecionamento Final
  return redirect(`/${activeModule}/${slug}/dashboard`)
}