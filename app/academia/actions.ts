'use server';

import { createClient } from '@/app/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// =================================================================
// DEFINIÇÕES DE TIPOS
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
    modalityFrequencyCounts: { 
        [modality: string]: { 
            total: number; 
            [frequency: string]: { masc: number; fem: number; total: number } | number;
        } 
    };
    modalityRevenueCounts: { [modality: string]: number };
}

// =================================================================
// UTILITÁRIOS
// =================================================================

async function getTenantId(): Promise<string | null> {
  const supabase = await createClient(); 
  const { data: { user } } = await supabase.auth.getUser(); 

  if (!user) return null;
  
  // 1. Tenta pegar dos metadados (mais rápido)
  const tenantsMetadata = user.app_metadata.tenants as string[] | undefined;
  if (tenantsMetadata && tenantsMetadata.length > 0) return tenantsMetadata[0];

  // 2. Fallback: Busca na tabela tenant_members
  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (member) return member.tenant_id;

  return null;
}

// =================================================================
// SERVER ACTIONS
// =================================================================

export async function registerNewStudent(data: NewStudentData) {
  console.log("SERVER ACTION: Iniciando registro de aluno...", data); // DEBUG LOG
  
  const tenantId = await getTenantId();
  console.log("SERVER ACTION: Tenant ID encontrado:", tenantId); // DEBUG LOG

  if (!tenantId) {
    console.error("SERVER ACTION ERRO: Tenant ID não encontrado para o usuário.");
    return { success: false, message: 'Erro de permissão: Academia não identificada.' };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.from('students').insert({
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
      console.error("SERVER ACTION ERRO SUPABASE:", error); // DEBUG LOG
      throw error;
    }
    
    console.log("SERVER ACTION: Sucesso! Revalidando caminho...");
    revalidatePath(`/academia/${tenantId}/dashboard`);
    return { success: true, message: 'Aluno cadastrado com sucesso.' };
  } catch (e: any) {
    console.error("SERVER ACTION EXCEPTION:", e);
    return { success: false, message: `Erro ao salvar no banco: ${e.message}` };
  }
}

export async function approvePayment(paymentId: string, studentId: string, amount: number) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, message: 'Academia não encontrada.' };

  const supabase = await createClient();
  
  try {
    // 1. Aprovar pagamento
    const { error: paymentError } = await supabase.from('payments')
      .update({ status: 'approved', validated_at: new Date().toISOString() })
      .eq('id', paymentId).eq('tenant_id', tenantId);

    if (paymentError) throw paymentError;
    
    // 2. Buscar vencimento atual
    const { data: student } = await supabase.from('students')
      .select('data_vencimento').eq('id', studentId).single();

    if (!student) throw new Error('Aluno não encontrado');

    // 3. Somar 30 dias
    const newDueDate = new Date(student.data_vencimento);
    newDueDate.setDate(newDueDate.getDate() + 30);
    const newDueDateISO = newDueDate.toISOString().split('T')[0];
    
    // 4. Atualizar aluno
    const { error: updateError } = await supabase.from('students')
      .update({ data_vencimento: newDueDateISO })
      .eq('id', studentId).eq('tenant_id', tenantId);

    if (updateError) throw updateError;

    revalidatePath(`/academia/${tenantId}/dashboard`);
    return { success: true, message: 'Pagamento aprovado e vencimento atualizado.' };
  } catch (e) {
    return { success: false, message: 'Erro ao processar aprovação.' };
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const tenantId = await getTenantId();

  if (!tenantId) {
    return { annualRevenue: 0, nextMonthForecast: 0, totalStudents: 0, monthlyExpected: 0, monthlyReceived: 0, pendingPayments: [] };
  }

  const supabase = await createClient();
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const currentYear = now.getFullYear();
  
  const promises: any[] = [];

  // P1: Alunos Ativos
  promises.push(supabase.from('students').select('*').eq('tenant_id', tenantId).eq('status', 'active'));

  // P2: Pagamentos Pendentes
  promises.push(supabase.from('payments').select('*, student:students(nome, whatsapp)').eq('tenant_id', tenantId).eq('status', 'pending'));

  // P3: Receita Mensal
  promises.push(supabase.from('payments').select('valor').eq('tenant_id', tenantId).eq('status', 'approved').gte('validated_at', startOfCurrentMonth).lt('validated_at', startOfNextMonth));

  // P4: Receita Anual
  promises.push(supabase.from('payments').select('valor').eq('tenant_id', tenantId).eq('status', 'approved').gte('validated_at', `${currentYear}-01-01T00:00:00Z`).lt('validated_at', `${currentYear + 1}-01-01T00:00:00Z`));

  const results = await Promise.all(promises);
  
  const studentsData = results[0].data || [];
  const pendingPaymentsData = results[1].data || [];
  const monthlyReceivedData = results[2].data || [];
  const annualRevenueData = results[3].data || [];

  const totalStudents = studentsData.length;
  const nextMonthForecast = studentsData.reduce((sum: number, s: any) => sum + (s.mensalidade || 0), 0);
  const monthlyReceived = monthlyReceivedData.reduce((sum: number, p: any) => sum + (p.valor || 0), 0);
  const annualRevenue = annualRevenueData.reduce((sum: number, p: any) => sum + (p.valor || 0), 0);

  const monthlyExpected = studentsData
    .filter((s: any) => {
      const d = new Date(s.data_vencimento);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum: number, s: any) => sum + (s.mensalidade || 0), 0);

  const pendingPayments = pendingPaymentsData.map((p: any) => ({
    id: p.id,
    student_id: p.student_id,
    nome_aluno: p.student?.nome || 'Desconhecido',
    whatsapp: p.student?.whatsapp || '',
    valor: p.valor,
    data_pagamento: p.data_pagamento,
  }));

  return { annualRevenue, nextMonthForecast, totalStudents, monthlyExpected, monthlyReceived, pendingPayments };
}

export async function getSegmentationData(): Promise<SegmentationCounts> {
  const tenantId = await getTenantId();
  if (!tenantId) return { modalityFrequencyCounts: {}, modalityRevenueCounts: {} };
  
  const supabase = await createClient();
  const { data: students } = await supabase.from('students').select('*').eq('tenant_id', tenantId).eq('status', 'active'); 

  const modalityFrequencyCounts: SegmentationCounts['modalityFrequencyCounts'] = {};
  const modalityRevenueCounts: SegmentationCounts['modalityRevenueCounts'] = {};

  (students || []).forEach((student: any) => {
    const fee = student.mensalidade || 0;
    const mod = student.modalidade || 'Não Informado';
    const freq = student.classes_per_week || 'Não Informado';
    const gender = student.gender?.toLowerCase().startsWith('m') ? 'masc' : 'fem';
    
    if (!modalityFrequencyCounts[mod]) {
      modalityFrequencyCounts[mod] = { total: 0 } as any;
    }
    
    const modEntry = modalityFrequencyCounts[mod];
    
    if (!(modEntry as any)[freq]) {
      (modEntry as any)[freq] = { masc: 0, fem: 0, total: 0 };
    }
    
    modEntry.total += 1;
    (modEntry as any)[freq].total += 1;
    (modEntry as any)[freq][gender] += 1;
    
    modalityRevenueCounts[mod] = (modalityRevenueCounts[mod] || 0) + fee;
  });

  return { modalityFrequencyCounts, modalityRevenueCounts };
}