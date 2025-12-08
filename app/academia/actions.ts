import 'server-only';
import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';
// NOTE: O 'createClient' do lado do servidor no Modulus deve ser chamado sem argumentos
// dentro de Server Actions, pois ele lida com os cookies internamente.

// =================================================================
// DEFINIÇÕES DE TIPOS (Type Definitions)
// =================================================================

export interface NewStudentData {
  nome: string;
  whatsapp: string;
  data_vencimento: string; 
  mensalidade: number;
  modalidade: string;
  classes_per_week: string;
  gender: 'Masculino' | 'Feminino';
}

export interface PendingPayment {
  id: string;
  student_id: string;
  nome_aluno: string; 
  whatsapp: string;
  valor: number;
  data_pagamento: string;
}

export interface DashboardStats {
  annualRevenue: number;
  nextMonthForecast: number;
  totalStudents: number;
  monthlyExpected: number;
  monthlyReceived: number;
  pendingPayments: PendingPayment[];
}

export interface SegmentationCounts {
    // Corrigido o tipo para refletir a estrutura aninhada
    modalityFrequencyCounts: { [modality: string]: { total: number; [frequency: string]: { masc: number; fem: number; total: number } } };
    modalityRevenueCounts: { [modality: string]: number };
}


// =================================================================
// FUNÇÕES DE UTILIDADE (Utility Functions)
// =================================================================

/**
 * Obtém o ID do Tenant (Academia) associado ao usuário logado.
 * Redireciona para o login se não estiver autenticado.
 */
async function getTenantId(): Promise<string | null> {
  // CORREÇÃO 1: 'createClient' chamado sem argumento.
  const supabase = createClient(); 

  // CORREÇÃO 2: AWAIT na chamada 'supabase.auth.getUser()'
  const { data: { user } } = await supabase.auth.getUser(); 

  if (!user) {
    redirect('/login');
  }
  
  const tenants = user.app_metadata.tenants as string[] | undefined;
  
  if (tenants && tenants.length > 0) {
    return tenants[0];
  }

  return null;
}

// =================================================================
// SERVER ACTIONS (Database Manipulation)
// =================================================================

/**
 * 1. Cadastra um novo aluno.
 */
export async function registerNewStudent(data: NewStudentData) {
  const tenantId = await getTenantId();

  if (!tenantId) {
    return { success: false, message: 'Usuário não tem Academia (Tenant) associada.' };
  }

  const supabase = createClient();

  try {
    // CORREÇÃO 3: AWAIT na chamada '.insert()'
    const { error } = await supabase 
      .from('students')
      .insert({
        tenant_id: tenantId,
        nome: data.nome,
        whatsapp: data.whatsapp,
        data_vencimento: data.data_vencimento,
        mensalidade: data.mensalidade,
        modalidade: data.modalidade,
        classes_per_week: data.classes_per_week,
        gender: data.gender,
        status: 'active',
      });

    if (error) {
      console.error('Erro ao cadastrar aluno:', error);
      return { success: false, message: `Erro no banco de dados: ${error.message}` };
    }

    return { success: true, message: 'Aluno cadastrado com sucesso.' };
  } catch (e) {
    return { success: false, message: 'Erro interno do servidor.' };
  }
}

/**
 * 2. Aprova um pagamento e atualiza o vencimento do aluno.
 */
