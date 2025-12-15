'use client';

import { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

import {
  registerNewStudent,
  approvePayment,
  getDashboardStats,
  getSegmentationData,
  getActiveStudentsList,
  registerManualPayment,
  type DashboardStats,
  type SegmentationCounts,
  type NewStudentData,
  type PendingPayment,
  type SimpleStudent,
} from '../../actions';

// =================================================================
// HOOKS
// =================================================================
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


// =================================================================
// CONFIGURAÇÕES VISUAIS & HELPERS
// =================================================================

const MODALITY_COLORS: Record<string, string> = {
  'Jiu-Jitsu': '#FF5722',
  'Crossfit': '#232F34',
  'Musculação': '#FF9800',
  'Yoga': '#6C757D',
  'Não Informado': '#E0E0E0'
};
const FREQUENCY_COLORS = ['#FF9800', '#232F34', '#4CAF50', '#FF5722', '#6C757D'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getCurrentMonthYear = () => {
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
};

const formatModalidade = (modalidade: string | string[] | undefined): string => {
  if (!modalidade) return 'Não Informado';
  if (Array.isArray(modalidade)) {
    return modalidade.join(', ');
  }
  if (typeof modalidade === 'string') {
    try {
      const parsed = JSON.parse(modalidade);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
    } catch (e) {
      // Not a JSON string, treat as simple string
    }
    return modalidade;
  }
  return 'Não Informado';
};


interface DashboardClientProps {
  tenantName: string;
  initialStats: DashboardStats;
  initialSegmentation: SegmentationCounts;
}

export default function DashboardClient({ 
  tenantName, 
  initialStats, 
  initialSegmentation,
}: DashboardClientProps) {
  
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // O estado agora é apenas um espelho das props iniciais e é atualizado pelo `useEffect`
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [segmentation, setSegmentation] = useState<SegmentationCounts>(initialSegmentation);
  
  useEffect(() => {
    setStats(initialStats);
    setSegmentation(initialSegmentation);
  }, [initialStats, initialSegmentation]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{ paymentId: string, studentId: string, amount: number } | null>(null);
  const [selectedModality, setSelectedModality] = useState<string | null>(null);

  const [studentsList, setStudentsList] = useState<SimpleStudent[]>([]);
  const [manualPaymentData, setManualPaymentData] = useState({ studentId: '', valor: 0, modalidade: '' });
  const [selectedStudentModalities, setSelectedStudentModalities] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchStudents = useCallback(async (search: string) => {
    setLoading(true);
    const list = await getActiveStudentsList(search);
    setStudentsList(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isPaymentModalOpen) {
      fetchStudents(debouncedSearchTerm);
    }
  }, [isPaymentModalOpen, debouncedSearchTerm, fetchStudents]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAction = (action: () => Promise<{success: boolean, message: string}>, modalToClose: () => void) => {
    setLoading(true);
    startTransition(async () => {
      const res = await action();
      if (res.success) {
        showMessage(res.message, 'success');
        modalToClose();
        // A chave para a atualização: router.refresh()
        // Isso re-executa a busca de dados no servidor (page.tsx) e atualiza as props.
        router.refresh(); 
      } else {
        showMessage(res.message, 'error');
      }
      setLoading(false);
    });
  };

  const confirmPayment = async () => {
    if (!confirmationAction) return;
    handleAction(
      () => approvePayment(confirmationAction.paymentId, confirmationAction.studentId, confirmationAction.amount),
      () => setIsConfirmationModalOpen(false)
    );
  };

  const handleRegister = async (data: NewStudentData) => {
    if (!data.nome || isNaN(data.mensalidade)) {
        showMessage("Preencha nome e mensalidade corretamente.", 'error');
        return;
    }
    handleAction(
      () => registerNewStudent(data),
      () => setIsRegistrationModalOpen(false)
    );
  };
  
  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPaymentData.studentId || manualPaymentData.valor <= 0) {
      showMessage("Selecione um aluno e insira um valor válido.", 'error');
      return;
    }
    if (selectedStudentModalities.length > 1 && !manualPaymentData.modalidade) {
      showMessage("Selecione a modalidade que está sendo paga.", 'error');
      return;
    }
    handleAction(
      () => registerManualPayment(manualPaymentData.studentId, manualPaymentData.valor, manualPaymentData.modalidade),
      () => {
        setIsPaymentModalOpen(false);
        setManualPaymentData({ studentId: '', valor: 0, modalidade: '' });
        setSelectedStudentModalities([]);
        setSearchTerm('');
      }
    );
  };

  const handleStudentSelectChange = (studentId: string) => {
    const student = studentsList.find(s => s.id === studentId);
    if (student) {
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
      if (modalities.length === 0) modalities.push('Geral');
      
      setSelectedStudentModalities(modalities);

      const apportionedValue = student.mensalidade / modalities.length;
      
      setManualPaymentData({ 
        studentId: student.id, 
        valor: modalities.length > 1 ? apportionedValue : student.mensalidade,
        modalidade: modalities.length === 1 ? modalities[0] : ''
      });
    }
  };

  const chartData = useMemo(() => {
    if (!segmentation) return { title: 'Carregando...', labels: [], data: [], colors: [], isRev: true };
    const counts = segmentation.modalityFrequencyCounts || {};
    const revs = segmentation.modalityRevenueCounts || {};

    if (selectedModality && counts[selectedModality]) {
      const modData = counts[selectedModality];
      const freqs = Object.keys(modData).filter(k => k !== 'total');
      return { 
        title: `Alunos: ${selectedModality}`,
        labels: freqs.map(f => `${f} Semana`),
        data: freqs.map(f => (modData as any)[f].total),
        colors: freqs.map((_, i) => FREQUENCY_COLORS[i % FREQUENCY_COLORS.length]),
        isRev: false
      };
    } else {
      const mods = Object.keys(revs);
      return {
        title: 'Faturamento por Modalidade',
        labels: mods,
        data: mods.map(m => revs[m]),
        colors: mods.map(m => MODALITY_COLORS[m] || MODALITY_COLORS['Não Informado']),
        isRev: true
      };
    }
  }, [segmentation, selectedModality]);

  const isLoading = isPending || loading;

  return (
    <div className={`max-w-4xl mx-auto px-6 pt-12 mt-8 pb-6 bg-white rounded-2xl shadow-xl font-['Quicksand'] relative transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
      
      {message && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
            message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
            <span className="text-2xl">{message.type === 'success' ? '✓' : '⚠'}</span>
            <div>
                <p className="font-bold">{message.type === 'success' ? 'Sucesso' : 'Atenção'}</p>
                <p className="text-sm opacity-90">{message.text}</p>
            </div>
            <button onClick={() => setMessage(null)} className="ml-4 text-white/50 hover:text-white">✕</button>
        </div>
      )}

      <header className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#232F34]">Painel Financeiro</h1>
          <p className="text-sm text-gray-500 mt-1">Unidade: <span className="font-semibold text-[#FF9800]">{tenantName}</span></p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => router.refresh()} disabled={isPending} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending ? '...' : '↻'}
           </button>
           <button onClick={() => setIsPaymentModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md transition">Receber</button>
           <button onClick={() => setIsRegistrationModalOpen(true)} className="bg-[#FF9800] text-white px-4 py-2 rounded-lg hover:bg-[#E68900] shadow-md transition">Novo Aluno</button>
           <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg px-3 py-2 transition">Sair</button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KpiCard title={`Esperado Mês (${getCurrentMonthYear()})`} value={isLoading ? '...' : formatCurrency(stats?.monthlyExpected || 0)} color="border-gray-300" />
        <KpiCard title={`Recebido Mês (${getCurrentMonthYear()})`} value={isLoading ? '...' : formatCurrency(stats?.monthlyReceived || 0)} color="border-green-400" />
        <KpiCard title="Alunos Ativos" value={isLoading ? '...' : (stats?.totalStudents || 0).toString()} color="border-blue-400" />
        <KpiCard title="Faturamento Anual" value={isLoading ? '...' : formatCurrency(stats?.annualRevenue || 0)} color="border-indigo-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <h3 className="font-bold text-lg mb-4 text-[#232F34]">Modalidades</h3>
          {isLoading ? <p className="text-gray-400">Carregando...</p> : 
           !segmentation?.modalityFrequencyCounts || Object.keys(segmentation.modalityFrequencyCounts).length === 0 ? <p>Sem dados.</p> : 
           Object.keys(segmentation.modalityFrequencyCounts).map(mod => (
             <div key={mod} onClick={() => setSelectedModality(selectedModality === mod ? null : mod)} 
                  className={`p-3 mb-2 cursor-pointer rounded-lg transition-all border ${selectedModality === mod ? 'bg-white border-[#FF9800] shadow-sm' : 'bg-white border-transparent hover:border-gray-200'}`}>
               <div className="flex justify-between font-semibold text-[#232F34]">
                 <span>{mod}</span>
                 <span className="text-[#FF9800]">{segmentation.modalityFrequencyCounts[mod].total} Alunos</span>
               </div>
             </div>
          ))}
          {selectedModality && <button onClick={() => setSelectedModality(null)} className="mt-2 text-sm text-gray-500 hover:text-[#FF9800]">Limpar filtro</button>}
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-center mb-4 text-[#232F34]">{chartData.title}</h3>
          <div className="flex-1 relative min-h-[250px]">
            <Doughnut data={{ labels: chartData.labels, datasets: [{ data: chartData.data, backgroundColor: chartData.colors, borderWidth: 0, hoverOffset: 10 }] }} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Quicksand' } } }, tooltip: { callbacks: { label: (ctx) => { const labelStr = ctx.label ? `${ctx.label}: ` : ''; const val = ctx.parsed; const suffix = chartData.isRev ? formatCurrency(val) : `${val} alunos`; return labelStr + suffix; } } } } }} />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 text-[#232F34]">Pagamentos Pendentes ({getCurrentMonthYear()})</h2>
      {isLoading ? <p className="text-sm text-gray-500">Analisando dados...</p> : !stats.pendingPayments || stats.pendingPayments.length === 0 ? (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 flex items-center">
          <span className="mr-2">✓</span> Nenhuma pendência encontrada para o mês atual.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#232F34] text-white uppercase tracking-wider text-xs">
              <tr>
                <th className="p-3">Aluno</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {stats.pendingPayments.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50 last:border-0">
                  <td className="p-3 font-semibold text-gray-800">
                    {item.nome_aluno}
                    <div className="text-xs text-gray-500 font-normal">
                      Modalidade: {formatModalidade(item.modalidade)}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">{new Date(item.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                  <td className="p-3 font-bold text-gray-700">{formatCurrency(item.valor)}</td>
                  <td className="p-3"><StatusBadge status={item.status} /></td>
                  <td className="p-3 text-right space-x-2">
                    {item.status === 'analise' && (
                      <button 
                        onClick={() => { setConfirmationAction({ paymentId: item.id, studentId: item.student_id, amount: item.valor }); setIsConfirmationModalOpen(true); }}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 font-semibold transition text-xs"
                      >
                        Aprovar
                      </button>
                    )}
                    {item.status === 'atrasado' && (
                      <a
                        href={`https://wa.me/${item.whatsapp}?text=Olá ${item.nome_aluno}, tudo bem? Notamos um atraso no seu pagamento da mensalidade no valor de ${formatCurrency(item.valor)}. Poderia verificar?`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 font-semibold transition text-xs"
                      >
                        Cobrar
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 text-[#232F34]">Registrar Pagamento Manual</h2>
            <form onSubmit={handleManualPaymentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Buscar Aluno</label>
                  <input
                    type="text"
                    placeholder="Digite o nome do aluno para buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Aluno</label>
                  <select
                    name="studentId"
                    value={manualPaymentData.studentId}
                    onChange={(e) => handleStudentSelectChange(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="" disabled>
                      {loading ? 'Buscando...' : 'Selecione um aluno'}
                    </option>
                    {studentsList.map(student => (
                      <option key={student.id} value={student.id}>{student.nome} - Venc: {new Date(student.data_vencimento).toLocaleDateString('pt-BR')}</option>
                    ))}
                  </select>
                </div>

                {selectedStudentModalities.length > 1 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Modalidade Paga</label>
                    <select
                      name="modalidade"
                      value={manualPaymentData.modalidade}
                      onChange={(e) => setManualPaymentData({...manualPaymentData, modalidade: e.target.value})}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="" disabled>Selecione a modalidade...</option>
                      {selectedStudentModalities.map(mod => (
                        <option key={mod} value={mod}>{mod}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Valor (R$)</label>
                  <input
                    name="valor"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={manualPaymentData.valor}
                    onChange={(e) => setManualPaymentData({...manualPaymentData, valor: parseFloat(e.target.value) || 0})}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition disabled:opacity-50">
                  {isLoading ? 'Confirmando...' : 'Confirmar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRegistrationModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 text-[#232F34]">Novo Aluno</h2>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleRegister({ nome: fd.get('nome') as string, whatsapp: fd.get('whatsapp') as string, data_vencimento: fd.get('data_vencimento') as string, mensalidade: parseFloat(fd.get('mensalidade') as string), modalidade: fd.get('modalidade') as string, classes_per_week: fd.get('freq') as string, gender: fd.get('gender') as any }); }}>
              <div className="space-y-3">
                <input name="nome" placeholder="Nome Completo" required className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                <input name="whatsapp" placeholder="WhatsApp (55...)" required className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                <div className="flex gap-3">
                  <div className="w-1/2"><label className="text-xs text-gray-500 ml-1">Vencimento</label><input name="data_vencimento" type="date" required className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" defaultValue={new Date().toISOString().split('T')[0]} /></div>
                  <div className="w-1/2"><label className="text-xs text-gray-500 ml-1">Valor (R$)</label><input name="mensalidade" type="number" step="0.01" placeholder="0,00" required className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" /></div>
                </div>
                <select name="modalidade" className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                  <option value="Jiu-Jitsu">Jiu-Jitsu</option>
                  <option value="Crossfit">Crossfit</option>
                  <option value="Musculação">Musculação</option>
                  <option value="Yoga">Yoga</option>
                </select>
                <div className="flex gap-3">
                  <select name="freq" className="w-1/2 rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"><option value="2x">2x Semana</option><option value="3x">3x Semana</option><option value="5x">5x Semana</option><option value="Livre">Livre</option></select>
                  <select name="gender" className="w-1/2 rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsRegistrationModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-[#FF9800] text-white rounded-lg hover:bg-[#E68900] shadow-lg shadow-orange-200 transition disabled:opacity-50">{isLoading ? 'Salvando...' : 'Salvar Aluno'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmationModalOpen && confirmationAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <h3 className="font-bold text-lg mb-2 text-[#232F34]">Confirmar Aprovação</h3>
            <p className="text-gray-600 mb-6">Deseja confirmar o recebimento de <span className="font-bold text-[#FF9800]">{formatCurrency(confirmationAction.amount)}</span>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsConfirmationModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Não</button>
              <button onClick={confirmPayment} disabled={isLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition disabled:opacity-50">
                {isLoading ? 'Aprovando...' : 'Sim, confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const KpiCard = ({ title, value, color }: { title: string, value: string, color: string }) => (
  <div className={`p-5 bg-white shadow-sm rounded-xl border-l-4 ${color} border border-gray-100`}>
    <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">{title}</p>
    <p className="text-2xl font-bold text-[#232F34] mt-1">{value}</p>
  </div>
);

const StatusBadge = ({ status }: { status: PendingPayment['status'] }) => {
  const styles = {
    pago: { text: 'Pago', bg: 'bg-green-100', text_color: 'text-green-800' },
    analise: { text: 'Em Análise', bg: 'bg-yellow-100', text_color: 'text-yellow-800' },
    atrasado: { text: 'Atrasado', bg: 'bg-red-100', text_color: 'text-red-800' },
    aberto: { text: 'Em Aberto', bg: 'bg-gray-100', text_color: 'text-gray-800' }
  };
  const style = styles[status] || styles.aberto;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text_color}`}>
      {style.text}
    </span>
  );
};
