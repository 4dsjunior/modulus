'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { isSuperAdmin } from '../../utils/supabase/server';

// Aqui usamos a chave SERVICE_ROLE para ter poder total (burlar o RLS para criar contas)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function createTenant(formData: FormData) {
  const isAdmin = await isSuperAdmin();
  if (!isAdmin) {
    throw new Error("Acesso não autorizado.");
  }

  const name = formData.get('companyName') as string
  const slug = formData.get('slug') as string
  const module_id = formData.get('module') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Validação de dados
  if (!name || !/.{3,}/.test(name)) {
    throw new Error("Nome da empresa inválido. Mínimo 3 caracteres.");
  }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug inválido. Use apenas letras minúsculas, números e hifens.");
  }
  if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    throw new Error("E-mail inválido.");
  }
  if (!password || !/.{6,}/.test(password)) {
    throw new Error("Senha inválida. Mínimo 6 caracteres.");
  }

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

export async function getUserForEditing(id: string) {
  const isAdmin = await isSuperAdmin();
  if (!isAdmin) {
    return { error: "Acesso não autorizado." };
  }
  
  const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(id);

  if (error) {
    console.error("Erro ao buscar usuário:", error.message);
    return { error: "Usuário não encontrado ou falha na busca." };
  }

  return {
    id: user.user.id,
    email: user.user.email,
    full_name: user.user.user_metadata.full_name,
  };
}