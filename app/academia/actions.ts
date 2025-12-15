'use server';

import { createClient } from '@/app/utils/supabase/server';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

// =================================================================
// DEFINIÇÕES DE TIPOS
// =================================================================

export interface NewStudentData {
  nome: string;
  whatsapp: string;
  data_vencimento: string; 
  mensalidade: number;
  modalidade: string | string[];
  classes_per_week: string;
  gender: 'Masculino' | 'Feminino';
}

export interface ViewFinancialAudit {
  student_id: string;
  student_name: string;
  whatsapp: string;
  modalidade: string | string[];
  valor_esperado: number;
  data_vencimento: string;
  payment_id: string | null;
  valor_pago: number | null;
  payment_status: string | null;
  data_pagamento: string | null;
  status_financeiro: 'pago' | 'analise' | 'atrasado' | 'aberto';
}

export interface FinancialAudit {
  student_id: string;
  student_name: string;
  student_whatsapp: string;
  due_date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'open';
  payment_id: string | null;
}

export interface PendingPayment {
  id: string;
  student_id: string;
  nome_aluno: string;
  whatsapp: string;
  valor: number;
  data_pagamento: string;
  status: 'pago' | 'analise' | 'atrasado' | 'aberto';
  modalidade: string | string[]; // Adicionado: Modalidade do aluno para exibição na lista de pendências
}


export interface DashboardStats {
  annualRevenue: number;
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

export interface SimpleStudent {
  id: string;
  nome: string;
  mensalidade: number;
  modalidade: string | string[];
  data_vencimento: string;
}

// =================================================================
// UTILITÁRIOS
// =================================================================

async function getTenantId(): Promise<string | null> {
  const supabase = await createClient(); 
  const { data: { user } } = await supabase.auth.getUser(); 

  if (!user) return null;
  
  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  return member?.tenant_id || null;
}

// =================================================================
// SERVER ACTIONS
// =================================================================

export async function getFinancialAudit(): Promise<FinancialAudit[]> {
  noStore(); // Desativa o cache para esta função
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('financial_audit_current_month')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('data_vencimento', { ascending: true });

  if (error) {
    console.error("Erro ao buscar auditoria financeira:", JSON.stringify(error, null, 2));
    return [];
  }
  
  const mappedData: FinancialAudit[] = data.map((item: ViewFinancialAudit) => ({
    student_id: item.student_id,
    student_name: item.student_name,
    student_whatsapp: item.whatsapp,
    due_date: item.data_vencimento,
    amount: item.valor_pago ?? item.valor_esperado,
    status: item.status_financeiro === 'pago' ? 'paid'
          : item.status_financeiro === 'analise' ? 'pending'
          : item.status_financeiro === 'atrasado' ? 'overdue'
          : 'open',
    payment_id: item.payment_id
  }));
  
  return mappedData;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  noStore(); // Desativa o cache para esta função
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { annualRevenue: 0, totalStudents: 0, monthlyExpected: 0, monthlyReceived: 0, pendingPayments: [] };
  }

  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1).toISOString();

  const studentsPromise = supabase.from('students').select('mensalidade').eq('tenant_id', tenantId).eq('status', 'active');
  const monthlyPaymentsPromise = supabase.from('payments').select('valor').eq('tenant_id', tenantId).eq('status', 'approved').gte('validated_at', startOfMonth).lt('validated_at', startOfNextMonth);
  const annualPaymentsPromise = supabase.from('payments').select('valor').eq('tenant_id', tenantId).eq('status', 'approved').gte('validated_at', startOfYear).lt('validated_at', startOfNextYear);
  const pendingPaymentsPromise = supabase.from('financial_audit_current_month').select('*').eq('tenant_id', tenantId).in('status_financeiro', ['analise', 'atrasado']);

  const [
    { data: studentsData, error: studentsError },
    { data: monthlyPaymentsData, error: monthlyPaymentsError },
    { data: annualPaymentsData, error: annualPaymentsError },
    { data: pendingPaymentsData, error: pendingPaymentsError },
  ] = await Promise.all([studentsPromise, monthlyPaymentsPromise, annualPaymentsPromise, pendingPaymentsPromise]);

  if (studentsError) console.error("Erro ao buscar alunos:", JSON.stringify(studentsError, null, 2));
  if (monthlyPaymentsError) console.error("Erro ao buscar pagamentos mensais:", JSON.stringify(monthlyPaymentsError, null, 2));
  if (annualPaymentsError) console.error("Erro ao buscar pagamentos anuais:", JSON.stringify(annualPaymentsError, null, 2));
  if (pendingPaymentsError) console.error("Erro ao buscar pagamentos pendentes:", JSON.stringify(pendingPaymentsError, null, 2));

  const totalStudents = studentsData?.length || 0;
  const monthlyExpected = (studentsData || []).reduce((sum, s) => sum + (s.mensalidade || 0), 0);
  const monthlyReceived = (monthlyPaymentsData || []).reduce((sum, p) => sum + (p.valor || 0), 0);
  const annualRevenue = (annualPaymentsData || []).reduce((sum, p) => sum + (p.valor || 0), 0);
  
  const pendingPayments: PendingPayment[] = (pendingPaymentsData as ViewFinancialAudit[] || []).map(item => ({
    id: item.payment_id ?? `late_${item.student_id}`,
    student_id: item.student_id,
    nome_aluno: item.student_name,
    whatsapp: item.whatsapp,
    valor: item.valor_pago ?? item.valor_esperado,
    data_pagamento: item.data_pagamento ?? item.data_vencimento,
    status: item.status_financeiro,
    modalidade: item.modalidade, // Adicionado a modalidade
  }));
  
  return { annualRevenue, totalStudents, monthlyExpected, monthlyReceived, pendingPayments };
}

