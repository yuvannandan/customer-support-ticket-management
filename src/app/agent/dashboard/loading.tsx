import AgentSidebar from '@/components/AgentSidebar';
import { Skeleton, SkeletonRow } from '@/components/UIState';

export default function Loading() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AgentSidebar active="dashboard" userName="Loading..." />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-xl border p-5 bg-white">
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="divide-y divide-gray-50">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      </main>
    </div>
  );
}
