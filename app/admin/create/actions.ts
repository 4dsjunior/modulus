'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

// Aqui usamos a chave SERVICE_ROLE para ter poder total (burlar o RLS para criar contas)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function createTenant(formData: FormData) {
  const name = formData.get('companyName') as string
  const slug = formData.get('slug') as string
  const module_id = formData.get('module') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 1. Criar Usuário
  const { data: auth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: name }
  })
  if (authErr) { console.error(authErr); throw new Error('Erro ao criar usuário'); }

  // 2. Criar Tenant
  const { data: tenant, error: tenantErr } = await supabaseAdmin
   .from('tenants')
   .insert({ name, slug, status: 'active' })
   .select()
   .single()
  if (tenantErr) { console.error(tenantErr); throw new Error('Erro ao criar tenant'); }

  // 3. Vincular Membro (Owner)
  await supabaseAdmin.from('tenant_members').insert({
    tenant_id: tenant.id, user_id: auth.user.id, role: 'owner'
  })

  // 4. Ativar Módulo
  await supabaseAdmin.from('tenant_modules').insert({
    tenant_id: tenant.id, module_id, is_enabled: true
  })

  redirect('/login?created=true')
}