export async function approvePayment(paymentId: string, studentId: string, amount: number) {
  const tenantId = await getTenantId();

  if (!tenantId) {
    return { success: false, message: 'Usuário não tem Academia (Tenant) associada.' };
  }

  const supabase = createClient();
  
  try {
    // 1. Atualizar o status do Pagamento para 'approved'
    // CORREÇÃO 4: AWAIT na chamada '.update()'
    const { error: paymentError } = await supabase 
      .from('payments')
      .update({
        status: 'approved',
        validated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .eq('tenant_id', tenantId);

    if (paymentError) {
      console.error('Erro ao aprovar pagamento:', paymentError);
      return { success: false, message: `Erro ao atualizar pagamento: ${paymentError.message}` };
    }
    
    // 2. Buscar aluno para obter a data de vencimento atual
    // CORREÇÃO 5: AWAIT na chamada '.select().single()'
    const { data: student, error: studentFetchError } = await supabase 
      .from('students')
      .select('data_vencimento')
      .eq('id', studentId)
      .single();

    if (studentFetchError || !student) {
      console.error('Erro ao buscar aluno para atualização:', studentFetchError);
      return { success: false, message: 'Aluno não encontrado para atualizar vencimento.' };
    }

    const currentDueDate = new Date(student.data_vencimento);
    const newDueDate = new Date(currentDueDate);
    newDueDate.setDate(newDueDate.getDate() + 30);
    
    const newDueDateISO = newDueDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 3. Atualizar a data de vencimento do aluno
    // CORREÇÃO 6: AWAIT na chamada '.update()'
    const { error: updateError } = await supabase 
      .from('students')
      .update({ data_vencimento: newDueDateISO })
      .eq('id', studentId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Erro ao atualizar vencimento:', updateError);
      return { success: false, message: `Erro ao atualizar vencimento: ${updateError.message}` };
    }

    return { success: true, message: 'Pagamento aprovado e vencimento atualizado.' };
    
  } catch (e) {
    return { success: false, message: 'Erro interno do servidor.' };
  }
}

/**
 * 3. Busca todos os dados consolidados para o Dashboard.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const tenantId = await getTenantId();

  if (!tenantId) {
    return {
      annualRevenue: 0,
      nextMonthForecast: 0,
      totalStudents: 0,
      monthlyExpected: 0,
      monthlyReceived: 0,
      pendingPayments: [],
    } as DashboardStats;
  }

  const supabase = createClient();
  const now = new Date();
  
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const currentYear = now.getFullYear();
  
  const promises: Promise<any>[] = [];

  // P1: Total de Alunos e Faturamento Potencial
  promises.push(
    supabase
      .from('students')
      .select('id, mensalidade, data_vencimento, modalidade, classes_per_week, gender')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
  );

  // P2: Pagamentos Pendentes (JOIN para obter dados do Aluno)
  promises.push(
    supabase
      .from('payments')
      .select(`
        id,
        student_id,
        valor,
        data_pagamento,
        student:students ( nome, whatsapp )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
  );

  // P3: Receita Mensal Recebida (Aprovados este mês)
  promises.push(
    supabase
      .from('payments')
      .select('valor')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .gte('validated_at', startOfCurrentMonth) 
      .lt('validated_at', startOfNextMonth) 
  );

  // P4: Receita Anual Acumulada (Aprovados este ano)
  promises.push(
    supabase
      .from('payments')
      .select('valor')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .gte('validated_at', `${currentYear}-01-01T00:00:00Z`)
      .lt('validated_at', `${currentYear + 1}-01-01T00:00:00Z`)
  );

  // CORREÇÃO 7: AWAIT em Promise.all para resolver todas as consultas
  const [
    { data: studentsData, error: studentsError },
    { data: pendingPaymentsData, error: pendingPaymentsError },
    { data: monthlyReceivedData, error: monthlyReceivedError },
    { data: annualRevenueData, error: annualRevenueError },
  ] = await Promise.all(promises);

  if (studentsError || pendingPaymentsError || monthlyReceivedError || annualRevenueError) {
    console.error('Erro ao buscar dados do dashboard:', studentsError || pendingPaymentsError || monthlyReceivedData || annualRevenueError);
    return {
      annualRevenue: 0,
      nextMonthForecast: 0,
      totalStudents: 0,
      monthlyExpected: 0,
      monthlyReceived: 0,
      pendingPayments: [],
    } as DashboardStats;
  }

  // =================================================================
  // CONSOLIDAÇÃO DOS DADOS (Tipagem explícita para eliminar erros 'any' implícito)
  // =================================================================

  const totalStudents = studentsData?.length || 0;
  
  // TIPAGEM CORRIGIDA para reducer
  const nextMonthForecast = studentsData?.reduce((sum: number, student: { mensalidade: number }) => sum + student.mensalidade, 0) || 0; 

  // TIPAGEM CORRIGIDA para reducer
  const monthlyReceived = monthlyReceivedData?.reduce((sum: number, payment: { valor: number }) => sum + payment.valor, 0) || 0; 

  // TIPAGEM CORRIGIDA para reducer
  const annualRevenue = annualRevenueData?.reduce((sum: number, payment: { valor: number }) => sum + payment.valor, 0) || 0; 

  const monthlyExpected = studentsData
    ? studentsData
      .filter(student => {
        const dueDate = new Date(student.data_vencimento);
        // Filtra para datas de vencimento neste mês
        return dueDate.getFullYear() === now.getFullYear() && dueDate.getMonth() === now.getMonth();
      })
      // TIPAGEM CORRIGIDA para reducer
      .reduce((sum: number, student: { mensalidade: number }) => sum + student.mensalidade, 0) 
    : 0;

  const pendingPayments = pendingPaymentsData
    ? pendingPaymentsData.map(p => ({
      id: p.id,
      student_id: p.student_id,
      // TIPAGEM CORRIGIDA para acessar o JOIN (p.student)
      nome_aluno: (p.student as { nome: string; whatsapp: string; }).nome, 
      whatsapp: (p.student as { nome: string; whatsapp: string; }).whatsapp, 
      valor: p.valor,
      data_pagamento: p.data_pagamento,
    }))
    : [];

  return {
    annualRevenue,
    nextMonthForecast,
    totalStudents,
    monthlyExpected,
    monthlyReceived,
    pendingPayments,
  };
}

/**
 * 4. Busca dados brutos de alunos e calcula as contagens de segmentação.
 */
export async function getSegmentationData(): Promise<SegmentationCounts> {
  const tenantId = await getTenantId();

  if (!tenantId) {
    return { modalityFrequencyCounts: {}, modalityRevenueCounts: {} };
  }
  
  const supabase = createClient();

  // CORREÇÃO 8: AWAIT na chamada '.select()'
  const { data: students, error } = await supabase 
    .from('students')
    .select('mensalidade, modalidade, classes_per_week, gender')
    .eq('tenant_id', tenantId)
    .eq('status', 'active'); 

  if (error) {
    console.error("Erro ao buscar dados de segmentação:", error);
    return { modalityFrequencyCounts: {}, modalityRevenueCounts: {} };
  }

  let modalityFrequencyCounts: SegmentationCounts['modalityFrequencyCounts'] = {};
  let modalityRevenueCounts: SegmentationCounts['modalityRevenueCounts'] = {};

  // TIPAGEM CORRIGIDA para o forEach
  students.forEach((student: { mensalidade: number, modalidade: string, classes_per_week: string, gender: string }) => {
    const monthlyFee = student.mensalidade || 0; 
    const mod = student.modalidade || 'Não Informado';
    const freq = student.classes_per_week || 'Não Informado';
    const genderNormalized = student.gender && student.gender.toLowerCase().startsWith('m') ? 'masc' : 'fem';
    
    if (!modalityFrequencyCounts[mod]) {
      modalityFrequencyCounts[mod] = { total: 0 }; 
    }
    
    // Acessa o tipo corrigido e garante que os campos sejam inicializados
    const modEntry = modalityFrequencyCounts[mod] as { total: number; [key: string]: { masc: number; fem: number; total: number } };

    if (!modEntry[freq]) {
      modEntry[freq] = { masc: 0, fem: 0, total: 0 };
    }
    
    modEntry.total += 1;
    modEntry[freq].total += 1;
    modEntry[freq][genderNormalized] += 1;
    
    // Faturamento Potencial
    modalityRevenueCounts[mod] = (modalityRevenueCounts[mod] || 0) + monthlyFee;
  });

  return {
    modalityFrequencyCounts,
    modalityRevenueCounts,
  };
}