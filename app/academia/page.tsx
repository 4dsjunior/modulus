'use client'; // ESSENCIAL: Declara este arquivo como um Client Component para permitir o uso de hooks (useState, useMemo)

// NOTE: As importações de Server-side (cookies, createClient, redirect)
// devem ser feitas DENTRO do Server Component 'AcademiaPage' no final do arquivo.

import {
  getDashboardStats,
  getSegmentationData,
  DashboardStats,
  SegmentationCounts,
  registerNewStudent,
  approvePayment,
  NewStudentData,
} from './actions';
import { useState, useMemo } from 'react';
// IMPORTAÇÃO CORRIGIDA, assuming npm install chart.js react-chartjs-2 succeeded
import Chart from 'chart.js/auto'; 
import { Doughnut } from 'react-chartjs-2'; 

// Definindo as cores do Design System para uso no componente React
const MODALITY_COLORS = {
  'Jiu-Jitsu': '#FF5722', // Laranja Alerta
  'Crossfit': '#232F34',   // Azul Aço (Primário)
  'Musculação': '#FF9800', // Laranja Acento
  'Yoga': '#6C757D', // Texto Secundário
  'Não Informado': '#E0E0E0' // Cinza Claro
};
const FREQUENCY_COLORS = ['#FF9800', '#232F34', '#4CAF50', '#FF5722', '#6C757D'];

// =================================================================
// Funções de Utilidade do Cliente (Client Utilities)
// =================================================================

/** Formata um valor numérico para moeda BRL */
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// =================================================================
// COMPONENTE CLIENT-SIDE: AcademiaDashboardClient
// Trata o estado, interações e renderização final.
// =================================================================

interface AcademiaDashboardClientProps {
  initialStats: DashboardStats;
  initialSegmentation: SegmentationCounts;
  tenantName: string;
}

