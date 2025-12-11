'use client';

import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

// --- MOCK DATA ---
const MOCK_STUDENTS = [
    // Alunos de Jiu-Jitsu (Total: 5)
    { name: "João Silva", whatsapp: "5511988881111", due_date: "2025-11-15", status: "active", modality: "Jiu-Jitsu", gender: "Masculino", classes_per_week: "3x", monthly_fee: 120.00 },
    { name: "Julia Santos", whatsapp: "5511988886666", due_date: "2025-12-15", status: "active", modality: "Jiu-Jitsu", gender: "Feminino", classes_per_week: "3x", monthly_fee: 120.00 },
    { name: "Pedro Lima", whatsapp: "5511988883333", due_date: "2025-12-05", status: "active", modality: "Jiu-Jitsu", gender: "Masculino", classes_per_week: "5x", monthly_fee: 120.00 },
    { name: "Gustavo Mendes", whatsapp: "5511988889999", due_date: "2025-11-01", status: "active", modality: "Jiu-Jitsu", gender: "Masculino", classes_per_week: "5x", monthly_fee: 120.00 },
    { name: "Mariana Alves", whatsapp: "5511988880000", due_date: "2025-12-02", status: "active", modality: "Jiu-Jitsu", gender: "Feminino", classes_per_week: "5x", monthly_fee: 120.00 },
    
    // Alunos de Crossfit (Total: 3)
    { name: "Maria Souza", whatsapp: "5511988882222", due_date: "2025-11-28", status: "active", modality: "Crossfit", gender: "Feminino", classes_per_week: "5x", monthly_fee: 150.00 },
    { name: "Rafael Costa", whatsapp: "5511988887777", due_date: "2025-12-20", status: "active", modality: "Crossfit", gender: "Masculino", classes_per_week: "5x", monthly_fee: 150.00 },
    { name: "Carlos Rocha", whatsapp: "5511988885555", due_date: "2025-11-01", status: "active", modality: "Crossfit", gender: "Masculino", classes_per_week: "3x", monthly_fee: 150.00 },
    
    // Alunos de Musculação (Total: 2)
    { name: "Ana Paula", whatsapp: "5511988884444", due_date: "2025-12-10", status: "active", modality: "Musculação", gender: "Feminino", classes_per_week: "2x", monthly_fee: 90.00 },
    { name: "Leticia Almeida", whatsapp: "5511988888888", due_date: "2025-12-25", status: "active", modality: "Musculação", gender: "Feminino", classes_per_week: "5x", monthly_fee: 90.00 },
];

const INITIAL_PENDING_PAYMENTS = [
    { id: "P_MOCK_1", student_whatsapp: "5511988881111", amount: 120.00, proof_url: "https://placehold.co/400x300/e0e0e0/000?text=Comprovante+1", validation_status: "pending", payment_date: new Date(new Date().setDate(1)).toISOString() },
    { id: "P_MOCK_2", student_whatsapp: "5511988884444", amount: 90.00, proof_url: "https://placehold.co/400x300/e0e0e0/000?text=Comprovante+2", validation_status: "pending", payment_date: new Date(new Date().setDate(2)).toISOString() },
];

const INITIAL_APPROVED_PAYMENTS = (() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    return [
        { amount: 120.00, validated_at: `${currentYear}-01-15T12:00:00Z` },
        { amount: 150.00, validated_at: `${currentYear}-03-20T12:00:00Z` },
        { amount: 150.00, validated_at: `${currentYear}-05-10T12:00:00Z` },
        { amount: 120.00, validated_at: new Date(currentYear, currentMonth, 5).toISOString() },
        { amount: 90.00, validated_at: new Date(currentYear, currentMonth, 10).toISOString() },
    ];
})();

const MODALITY_COLORS: Record<string, string> = {
    'Jiu-Jitsu': 'rgb(255, 99, 132)',
    'Crossfit': 'rgb(54, 162, 235)',
    'Musculação': 'rgb(255, 205, 86)',
    'Não Informado': 'rgb(201, 203, 207)'
};

const FREQUENCY_COLORS = [
    'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)', 'rgb(50, 200, 50)', 'rgb(200, 50, 50)'
];