export async function getSegmentationData(): Promise<SegmentationCounts> {
  noStore(); // Desativa o cache para esta função
  const tenantId = await getTenantId();
  if (!tenantId) return { modalityFrequencyCounts: {}, modalityRevenueCounts: {} };
  
  const supabase = await createClient();
  const { data: students, error } = await supabase
    .from('students')
    .select('mensalidade, modalidade, classes_per_week, gender')
    .eq('tenant_id', tenantId)
    .eq('status', 'active'); 

  if (error) {
    console.error("Erro ao buscar dados de segmentação:", JSON.stringify(error, null, 2));
    return { modalityFrequencyCounts: {}, modalityRevenueCounts: {} };
  }

  const modalityFrequencyCounts: SegmentationCounts['modalityFrequencyCounts'] = {};
  const modalityRevenueCounts: SegmentationCounts['modalityRevenueCounts'] = {};

  (students || []).forEach((student: any) => {
    const fee = student.mensalidade || 0;
    const freq = student.classes_per_week || 'Não Informado';
    const gender = student.gender?.toLowerCase().startsWith('m') ? 'masc' : 'fem';
    
    let modalities: string[] = [];
    if (Array.isArray(student.modalidade)) {
        modalities = student.modalidade;
    } else if (typeof student.modalidade === 'string') {
        try {
            const parsed = JSON.parse(student.modalidade);
            modalities = Array.isArray(parsed) ? parsed : [student.modalidade];
        } catch (e) {
            modalities = [student.modalidade];
        }
    }
    
    if (modalities.length === 0) modalities.push('Não Informado');
    
    const apportionedRevenue = fee / modalities.length;

    modalities.forEach(mod => {
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
        modalityRevenueCounts[mod] = (modalityRevenueCounts[mod] || 0) + apportionedRevenue;
    });
  });

  return { modalityFrequencyCounts, modalityRevenueCounts };
}

