import React from 'react';

type Status =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const STATUS_STYLES: Record<Status, string> = {
  OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
  ASSIGNED: 'bg-purple-100 text-purple-800 border-purple-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  WAITING_FOR_CUSTOMER: 'bg-orange-100 text-orange-800 border-orange-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
  CLOSED: 'bg-gray-100 text-gray-700 border-gray-200',
  REOPENED: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS: Record<Status, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_CUSTOMER: 'Waiting',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200',
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  const style = STATUS_STYLES[s] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const label = STATUS_LABELS[s] ?? status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as Priority;
  const style = PRIORITY_STYLES[p] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {priority}
    </span>
  );
}
