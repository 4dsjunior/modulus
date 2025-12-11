'use client';

import { useState, useMemo, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

import type {
  DashboardStats,
  SegmentationCounts,
  NewStudentData
} from '../../actions';

// =================================================================
// CONFIGURAÇÕES VISUAIS (Idênticas ao Mockup HTML)
// =================================================================

const MODALITY_COLORS: Record<string, string> = {
  'Jiu-Jitsu': 'rgb(255, 99, 132)', // Vermelho
  'Crossfit': 'rgb(54, 162, 235)',   // Azul
  'Musculação': 'rgb(255, 205, 86)', // Amarelo
  'Yoga': '#6C757D',
  'Não Informado': 'rgb(201, 203, 207)' // Cinza
};

const FREQUENCY_COLORS = [
  'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)', 'rgb(50, 200, 50)', 'rgb(200, 50, 50)'
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// =================================================================
// INTERFACE DE PROPS (Conexão com Server)
// =================================================================

interface DashboardClientProps {
  tenantName: string;
  initialStats: DashboardStats;
  initialSegmentation: SegmentationCounts;
  registerAction: (data: NewStudentData) => Promise<{ success: boolean; message: string }>;
  approveAction: (paymentId: string, studentId: string, amount: number) => Promise<{ success: boolean; message: string }>;
  refreshAction: () => Promise<[DashboardStats, SegmentationCounts]>; 
}

// =================================================================
// COMPONENTE PRINCIPAL
// =================================================================

export default function DashboardClient({ 
  tenantName, 
  initialStats, 
  initialSegmentation,
  registerAction,
  approveAction,
  refreshAction
}: DashboardClientProps) {
  
  // --- ESTADO LOCAL ---
  const [stats, setStats] = useState<DashboardStats>(initialStats || {
    annualRevenue: 0, nextMonthForecast: 0, totalStudents: 0, monthlyExpected: 0, monthlyReceived: 0, pendingPayments: []
  });
  const [segmentation, setSegmentation] = useState<SegmentationCounts>(initialSegmentation || { modalityFrequencyCounts: {}, modalityRevenueCounts: {} });
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedModality, setSelectedModality] = useState<string | null>(null);

  // Modal States
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{ paymentId: string, studentId: string, amount: number } | null>(null);

  // Sync props -> state
  useEffect(() => {
    if (initialStats) setStats(initialStats);
    if (initialSegmentation) setSegmentation(initialSegmentation);
  }, [initialStats, initialSegmentation]);

  // --- Helpers de UI ---
  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // --- Actions (Tratamento de Erros Reforçado) ---
  
  const handleRefresh = async () => {
    // Não ativamos o loading global aqui para evitar conflito visual se chamado dentro de outra ação
    try {
      const [newStats, newSeg] = await refreshAction();
      setStats(newStats);
      setSegmentation(newSeg);
    } catch (e) { 
      console.error(e);
      showMessage("Erro ao atualizar dados do painel.", 'error'); 
    }
  };

  const handleRegister = async (data: NewStudentData) => {
    // Validação básica antes de enviar
    if (!data.nome || !data.whatsapp || isNaN(data.mensalidade) || !data.data_vencimento) {
        showMessage("Por favor, preencha todos os campos obrigatórios corretamente.", 'error');
        return;
    }

    setLoading(true);
    try {
      const res = await registerAction(data);
      
      if (res.success) {
        showMessage(res.message, 'success');
        setIsRegistrationModalOpen(false); // Fecha o modal apenas se sucesso
        await handleRefresh(); // Atualiza os dados
      } else {
        // Se a ação retornou erro (ex: validação do banco)
        showMessage(res.message || "Erro desconhecido ao salvar.", 'error');
      }
    } catch (e) {
      console.error("Erro no registro:", e);
      showMessage("Erro de comunicação. Verifique sua conexão ou tente novamente.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!confirmationAction) return;
    setLoading(true);
    try {
        const res = await approveAction(confirmationAction.paymentId, confirmationAction.studentId, confirmationAction.amount);
        if (res.success) { 
            showMessage('Pagamento APROVADO!', 'success'); 
            setIsConfirmationModalOpen(false);
            await handleRefresh(); 
        } else { 
            showMessage(res.message, 'error'); 
        }
    } catch (e) {
        console.error("Erro na aprovação:", e);
        showMessage("Erro ao processar aprovação.", 'error');
    } finally {
        setLoading(false);
    }
  };

  // --- Lógica do Gráfico ---
  const chartData = useMemo(() => {
    const counts = segmentation?.modalityFrequencyCounts || {};
    const revs = segmentation?.modalityRevenueCounts || {};

    if (selectedModality && counts[selectedModality]) {
      const modData = counts[selectedModality];
      const freqs = Object.keys(modData).filter(k => k !== 'total').sort();
      return { 
        title: `Distribuição em ${selectedModality} (Contagem de Alunos)`,
        labels: freqs.map(f => `${f} Semana`),
        data: freqs.map(f => (modData as any)[f].total),
        colors: freqs.map((_, i) => FREQUENCY_COLORS[i % FREQUENCY_COLORS.length]),
        isRevenueMode: false
      };
    } else {
      const mods = Object.keys(revs);
      return {
        title: 'Faturamento Potencial por Modalidade',
        labels: mods,
        data: mods.map(m => revs[m]),
        colors: mods.map(m => MODALITY_COLORS[m] || MODALITY_COLORS['Não Informado']),
        isRevenueMode: true
      };
    }
  }, [selectedModality, segmentation]);

  const monthlyMissing = (stats?.monthlyExpected || 0) - (stats?.monthlyReceived || 0);

  // =================================================================
  // RENDERIZAÇÃO
  // =================================================================
  return (
    <>
      <style jsx global>{`
        body { font-family: 'Inter', sans-serif; background-color: #f7f9fb; }
        .custom-scroll::-webkit-scrollbar { width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb { background-color: #9ca3af; border-radius: 10px; }
        .modality-item { cursor: pointer; transition: all 0.2s; border-left: 4px solid transparent; border-radius: 8px; }
        .modality-item:hover { background-color: #f3f4f6; border-left: 4px solid #d1d5db; }
        .modality-item.active { background-color: #e0f2fe; border-left: 4px solid #3b82f6; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); font-weight: 600; }
      `}</style>

      <div className="min-h-screen p-4 sm:p-8">
        <div id="app" className="max-w-4xl mx-auto">
          
          <header className="mb-8 p-4 bg-white shadow-lg rounded-xl flex justify-between items-center">
             <div>
               <h1 className="text-3xl font-bold text-gray-800">Painel de Validação Financeira</h1>
               <div className="text-sm text-gray-500 mt-1">
                 <span id="user-id-display">Unidade: <span className="text-indigo-600 font-semibold">{tenantName}</span></span>
               </div>
             </div>
             <div className="flex gap-2">
               <button onClick={() => setIsRegistrationModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition text-sm font-medium">Novo Aluno</button>
               <button onClick={() => { setLoading(true); handleRefresh().finally(() => setLoading(false)); }} className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg shadow-sm transition">↻</button>
             </div>
          </header>

          {loading && (
            <div id="loading-indicator" className="text-center p-8">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-indigo-600">Processando...</p>
            </div>
          )}

          {message && (
             <div id="message-box" className={`p-4 mb-4 text-sm rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 
                message.type === 'error' ? 'bg-red-100 text-red-800' : 
                'bg-blue-100 text-blue-800'
             }`} role="alert">
                {message.text}
             </div>
          )}

          <section id="statistics-section" className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Visão Geral e Estatísticas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-indigo-500">
                      <p className="text-sm font-medium text-gray-500">Faturamento Anual (Acum.)</p>
                      <p id="annual-revenue" className="text-2xl font-bold text-indigo-700 mt-1">{formatCurrency(stats?.annualRevenue || 0)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-purple-500">
                      <p className="text-sm font-medium text-gray-500">Previsão Próximo Mês</p>
                      <p id="next-month-forecast" className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(stats?.nextMonthForecast || 0)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-green-500">
                      <p className="text-sm font-medium text-gray-500">Total de Alunos Ativos</p>
                      <p id="total-students" className="text-2xl font-bold text-green-700 mt-1">{stats?.totalStudents || 0}</p>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                  <h3 className="text-xl font-semibold mb-3 text-gray-700">Status Mensal (Este Mês)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-500">Esperado (Vencimentos)</p>
                          <p id="monthly-expected" className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(stats?.monthlyExpected || 0)}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-gray-500">Recebido (Aprovado)</p>
                          <p id="monthly-received" className="text-xl font-bold text-green-700 mt-1">{formatCurrency(stats?.monthlyReceived || 0)}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-gray-500">Em Falta (Previsto - Recebido)</p>
                          <p id="monthly-missing" className="text-xl font-bold text-red-700 mt-1">{formatCurrency(Math.max(0, monthlyMissing))}</p>
                      </div>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3 text-gray-700">Segmentação de Alunos Ativos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      <div className="order-2 md:order-1">
                          <h4 className="font-medium text-gray-600 mb-2 border-b pb-1">Detalhe Hierárquico</h4>
                          <div id="stats-modality-frequency" className="space-y-3 text-sm text-gray-700">
                            {(!segmentation?.modalityFrequencyCounts || Object.keys(segmentation.modalityFrequencyCounts).length === 0) ? (
                                <p className="text-gray-400 italic p-2">Sem dados disponíveis.</p>
                            ) : (
                              Object.keys(segmentation.modalityFrequencyCounts).map(mod => {
                                const modData = segmentation.modalityFrequencyCounts[mod];
                                const freqs = Object.keys(modData).filter(k => k !== 'total').sort();
                                const isActive = selectedModality === mod;
                                return (
                                  <div key={mod} onClick={() => setSelectedModality(isActive ? null : mod)} className={`border-b border-gray-200 pb-2 mb-3 px-2 py-1 modality-item ${isActive ? 'active' : ''}`}>
                                    <p className="text-base font-bold text-indigo-700">{mod} (Total: {modData.total} Alunos)</p>
                                    <ul className="ml-4 mt-1 space-y-1 text-gray-700">
                                      {freqs.map(freq => (
                                        <li key={freq}>
                                          <span className="text-sm font-medium">-{'>'} {freq} Semana:</span> {(modData as any)[freq].total} alunos
                                          <span className="text-xs text-gray-500 ml-2">(masc {(modData as any)[freq].masc || 0}, fem {(modData as any)[freq].fem || 0})</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )
                              })
                            )}
                          </div>
                          <button onClick={() => setSelectedModality(null)} className={`mt-4 text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition ${!selectedModality ? 'hidden' : ''}`}>Mostrar Gráfico de Faturamento</button>
                      </div>

                      <div className="order-1 md:order-2">
                          <h4 id="chart-title" className="font-medium text-gray-600 mb-2 border-b pb-1 text-center">{chartData.title}</h4>
                          <div className="relative mx-auto max-h-[350px]">
                            <Doughnut 
                              data={{ labels: chartData.labels, datasets: [{ data: chartData.data, backgroundColor: chartData.colors, borderWidth: chartData.isRevenueMode ? 2 : 1, hoverOffset: 8 }] }} 
                              options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 12, family: "'Inter', sans-serif" } } }, tooltip: { callbacks: { label: (ctx) => (ctx.label ? `${ctx.label}: ` : '') + (chartData.isRevenueMode ? formatCurrency(ctx.parsed) : `${ctx.parsed} alunos`) } } } }} 
                            />
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          <main id="payment-list-container">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Pagamentos Pendentes</h2>
              <div id="pending-payments-list" className="space-y-4 custom-scroll max-h-[70vh] overflow-y-auto p-1">
                 {(!stats?.pendingPayments || stats.pendingPayments.length === 0) ? (
                    <div id="no-payments" className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mt-8">
                        <p className="font-bold">Tudo Certo!</p>
                        <p>Não há pagamentos pendentes de validação no momento.</p>
                    </div>
                 ) : (
                   stats.pendingPayments.map(payment => (
                     <div key={payment.id} className="bg-white p-5 shadow-md rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center transition duration-300 hover:shadow-lg">
                        <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                           <p className="text-lg font-semibold text-gray-800 truncate">{payment.nome_aluno}</p>
                           <p className="text-sm text-gray-500">WhatsApp: {payment.student_id}</p>
                           <p className="text-sm text-gray-600">Data do Pagamento: {new Date(payment.data_pagamento).toLocaleDateString('pt-BR')}</p>
                           <p className="text-xl font-bold text-indigo-600 mt-1">{formatCurrency(payment.valor)}</p>
                        </div>
                        <div className="flex items-center space-x-3 w-full sm:w-auto">
                            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium border border-indigo-200 bg-indigo-50 p-2 rounded-lg transition duration-150 whitespace-nowrap">Ver Comprovativo</button>
                            <button onClick={() => { setConfirmationAction({ paymentId: payment.id, studentId: payment.student_id, amount: payment.valor }); setIsConfirmationModalOpen(true); }} className="action-btn bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 whitespace-nowrap">Aprovar</button>
                            <button onClick={() => showMessage("Rejeição não implementada.", 'info')} className="action-btn bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 whitespace-nowrap">Rejeitar</button>
                        </div>
                     </div>
                   ))
                 )}
              </div>
          </main>

          {isConfirmationModalOpen && confirmationAction && (
             <div id="confirmation-modal" className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                 <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all">
                     <h3 id="modal-title" className="text-xl font-bold text-gray-800 mb-4">Aprovar Pagamento</h3>
                     <p id="modal-text" className="text-gray-600 mb-6">Confirma a aprovação do pagamento de <span className="font-bold">{formatCurrency(confirmationAction.amount)}</span>?</p>
                     <div id="modal-actions" className="flex justify-end space-x-3">
                         <button id="modal-cancel" onClick={() => setIsConfirmationModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-150">Cancelar</button>
                         <button id="modal-confirm" onClick={confirmPayment} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:opacity-90 transition duration-150">Confirmar Aprovação</button>
                     </div>
                 </div>
             </div>
          )}

          {isRegistrationModalOpen && (
             <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                 <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                     <h2 className="text-xl font-bold text-gray-800 mb-4">Novo Aluno</h2>
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
                            <input name="nome" placeholder="Nome Completo" required className="w-full p-2 border border-gray-300 rounded" />
                            <input name="whatsapp" placeholder="WhatsApp" required className="w-full p-2 border border-gray-300 rounded" />
                            <div className="flex gap-2">
                                <input name="mensalidade" type="number" placeholder="Mensalidade" required className="w-full p-2 border border-gray-300 rounded" />
                                <input name="data_vencimento" type="date" required className="w-full p-2 border border-gray-300 rounded" />
                            </div>
                            <select name="modalidade" className="w-full p-2 border border-gray-300 rounded">
                                {Object.keys(MODALITY_COLORS).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <select name="freq" className="w-1/2 p-2 border border-gray-300 rounded"><option value="3x">3x</option><option value="5x">5x</option><option value="Livre">Livre</option></select>
                                <select name="gender" className="w-1/2 p-2 border border-gray-300 rounded"><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setIsRegistrationModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-700">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Salvar</button>
                        </div>
                      </form>
                 </div>
             </div>
          )}

        </div>
      </div>
    </>
  );
}