// --- HELPER FUNCTIONS ---
function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function DashboardClient({ tenant }: { tenant: string }) {
    // State
    const [isLoading, setIsLoading] = useState(true);
    const [students, setStudents] = useState(MOCK_STUDENTS);
    const [pendingPayments, setPendingPayments] = useState(INITIAL_PENDING_PAYMENTS);
    const [approvedPayments, setApprovedPayments] = useState(INITIAL_APPROVED_PAYMENTS);
    const [message, setMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null);
    
    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        text: string;
        confirmText: string;
        confirmClass: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        text: '',
        confirmText: '',
        confirmClass: '',
        onConfirm: () => {}
    });

    // Stats State
    const [stats, setStats] = useState({
        annualRevenue: 0,
        nextMonthForecast: 0,
        totalStudents: 0,
        monthlyExpected: 0,
        monthlyReceived: 0,
        monthlyMissing: 0,
    });

    const [modalityFrequencyCounts, setModalityFrequencyCounts] = useState<any>({});
    const [modalityRevenueCounts, setModalityRevenueCounts] = useState<any>({});
    const [selectedModality, setSelectedModality] = useState<string | null>(null);

    // Chart Ref
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    // --- EFFECTS ---

    // Initial Load
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
            calculateStatistics();
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Recalculate stats when data changes
    useEffect(() => {
        if (!isLoading) {
            calculateStatistics();
        }
    }, [students, approvedPayments, isLoading]);

    // Update Chart when stats change
    useEffect(() => {
        if (!isLoading && chartRef.current) {
            if (selectedModality) {
                renderFrequencyChart(selectedModality);
            } else {
                renderPrimaryModalityChart();
            }
        }
    }, [modalityRevenueCounts, modalityFrequencyCounts, selectedModality, isLoading]);


    // --- LOGIC ---

    const calculateStatistics = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);

        let annualRev = 0;
        let monthlyRec = 0;

        approvedPayments.forEach(payment => {
            const validatedDate = new Date(payment.validated_at);
            if (validatedDate.getFullYear() === currentYear) {
                annualRev += payment.amount;
            }
            if (validatedDate >= startOfCurrentMonth && validatedDate < startOfNextMonth) {
                monthlyRec += payment.amount;
            }
        });

        let totalStud = 0;
        let monthlyExp = 0;
        let nextMonthFore = 0;
        
        const modFreqCounts: any = {};
        const modRevCounts: any = {};

        students.forEach(student => {
            const monthlyFee = student.monthly_fee || 100;

            if (student.status === 'active') {
                totalStud++;
                
                // Segmentation
                const mod = student.modality || 'Não Informado';
                const freq = student.classes_per_week || 'Não Informado';
                const genderNormalized = student.gender && student.gender.toLowerCase().startsWith('m') ? 'masc' : 'fem';

                if (!modFreqCounts[mod]) modFreqCounts[mod] = { total: 0 };
                if (!modFreqCounts[mod][freq]) modFreqCounts[mod][freq] = { masc: 0, fem: 0, total: 0 };

                modFreqCounts[mod].total += 1;
                modFreqCounts[mod][freq].total += 1;
                modFreqCounts[mod][freq][genderNormalized] += 1;

                // Revenue
                modRevCounts[mod] = (modRevCounts[mod] || 0) + monthlyFee;
                
                // Forecast
                nextMonthFore += monthlyFee;

                // Expected this month
                const dueDate = new Date(student.due_date);
                if (dueDate >= startOfCurrentMonth && dueDate < startOfNextMonth) {
                    monthlyExp += monthlyFee;
                }
            }
        });

        setStats({
            annualRevenue: annualRev,
            monthlyReceived: monthlyRec,
            monthlyExpected: monthlyExp,
            monthlyMissing: monthlyExp - monthlyRec,
            nextMonthForecast: nextMonthFore,
            totalStudents: totalStud
        });

        setModalityFrequencyCounts(modFreqCounts);
        setModalityRevenueCounts(modRevCounts);
    };

    // --- CHART FUNCTIONS ---

    const updateChart = (type: any, labels: string[], data: number[], title: string, backgroundColors: string[], isRevenueMode: boolean) => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        if (!chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        chartInstanceRef.current = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    hoverOffset: 8,
                    borderWidth: type === 'doughnut' ? 2 : 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true, 
                        position: 'bottom',
                        labels: { font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context: any) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) {
                                    if (isRevenueMode) {
                                        label += formatCurrency(context.parsed as number);
                                    } else {
                                        label += context.parsed + ' alunos';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    const renderPrimaryModalityChart = () => {
        const labels = Object.keys(modalityRevenueCounts);
        const data = labels.map(mod => modalityRevenueCounts[mod]);
        const colors = labels.map(mod => MODALITY_COLORS[mod] || MODALITY_COLORS['Não Informado']);
        
        updateChart('doughnut', labels, data, 'Faturamento Potencial', colors, true);
    };

    const renderFrequencyChart = (modality: string) => {
        const modData = modalityFrequencyCounts[modality];
        if (!modData) return;

        const frequencyData = Object.keys(modData).filter(key => key !== 'total');
        const labels = frequencyData.map(freq => `${freq} Semana`);
        const data = frequencyData.map(freq => modData[freq].total);
        const colors = frequencyData.map((_, index) => FREQUENCY_COLORS[index % FREQUENCY_COLORS.length]);

        updateChart('doughnut', labels, data, `Frequência em ${modality}`, colors, false);
    };

    // --- ACTIONS ---

    const handleApproveClick = (payment: any) => {
        setModalConfig({
            isOpen: true,
            title: "Aprovar Pagamento",
            text: `Confirma a aprovação do pagamento de ${formatCurrency(payment.amount)}?`,
            confirmText: "Confirmar Aprovação",
            confirmClass: "bg-green-500 hover:bg-green-600",
            onConfirm: () => processApproval(payment)
        });
    };

    const handleRejectClick = (paymentId: string) => {
        setModalConfig({
            isOpen: true,
            title: "Rejeitar Pagamento",
            text: "Confirma a rejeição deste pagamento? Esta ação é irreversível no painel (MOCK).",
            confirmText: "Confirmar Rejeição",
            confirmClass: "bg-red-500 hover:bg-red-600",
            onConfirm: () => processRejection(paymentId)
        });
    };

    const processApproval = (payment: any) => {
        // Simulate API call
        setTimeout(() => {
            // Remove from pending
            setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
            
            // Add to approved
            setApprovedPayments(prev => [...prev, {
                amount: payment.amount,
                validated_at: new Date().toISOString()
            }]);

            // Update student due date mock
            setStudents(prev => prev.map(s => {
                if (s.whatsapp === payment.student_whatsapp) {
                    const newDate = new Date();
                    newDate.setDate(newDate.getDate() + 30);
                    return { ...s, due_date: newDate.toISOString().split('T')[0] };
                }
                return s;
            }));

            setModalConfig(prev => ({ ...prev, isOpen: false }));
            showMessageFlash('Pagamento APROVADO e mensalidade atualizada (MOCK)!', 'success');
        }, 500);
    };

    const processRejection = (paymentId: string) => {
        setTimeout(() => {
            setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            showMessageFlash('Pagamento REJEITADO (MOCK).', 'info');
        }, 500);
    };

    const showMessageFlash = (text: string, type: 'info' | 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    };

    // --- RENDER HELPERS ---

    const getModalityItemClass = (modality: string) => {
        let base = "border-b border-gray-200 pb-2 mb-3 px-2 py-1 cursor-pointer transition-all border-l-4 rounded-lg ";
        if (selectedModality === modality) {
            base += "bg-blue-50 border-blue-500 shadow-sm font-semibold";
        } else {
            base += "border-transparent hover:bg-gray-50 hover:border-gray-300";
        }
        return base;
    };

    return (
        <div className="max-w-4xl mx-auto font-sans bg-[#f7f9fb] min-h-screen p-4 sm:p-8">
            <header className="mb-8 p-4 bg-white shadow-lg rounded-xl flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Painel de Validação Financeira <span className="text-lg text-red-500">(DADOS MOCK)</span></h1>
                <div className="text-sm text-gray-500">
                    <span>ID do Gestor: MOCK_GESTOR_123</span>
                </div>
            </header>

            {isLoading ? (
                <div className="text-center p-8">
                    <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-2 text-indigo-600">Carregando dados mock...</p>
                </div>
            ) : (
                <>
                    {/* Message Box */}
                    {message && (
                        <div className={`p-4 mb-4 text-sm rounded-lg ${
                            message.type === 'success' ? 'bg-green-100 text-green-800' : 
                            message.type === 'error' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'
                        }`} role="alert">
                            {message.text}
                        </div>
                    )}

                    {/* Statistics Section */}
                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Visão Geral e Estatísticas</h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-indigo-500">
                                <p className="text-sm font-medium text-gray-500">Faturamento Anual (Acum.)</p>
                                <p className="text-2xl font-bold text-indigo-700 mt-1">{formatCurrency(stats.annualRevenue)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-purple-500">
                                <p className="text-sm font-medium text-gray-500">Previsão Próximo Mês</p>
                                <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(stats.nextMonthForecast)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-green-500">
                                <p className="text-sm font-medium text-gray-500">Total de Alunos Ativos</p>
                                <p className="text-2xl font-bold text-green-700 mt-1">{stats.totalStudents}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                            <h3 className="text-xl font-semibold mb-3 text-gray-700">Status Mensal (Este Mês)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Esperado (Vencimentos)</p>
                                    <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(stats.monthlyExpected)}</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Recebido (Aprovado)</p>
                                    <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(stats.monthlyReceived)}</p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Em Falta (Previsto - Recebido)</p>
                                    <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(Math.max(0, stats.monthlyMissing))}</p>
                                </div>
                            </div>
                        </div>

                        {/* Segmentation */}
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-xl font-semibold mb-3 text-gray-700">Segmentação de Alunos Ativos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                {/* Hierarchical List */}
                                <div className="order-2 md:order-1">
                                    <h4 className="font-medium text-gray-600 mb-2 border-b pb-1">Detalhe Hierárquico</h4>
                                    <div className="space-y-3 text-sm text-gray-700">
                                        {Object.keys(modalityFrequencyCounts).map(modality => (
                                            <div 
                                                key={modality} 
                                                className={getModalityItemClass(modality)}
                                                onClick={() => {
                                                    if (selectedModality === modality) {
                                                        setSelectedModality(null);
                                                    } else {
                                                        setSelectedModality(modality);
                                                    }
                                                }}
                                            >
                                                <p className="text-base font-bold text-indigo-700">
                                                    {modality} (Total: {modalityFrequencyCounts[modality].total} Alunos)
                                                </p>
                                                <ul className="ml-4 mt-1 space-y-1 text-gray-700">
                                                    {Object.keys(modalityFrequencyCounts[modality])
                                                        .filter(key => key !== 'total')
                                                        .sort()
                                                        .map(freq => {
                                                            const freqData = modalityFrequencyCounts[modality][freq];
                                                            return (
                                                                <li key={freq}>
                                                                    <span className="text-sm font-medium">&rarr; {freq} Semana:</span> {freqData.total} alunos
                                                                    <span className="text-xs text-gray-500 ml-2">
                                                                        (masc {freqData.masc || 0}, fem {freqData.fem || 0})
                                                                    </span>
                                                                </li>
                                                            );
                                                        })}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedModality && (
                                        <button 
                                            onClick={() => setSelectedModality(null)}
                                            className="mt-4 text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                        >
                                            Mostrar Faturamento Potencial
                                        </button>
                                    )}
                                </div>

                                {/* Chart */}
                                <div className="order-1 md:order-2">
                                    <h4 className="font-medium text-gray-600 mb-2 border-b pb-1 text-center">
                                        {selectedModality 
                                            ? `Distribuição em ${selectedModality} (Contagem de Alunos)`
                                            : 'Faturamento Potencial por Modalidade'}
                                    </h4>
                                    <div className="relative mx-auto max-h-[350px]"> 
                                        <canvas ref={chartRef}></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Pending Payments List */}
                    <main>
                        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Pagamentos Pendentes</h2>
                        
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                            {pendingPayments.length === 0 ? (
                                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mt-8" role="alert">
                                    <p className="font-bold">Tudo Certo!</p>
                                    <p>Não há pagamentos pendentes de validação no momento.</p>
                                </div>
                            ) : (
                                pendingPayments.map(payment => {
                                    const student = students.find(s => s.whatsapp === payment.student_whatsapp);
                                    const studentName = student ? student.name : 'Aluno Desconhecido';
                                    const paymentDate = new Date(payment.payment_date).toLocaleDateString('pt-BR');

                                    return (
                                        <div key={payment.id} className="bg-white p-5 shadow-md rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center transition duration-300 hover:shadow-lg">
                                            <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                                                <p className="text-lg font-semibold text-gray-800 truncate">{studentName}</p>
                                                <p className="text-sm text-gray-500">WhatsApp: {payment.student_whatsapp}</p>
                                                <p className="text-sm text-gray-600">Data do Pagamento: {paymentDate}</p>
                                                <p className="text-xl font-bold text-indigo-600 mt-1">{formatCurrency(payment.amount)}</p>
                                            </div>
                                            <div className="flex items-center space-x-3 w-full sm:w-auto">
                                                <a href={payment.proof_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium border border-indigo-200 bg-indigo-50 p-2 rounded-lg transition duration-150 whitespace-nowrap">
                                                    Ver Comprovativo
                                                </a>
                                                <button 
                                                    onClick={() => handleApproveClick(payment)}
                                                    className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 whitespace-nowrap"
                                                >
                                                    Aprovar
                                                </button>
                                                <button 
                                                    onClick={() => handleRejectClick(payment.id)}
                                                    className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 whitespace-nowrap"
                                                >
                                                    Rejeitar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </main>
                </>
            )}

            {/* Confirmation Modal */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">{modalConfig.title}</h3>
                        <p className="text-gray-600 mb-6">{modalConfig.text}</p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-150"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={modalConfig.onConfirm}
                                className={`${modalConfig.confirmClass} px-4 py-2 text-white rounded-lg transition duration-150`}
                            >
                                {modalConfig.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}