export async function registerNewStudent(data: NewStudentData) {
  const tenantId = await getTenantId();
  if (!tenantId) {
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
      modalidade: Array.isArray(data.modalidade) ? JSON.stringify(data.modalidade) : data.modalidade,
      classes_per_week: data.classes_per_week,
      gender: data.gender,
      status: 'active',
    });

    if (error) throw error;
    
    revalidatePath(`/academia/${tenantId}/dashboard`);
    return { success: true, message: 'Aluno cadastrado com sucesso.' };
  } catch (e: any) {
    console.error("Erro ao registrar aluno:", JSON.stringify(e, null, 2));
    return { success: false, message: `Erro ao salvar no banco: ${e.message}` };
  }
}

export async function approvePayment(paymentId: string, studentId: string, amount: number) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, message: 'Academia não encontrada.' };

  const supabase = await createClient();
  
  try {
    if (paymentId.startsWith('late_')) {
      const { error: insertError } = await supabase.from('payments').insert({
        tenant_id: tenantId,
        student_id: studentId,
        valor: amount,
        status: 'approved',
        validated_at: new Date().toISOString(),
        data_pagamento: new Date().toISOString().split('T')[0],
      });
      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await supabase.from('payments')
        .update({ status: 'approved', validated_at: new Date().toISOString() })
        .eq('id', paymentId)
        .eq('tenant_id', tenantId);
      if (updateError) throw updateError;
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('data_vencimento')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;
    if (!student) throw new Error('Aluno não encontrado para atualizar vencimento.');

    const newDueDate = new Date(student.data_vencimento);
    newDueDate.setUTCDate(newDueDate.getUTCDate() + 30);
    const newDueDateISO = newDueDate.toISOString().split('T')[0];
    
    const { error: updateStudentError } = await supabase.from('students')
      .update({ data_vencimento: newDueDateISO })
      .eq('id', studentId);

    if (updateStudentError) throw updateStudentError;

    revalidatePath(`/academia/${tenantId}/dashboard`);
    return { success: true, message: 'Pagamento aprovado e vencimento atualizado.' };
  } catch (e: any) {
    console.error("Erro ao aprovar pagamento:", JSON.stringify(e, null, 2));
    return { success: false, message: `Erro ao processar aprovação: ${e.message}` };
  }
}

export async function getActiveStudentsList(search?: string): Promise<SimpleStudent[]> {
  noStore(); // Desativa o cache para esta função
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  const supabase = await createClient();
  let query = supabase
    .from('students')
    .select('id, nome, mensalidade, modalidade, data_vencimento')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('data_vencimento', { ascending: true })
    .limit(5);

  if (search && search.trim().length > 1) {
    query = query.ilike('nome', `%${search.trim()}%`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Erro ao buscar lista de alunos:", JSON.stringify(error, null, 2));
    return [];
  }
  return data;
}

export async function registerManualPayment(studentId: string, amount: number, modalidade?: string) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, message: 'Academia não encontrada.' };
  
  const supabase = await createClient();
  try {
    const { error: insertError } = await supabase.from('payments').insert({
      tenant_id: tenantId,
      student_id: studentId,
      valor: amount,
      status: 'approved',
      validated_at: new Date().toISOString(),
      data_pagamento: new Date().toISOString().split('T')[0],
      modalidade: modalidade,
    });

    if (insertError) throw insertError;
    
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('data_vencimento')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;
    if (!student) throw new Error('Aluno não encontrado para atualizar vencimento.');

    const newDueDate = new Date(student.data_vencimento);
    newDueDate.setUTCDate(newDueDate.getUTCDate() + 30);
    const newDueDateISO = newDueDate.toISOString().split('T')[0];
    
    const { error: updateStudentError } = await supabase.from('students')
      .update({ data_vencimento: newDueDateISO })
      .eq('id', studentId);

    if (updateStudentError) throw updateStudentError;

    revalidatePath(`/academia/${tenantId}/dashboard`);
    return { success: true, message: 'Pagamento manual registrado com sucesso.' };
  } catch (e: any) {
    console.error("Erro ao registrar pagamento manual:", JSON.stringify(e, null, 2));
    return { success: false, message: `Erro ao processar pagamento: ${e.message}` };
  }
}