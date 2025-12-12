import { getDashboardStats, getSegmentationData } from '../../actions';
import DashboardClient from './dashboard-client';

// Este é um Server Component
export default async function DashboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  // Busca dados iniciais no servidor
  const stats = await getDashboardStats();
  const segmentation = await getSegmentationData();

  return (
    <DashboardClient 
      tenantName={tenant}
      initialStats={stats}
      initialSegmentation={segmentation}
    />
  );
}