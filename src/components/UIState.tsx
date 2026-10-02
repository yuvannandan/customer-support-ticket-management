import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center space-x-4 py-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function EmptyState({ 
  icon = '📝', 
  title, 
  description, 
  action 
}: { 
  icon?: React.ReactNode; 
  title: string; 
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-10 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="text-5xl mb-4 text-gray-300">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorAlert({ title = 'Error', message }: { title?: string, message: string }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm mb-6" role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-red-500 font-bold">⚠️</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-1 text-sm text-red-700">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
