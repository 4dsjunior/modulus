import { cookies } from 'next/headers';
import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = cookies();
  
  // CORREÇÃO 1: Removida a passagem de 'cookieStore' para 'createClient()',
  // resolvendo o erro "Expected 0 arguments, but got 1."
  const supabase = await createClient(); 

  // 2. Verificar o usuário logado
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // 3. Se o usuário estiver logado, redireciona para o módulo Academia
    redirect('/academia');
  }

  // 4. Se o usuário não estiver logado, redireciona para a página de login
  redirect('/login');
}