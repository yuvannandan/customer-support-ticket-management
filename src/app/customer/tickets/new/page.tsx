'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerSidebar from '@/components/CustomerSidebar';
import { ErrorAlert } from '@/components/UIState';

interface Category {
  id: string;
  name: string;
}

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export default function CreateTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => { if (d.categories) setCategories(d.categories); })
      .catch(() => {});

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d?.user?.name) setUserName(d.user.name); })
      .catch(() => {});
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Subject is required';
    else if (title.trim().length < 5) errs.title = 'Subject must be at least 5 characters';
    if (!description.trim()) errs.description = 'Description is required';
    else if (description.trim().length < 10) errs.description = 'Description must be at least 10 characters';
    if (!categoryId) errs.categoryId = 'Please select a category';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, categoryId, priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');
      setSuccess(`Ticket ${data.ticket.ticketNumber} created successfully!`);
      setTimeout(() => router.push(`/customer/tickets/${data.ticket.id}`), 1200);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <CustomerSidebar active="new-ticket" userName={userName || 'Customer'} />

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Create Support Ticket</h1>
            <p className="text-gray-500 text-sm mt-1">Describe your issue and we'll get back to you.</p>
          </div>

          {success && (
            <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
              ✅ {success}
            </div>
          )}

          {error && <ErrorAlert message={error} />}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Subject */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.title ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
              </div>

              {/* Category + Priority side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.categoryId ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {fieldErrors.categoryId && <p className="mt-1 text-xs text-red-600">{fieldErrors.categoryId}</p>}
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${fieldErrors.description ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.description && <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>}
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
