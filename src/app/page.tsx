import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-8">
      <main className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-12 text-center">
          <div className="mb-8">
            <span className="inline-block p-4 rounded-full bg-blue-100 text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Customer Support Ticket Management System
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
              A centralized platform for managing customer support requests, tracking ticket status, and improving support operations.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link 
              href="#" 
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
            <Link 
              href="/api/health" 
              className="px-8 py-3 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              System Health
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="mt-12 text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Customer Support Ticket Management System. All rights reserved.
      </footer>
    </div>
  );
}
