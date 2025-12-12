'use client';

import { useState, useMemo, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

import {
  registerNewStudent,
  approvePayment,
  getDashboardStats,
  getSegmentationData,
  type DashboardStats,
  type SegmentationCounts,
  type NewStudentData
} from '../../actions';

// =================================================================
// CONFIGURAÇÕES VISUAIS
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

interface DashboardClientProps {
  tenantName: string;
  initialStats: DashboardStats;
  initialSegmentation: SegmentationCounts;
}

export default function DashboardClient({ 
  tenantName, 
  initialStats, 
  initialSegmentation
}: DashboardClientProps) {
  
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [segmentation, setSegmentation] = useState<SegmentationCounts>(initialSegmentation);
  
  useEffect(() => {
    if (initialStats) setStats(initialStats);
    if (initialSegmentation) setSegmentation(initialSegmentation);
  }, [initialStats, initialSegmentation]);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Estados de Modais
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{ paymentId: string, studentId: string, amount: number } | null>(null);
  const [selectedModality, setSelectedModality] = useState<string | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    // Auto-hide após 5 segundos
    setTimeout(() => setMessage(null), 5000);
  };

  const handleRefresh = async () => {
    try {
      const newStats = await getDashboardStats();
      const newSeg = await getSegmentationData();
      setStats(newStats);
      setSegmentation(newSeg);
    } catch (e) {
      console.error(e);
      showMessage("Erro ao atualizar dados.", 'error');
    }
  };

  const handleRegister = async (data: NewStudentData) => {
    // Validação básica no cliente
    if (!data.nome || isNaN(data.mensalidade)) {
        showMessage("Preencha nome e mensalidade corretamente.", 'error');
        return;
    }

    setLoading(true);
    console.log("Enviando dados para Server Action:", data); // Debug Cliente

    try {
      const res = await registerNewStudent(data);
      console.log("Resposta do Server Action:", res); // Debug Cliente
      
      if (res.success) {
        showMessage(res.message, 'success');
        setIsRegistrationModalOpen(false); // Fecha o modal
        await handleRefresh(); // Atualiza os dados na tela
      } else {
        // Se cair aqui, a mensagem aparecerá no topo da tela agora
        showMessage(res.message, 'error');
      }
    } catch (e: any) {
      console.error("Erro fatal no cliente:", e);
      showMessage(`Erro de comunicação: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!confirmationAction) return;
    setLoading(true);
    try {
      const res = await approvePayment(confirmationAction.paymentId, confirmationAction.studentId, confirmationAction.amount);
      if (res.success) { 
        showMessage(res.message, 'success'); 
        await handleRefresh(); 
      } else { 
        showMessage(res.message, 'error'); 
      }
    } catch (e) {
      showMessage("Erro ao aprovar pagamento.", 'error');
    }
    setIsConfirmationModalOpen(false);
    setLoading(false);
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
  }, [selectedModality, segmentation]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl font-['Quicksand'] relative">
      
      {/* CORREÇÃO CRÍTICA: Toast Flutuante com z-index alto para aparecer SOBRE o modal */}
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
        <div className="flex gap-2">
           <button onClick={() => { setLoading(true); handleRefresh().finally(() => setLoading(false)); }} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition">↻</button>
           <button onClick={() => setIsRegistrationModalOpen(true)} className="bg-[#FF9800] text-white px-4 py-2 rounded-lg hover:bg-[#E68900] shadow-md transition">Novo Aluno</button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KpiCard title="Faturamento Anual" value={loading ? '...' : formatCurrency(stats?.annualRevenue || 0)} color="border-[#232F34]" />
        <KpiCard title="Previsão Mês" value={loading ? '...' : formatCurrency(stats?.nextMonthForecast || 0)} color="border-[#FF9800]" />
        <KpiCard title="Alunos Ativos" value={loading ? '...' : (stats?.totalStudents || 0).toString()} color="border-[#4CAF50]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Lista de Modalidades */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <h3 className="font-bold text-lg mb-4 text-[#232F34]">Modalidades</h3>
          {loading ? <p className="text-gray-400">Carregando...</p> : 
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

        {/* Gráfico */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-center mb-4 text-[#232F34]">{chartData.title}</h3>
          <div className="flex-1 relative min-h-[250px]">
            <Doughnut 
              data={{ 
                labels: chartData.labels, 
                datasets: [{ 
                  data: chartData.data, 
                  backgroundColor: chartData.colors,
                  borderWidth: 0,
                  hoverOffset: 10
                }] 
              }} 
              options={{ 
                maintainAspectRatio: false,
                plugins: { 
                  legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Quicksand' } } },
                  tooltip: { 
                    callbacks: { 
                      label: (ctx) => {
                        const labelStr = ctx.label ? `${ctx.label}: ` : '';
                        const val = ctx.parsed;
                        const suffix = chartData.isRev ? formatCurrency(val) : `${val} alunos`;
                        return labelStr + suffix;
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Tabela de Pagamentos */}
      <h2 className="text-xl font-bold mb-4 text-[#232F34]">Pagamentos Pendentes</h2>
      {loading ? <p>Verificando pagamentos...</p> : !stats?.pendingPayments || stats.pendingPayments.length === 0 ? (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 flex items-center">
          <span className="mr-2">✓</span> Todos os pagamentos em dia.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#232F34] text-white">
              <tr>
                <th className="p-3">Aluno</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Data</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {stats.pendingPayments.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50 last:border-0">
                  <td className="p-3 font-medium">{p.nome_aluno}</td>
                  <td className="p-3 font-bold text-[#FF9800]">{formatCurrency(p.valor)}</td>
                  <td className="p-3 text-gray-500">{new Date(p.data_pagamento).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => { setConfirmationAction({ paymentId: p.id, studentId: p.student_id, amount: p.valor }); setIsConfirmationModalOpen(true); }} 
                      className="bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-medium transition"
                    >
                      Aprovar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Cadastro */}
      {isRegistrationModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 text-[#232F34]">Novo Aluno</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleRegister({
                nome: fd.get('nome') as string,
                whatsapp: fd.get('whatsapp') as string,
                data_vencimento: fd.get('data_vencimento') as string,
                mensalidade: parseFloat(fd.get('mensalidade') as string),
                modalidade: fd.get('modalidade') as string,
                classes_per_week: fd.get('freq') as string,
                gender: fd.get('gender') as any
              });
            }}>
              <div className="space-y-3">
                <input name="nome" placeholder="Nome Completo" required className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                <input name="whatsapp" placeholder="WhatsApp (55...)" required className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                <div className="flex gap-3">
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500 ml-1">Vencimento</label>
                    <input name="data_vencimento" type="date" required className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="w-1/2">
                    <label className="text-xs text-gray-500 ml-1">Valor (R$)</label>
                    <input name="mensalidade" type="number" step="0.01" placeholder="0,00" required className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>
                <select name="modalidade" className="w-full rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                  <option value="Jiu-Jitsu">Jiu-Jitsu</option>
                  <option value="Crossfit">Crossfit</option>
                  <option value="Musculação">Musculação</option>
                  <option value="Yoga">Yoga</option>
                </select>
                <div className="flex gap-3">
                  <select name="freq" className="w-1/2 rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                    <option value="2x">2x Semana</option>
                    <option value="3x">3x Semana</option>
                    <option value="5x">5x Semana</option>
                    <option value="Livre">Livre</option>
                  </select>
                  <select name="gender" className="w-1/2 rounded-lg border border-gray-200 bg-[#fbfbfb] p-3 text-sm text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsRegistrationModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-[#FF9800] text-white rounded-lg hover:bg-[#E68900] shadow-lg shadow-orange-200 transition disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar Aluno'}
                </button>
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
              <button onClick={confirmPayment} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition">Sim, confirmar</button>
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