const AcademiaDashboardClient = ({ initialStats, initialSegmentation, tenantName }: AcademiaDashboardClientProps) => {
  const [stats, setStats] = useState(initialStats);
  const [segmentation, setSegmentation] = useState(initialSegmentation);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Modals
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{ paymentId: string, studentId: string, amount: number } | null>(null);

  // Segmentação State
  const [selectedModality, setSelectedModality] = useState<string | null>(null);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // =================================================================
  // LÓGICA DE AÇÃO (Action Logic)
  // Utiliza as Server Actions importadas
  // =================================================================

  const refreshData = async () => {
    setLoading(true);
    try {
      // Re-chama as Server Actions
      const newStats = await getDashboardStats();
      const newSegmentation = await getSegmentationData();
      setStats(newStats);
      setSegmentation(newSegmentation);
      // Mantém a seleção de modalidade se o dado ainda existir
      if (selectedModality && !newSegmentation.modalityFrequencyCounts[selectedModality]) {
          setSelectedModality(null);
      }
    } catch (e) {
      showMessage("Erro ao recarregar dados do dashboard.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStudent = async (formData: NewStudentData) => {
    setLoading(true);
    const result = await registerNewStudent(formData);
    
    if (result.success) {
      showMessage(result.message, 'success');
      setIsRegistrationModalOpen(false);
      await refreshData();
    } else {
      showMessage(result.message, 'error');
    }
    setLoading(false);
  };

  const handleApprovePayment = (paymentId: string, studentId: string, amount: number) => {
    setConfirmationAction({ paymentId, studentId, amount });
    setIsConfirmationModalOpen(true);
  };

  const confirmApprovePayment = async () => {
    if (!confirmationAction) return;
    
    setLoading(true);
    const { paymentId, studentId, amount } = confirmationAction;
    
    // Chama a Server Action
    const result = await approvePayment(paymentId, studentId, amount);
    
    if (result.success) {
      showMessage(result.message, 'success');
      await refreshData();
    } else {
      showMessage(result.message, 'error');
    }
    setIsConfirmationModalOpen(false);
    setConfirmationAction(null);
    setLoading(false);
  };

  // =================================================================
  // LÓGICA DO GRÁFICO E SEGMENTAÇÃO (Chart and Segmentation Logic)
  // =================================================================

  const chartData = useMemo(() => {
    const counts = segmentation.modalityFrequencyCounts;
    const revenues = segmentation.modalityRevenueCounts;

    if (selectedModality && counts[selectedModality]) {
      // Modo Frequência (Contagem de Alunos)
      const modData = counts[selectedModality];
      // Nota: o campo 'total' em modData é um número (total de alunos na modalidade),
      // então filtramos as chaves que não são 'total' para obter as frequências
      const frequencyData = Object.keys(modData).filter(key => key !== 'total');
      
      const labels = frequencyData.map(freq => `${freq} Semana`);
      const data = frequencyData.map(freq => (modData as any)[freq].total);
      const backgroundColors = frequencyData.map((_, index) => FREQUENCY_COLORS[index % FREQUENCY_COLORS.length]);

      return { 
        title: `Distribuição em ${selectedModality} (Contagem de Alunos)`,
        labels,
        data,
        backgroundColors,
        isRevenueMode: false,
      };

    } else {
      // Modo Padrão (Faturamento Potencial)
      const labels = Object.keys(revenues);
      const data = labels.map(mod => revenues[mod]);
      const backgroundColors = labels.map(mod => MODALITY_COLORS[mod as keyof typeof MODALITY_COLORS] || MODALITY_COLORS['Não Informado']);

      return {
        title: 'Faturamento Potencial por Modalidade',
        labels,
        data,
        backgroundColors,
        isRevenueMode: true,
      };
    }
  }, [selectedModality, segmentation.modalityFrequencyCounts, segmentation.modalityRevenueCounts]);

  // Configurações do Chart.js
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true, 
        position: 'bottom' as const,
        labels: {
          font: { size: 14, family: 'Quicksand' },
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.label || '';
            if (label) label += ': ';
            if (context.parsed !== null) {
              label += chartData.isRevenueMode ? formatCurrency(context.parsed) : `${context.parsed} alunos`;
            }
            return label;
          }
        },
        bodyFont: { family: 'Quicksand', size: 14 },
        titleFont: { family: 'Quicksand', size: 14 }
      }
    }
  };


  // =================================================================
  // FUNÇÕES DE RENDERIZAÇÃO
  // =================================================================
  
  const renderModalityFrequency = () => {
    const data = segmentation.modalityFrequencyCounts;
    const elements = [];

    for (const modality in data) {
      const modData = data[modality];
      const totalModality = modData.total;
      const isActive = modality === selectedModality ? 'active' : '';

      elements.push(
        <div 
          key={modality} 
          className={`border-b border-gray-200 pb-2 mb-3 px-2 py-1 cursor-pointer transition duration-150 rounded-lg ${isActive} hover:bg-[#F8F9FA]`} 
          onClick={() => setSelectedModality(modality === selectedModality ? null : modality)}
        >
          {/* Raleway SemiBold 20px (simulado) */}
          <p className="text-xl font-['Raleway'] font-semibold text-primary">
            {modality} 
            <span className="text-base font-['Quicksand'] font-medium text-secondary ml-2">
              (Total: {totalModality} Alunos)
            </span>
          </p>
          <ul className="ml-4 mt-1 space-y-1 text-secondary">
            {Object.keys(modData)
              .filter(key => key !== 'total')
              .sort() 
              .map(freq => {
                const freqData = (modData as any)[freq];
                return (
                  // CORREÇÃO DE SINTAXE JSX: Removido o comentário de correção que estava causando o erro 1382.
                  <li key={freq} className="font-['Quicksand'] text-sm">
                    <span className="font-medium text-primary">-> {freq} Semana:</span> {freqData.total} alunos
                    <span className="text-xs ml-2">
                      (M {freqData.masc || 0}, F {freqData.fem || 0})
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      );
    }
    return elements;
  };

  // Renderização da Tabela de Pagamentos Pendentes
  const renderPendingPayments = () => {
    if (stats.pendingPayments.length === 0) {
      return (
        <div className="bg-green-100 border-l-4 border-[#4CAF50] text-[#4CAF50] p-4 rounded-lg mt-8" role="alert">
          <p className="font-bold">Tudo Certo!</p>
          <p>Não há pagamentos pendentes de validação no momento.</p>
        </div>
      );
    }

    return (
      <div className="bg-white shadow-lg rounded-xl overflow-x-auto border border-[#E0E0E0]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="rounded-tl-xl text-left p-4 text-xs font-['Quicksand'] font-semibold text-white bg-[#232F34]">Aluno</th>
              <th className="text-left p-4 text-xs font-['Quicksand'] font-semibold text-white bg-[#232F34]">WhatsApp</th>
              <th className="w-24 text-left p-4 text-xs font-['Quicksand'] font-semibold text-white bg-[#232F34]">Valor</th>
              <th className="w-24 text-left p-4 text-xs font-['Quicksand'] font-semibold text-white bg-[#232F34]">Data Pgto</th>
              <th className="w-24 rounded-tr-xl text-left p-4 text-xs font-['Quicksand'] font-semibold text-white bg-[#232F34]">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.pendingPayments.map(payment => (
              <tr key={payment.id} className="hover:bg-[#F8F9FA] even:bg-[#F8F9FA]">
                <td className="whitespace-nowrap font-medium text-primary p-3">{payment.nome_aluno}</td>
                <td className="whitespace-nowrap text-secondary p-3">{payment.whatsapp.slice(0, 4) + '...'+ payment.whatsapp.slice(-4)}</td>
                <td className="whitespace-nowrap text-alert font-semibold p-3">{formatCurrency(payment.valor)}</td>
                <td className="whitespace-nowrap text-secondary p-3">{new Date(payment.data_pagamento).toLocaleDateString('pt-BR')}</td>
                <td className="whitespace-nowrap p-3">
                  <button 
                    onClick={() => handleApprovePayment(payment.id, payment.student_id, payment.valor)}
                    className="px-3 py-1 bg-[#FF9800] hover:bg-[#E68900] text-white font-medium text-xs rounded-lg transition duration-150 shadow-md"
                  >
                    Aprovar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };


  // =================================================================
  // RENDERIZAÇÃO PRINCIPAL
  // =================================================================

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-white rounded-[1.5rem] shadow-xl font-['Quicksand']">
      
      {/* HEADER */}
      <header className="mb-8 p-4 bg-white shadow-lg rounded-xl flex justify-between items-center border border-[#E0E0E0]">
          <h1 className="text-[2rem] font-['Raleway'] font-bold text-[#232F34]">
              Painel Financeiro - {tenantName}
              <span className="text-xl text-[#FF9800] font-['Quicksand'] font-medium ml-2">(Módulo Academia)</span>
          </h1>
          <div className="flex items-center space-x-4">
              <button 
                  onClick={() => setIsRegistrationModalOpen(true)}
                  className="px-5 py-3 bg-[#FF9800] text-white font-medium rounded-lg hover:bg-[#E68900] transition duration-150 shadow-md"
              >
                  Cadastrar Novo Aluno
              </button>
          </div>
      </header>
      
      {/* MENSAGENS E LOADING */}
      {message && (
        <div className={`p-4 mb-4 text-sm rounded-lg ${message.type === 'success' ? 'bg-green-100 text-success' : message.type === 'error' ? 'bg-red-100 text-alert' : 'bg-blue-100 text-primary'}`}>
          {message.text}
        </div>
      )}
      {loading && (
        <div className="text-center p-4">
          <svg className="animate-spin h-6 w-6 text-[#FF9800] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-primary">Aguarde, processando dados...</p>
        </div>
      )}


      {/* VISÃO GERAL E ESTATÍSTICAS */}
      <section className="mb-12">
          <h2 className="text-2xl font-['Raleway'] font-semibold mb-4 text-primary">Visão Geral e Estatísticas</h2>
          
          {/* Cards de Faturamento (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {/* Faturamento Anual Acumulado */}
              <div className="bg-white p-5 shadow-kpi border-l-4 border-primary">
                  <p className="text-sm font-medium text-secondary">Faturamento Anual (Acum.)</p>
                  <p className="text-[1.75rem] font-['Raleway'] font-bold text-primary mt-1">{formatCurrency(stats.annualRevenue)}</p>
              </div>
              {/* Previsão Próximo Mês */}
              <div className="bg-white p-5 shadow-kpi border-l-4 border-accent">
                  <p className="text-sm font-medium text-secondary">Previsão Próximo Mês</p>
                  <p className="text-[1.75rem] font-['Raleway'] font-bold text-accent mt-1">{formatCurrency(stats.nextMonthForecast)}</p>
              </div>
              {/* Total de Alunos Ativos */}
              <div className="bg-white p-5 shadow-kpi border-l-4 border-success">
                  <p className="text-sm font-medium text-secondary">Total de Alunos Ativos</p>
                  <p className="text-[1.75rem] font-['Raleway'] font-bold text-success mt-1">{stats.totalStudents}</p>
              </div>
          </div>

          {/* Status Mensal Detalhado */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-[#E0E0E0]">
              <h3 className="text-xl font-['Raleway'] font-semibold mb-3 text-primary">Status Mensal (Este Mês)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-[#F4F6F8] rounded-lg"> {/* Esperado (Fundo Neutro) */}
                      <p className="text-xs text-secondary">Esperado (Vencimentos)</p>
                      <p className="text-[2rem] font-bold text-primary mt-1">{formatCurrency(stats.monthlyExpected)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg"> {/* Recebido (Verde) */}
                      <p className="text-xs text-secondary">Recebido (Aprovado)</p>
                      <p className="text-[2rem] font-bold text-success mt-1">{formatCurrency(stats.monthlyReceived)}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg"> {/* Em Falta (Alerta) */}
                      <p className="text-xs text-secondary">Em Falta (Previsto - Recebido)</p>
                      <p className="text-[2rem] font-bold text-alert mt-1">{formatCurrency(Math.max(0, stats.monthlyExpected - stats.monthlyReceived))}</p>
                  </div>
              </div>
          </div>

          {/* Segmentação de Alunos: Lista Hierárquica e Gráfico */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-[#E0E0E0]">
              <h3 className="text-2xl font-['Raleway'] font-semibold mb-3 text-primary">Segmentação de Alunos Ativos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* 1. Lista Hierárquica e Interativa */}
                  <div className="order-2 md:order-1">
                      <h4 className="font-medium text-secondary mb-2 border-b pb-1">Detalhe Hierárquico</h4>
                      <div className="space-y-3 text-sm text-primary">
                          {renderModalityFrequency()}
                      </div>
                      <button 
                          onClick={() => setSelectedModality(null)}
                          className={`mt-4 text-sm px-3 py-1 bg-[#F4F6F8] text-primary rounded-lg hover:bg-[#E0E0E0] transition ${selectedModality ? '' : 'hidden'}`}
                      >
                          Mostrar Faturamento Potencial
                      </button>
                  </div>

                  {/* 2. Gráfico Dinâmico */}
                  <div className="order-1 md:order-2">
                      <h4 className="font-medium text-secondary mb-2 border-b pb-1 text-center">{chartData.title}</h4>
                      <div className="relative max-w-sm mx-auto max-h-[350px]"> 
                          <Doughnut 
                            data={{
                              labels: chartData.labels,
                              datasets: [{
                                data: chartData.data,
                                backgroundColor: chartData.backgroundColors,
                                hoverOffset: 12,
                                borderWidth: 0,
                                borderRadius: 5,
                                spacing: 2
                              }]
                            }} 
                            options={chartOptions as any} 
                          />
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* PAGAMENTOS PENDENTES */}
      <main>
          <h2 className="text-2xl font-['Raleway'] font-semibold mb-4 text-primary">Pagamentos Pendentes</h2>
          {renderPendingPayments()}
      </main>
      
      {/* MODAL DE CADASTRO */}
      <RegistrationModal 
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        onSubmit={handleRegisterStudent}
        isLoading={loading}
      />
      
      {/* MODAL DE CONFIRMAÇÃO */}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={confirmApprovePayment}
        amount={confirmationAction?.amount || 0}
      />
    </div>
  );
};


// =================================================================
// MODAIS (Para não poluir o componente principal)
// =================================================================

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// 1. Modal de Cadastro de Aluno
const RegistrationModal: React.FC<ModalProps & { onSubmit: (data: NewStudentData) => void, isLoading: boolean }> = ({ isOpen, onClose, onSubmit, isLoading }) => {
    
    const [formData, setFormData] = useState<NewStudentData>({
        nome: '',
        whatsapp: '',
        data_vencimento: new Date().toISOString().split('T')[0],
        mensalidade: 100.00,
        modalidade: 'Jiu-Jitsu',
        classes_per_week: '2x',
        gender: 'Masculino',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id.replace('reg-', '')]: id === 'reg-mensalidade' ? parseFloat(value) : value // Corrigido 'reg-monthly-fee' para 'reg-mensalidade'
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#232F34] bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
                <h3 className="text-2xl font-['Raleway'] font-bold text-[#232F34] mb-4 border-b pb-2">Cadastrar Novo Aluno</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="reg-nome" className="block text-sm font-medium text-[#232F34]">Nome Completo</label>
                        <input type="text" id="reg-nome" value={formData.nome} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF9800] focus:ring-[#FF9800] p-2 border" />
                    </div>
                    <div>
                        <label htmlFor="reg-whatsapp" className="block text-sm font-medium text-[#232F34]">WhatsApp (55DDI9XXXXYYYY)</label>
                        <input type="text" id="reg-whatsapp" value={formData.whatsapp} onChange={handleChange} required placeholder="5511987654321" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF9800] focus:ring-[#FF9800] p-2 border" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="reg-data_vencimento" className="block text-sm font-medium text-[#232F34]">Data de Vencimento</label>
                            <input type="date" id="reg-data_vencimento" value={formData.data_vencimento} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF9800] focus:ring-[#FF9800] p-2 border" />
                        </div>
                        <div>
                            <label htmlFor="reg-mensalidade" className="block text-sm font-medium text-[#232F34]">Valor Mensal (R$)</label>
                            <input type="number" id="reg-mensalidade" value={formData.mensalidade} onChange={handleChange} required step="0.01" min="0" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF9800] focus:ring-[#FF9800] p-2 border" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="reg-modalidade" className="block text-sm font-medium text-[#232F34]">Modalidade</label>
                            <select id="reg-modalidade" value={formData.modalidade} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF9800] focus:ring-[#FF9800] p-2 border bg-white">
                                <option value="Jiu-Jitsu">Jiu-Jitsu</option>
                                <option value="Crossfit">Crossfit</option>
                                <option value="Musculação">Musculação</option>
                                <option value="Yoga">Yoga</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="reg-classes_per_week" className="block text-sm font-medium text-[#232F34]">Frequência</label>
                            <select id="reg-classes_per_week" value={formData.classes_per_week} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF9800] focus:ring-[#FF9800] p-2 border bg-white">
                                <option value="2x">2x Semana</option>
                                <option value="3x">3x Semana</option>
                                <option value="5x">5x Semana</option>
                                <option value="Livre">Livre</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="reg-gender" className="block text-sm font-medium text-[#232F34]">Sexo</label>
                            <select id="reg-gender" value={formData.gender} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF9800] focus:ring-[#FF9800] p-2 border bg-white">
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-[#F4F6F8] text-[#232F34] rounded-lg hover:bg-[#E0E0E0] transition duration-150">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-[#FF9800] text-white rounded-lg hover:bg-[#E68900] transition duration-150 flex items-center">
                            {isLoading && <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            Cadastrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 2. Modal de Confirmação de Pagamento
const ConfirmationModal: React.FC<ModalProps & { onConfirm: () => void, amount: number }> = ({ isOpen, onClose, onConfirm, amount }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#232F34] bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all">
                <h3 className="text-xl font-['Raleway'] font-bold text-[#232F34] mb-4">Confirmação de Aprovação</h3>
                <p className="text-[#6C757D] mb-6">Confirma a aprovação do pagamento de **{formatCurrency(amount)}**?</p>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-[#F4F6F8] text-[#232F34] rounded-lg hover:bg-[#E0E0E0] transition duration-150">Cancelar</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-[#4CAF50] text-white rounded-lg hover:bg-[#3E8E41] transition duration-150">Confirmar Aprovação</button>
                </div>
            </div>
        </div>
    );
};

// =================================================================
// COMPONENTE SERVER-SIDE (Fetch Data)
// =================================================================

export default async function AcademiaPage() {
  // CORREÇÃO 3: Importações devem ser feitas DENTRO do Server Component
  const { cookies } = await import('next/headers');
  const { createClient } = await import('@/app/utils/supabase/server');
  const { redirect } = await import('next/navigation');

  const cookieStore = cookies();
  // CORREÇÃO 2 & 3: A função createClient deve ser chamada sem argumentos
  // dentro do Server Component, pois o cliente do Modulus provavelmente já
  // lida com os cookies internamente no utils/supabase/server.ts para Server Actions.
  // Vamos adaptar para a forma mais comum que resolve os erros 2554 e 2339.
  const supabase = createClient(); 

  // 1. Verificar autenticação e obter Tenant ID
  // CORREÇÃO 3 (continuação): AWAIT necessário se createClient retornar Promise
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const tenants = user.app_metadata.tenants as string[] | undefined;
  const tenantId = tenants ? tenants[0] : null;

  if (!tenantId) {
    redirect('/');
  }
  
  // 2. Obter nome do Tenant
  // CORREÇÃO 4: AWAIT na chamada 'supabase.from().select().single()'
  const { data: tenantData } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
  const tenantName = tenantData?.name || 'Academia Desconhecida';


  // 3. Buscar todos os dados do dashboard
  const [initialStats, initialSegmentation] = await Promise.all([
    getDashboardStats(),
    getSegmentationData(),
  ]);

  return (
    <div className="font-['Quicksand'] antialiased">
        <AcademiaDashboardClient 
            initialStats={initialStats} 
            initialSegmentation={initialSegmentation} 
            tenantName={tenantName}
        />
    </div>
  );
}