import React, { useState, useEffect } from 'react';
import { GoogleDriveManager } from '../components/GoogleDriveManager';
import { HardDrive, ShieldCheck, FileSpreadsheet, FileText, UploadCloud, Download, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function DrivePage() {
  const { profile } = useAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      const fetchInquiries = async () => {
        setLoadingInquiries(true);
        try {
          let query = supabase.from('inquiries_gated').select('*, properties(title)');
          if (profile.role === 'landlord' || profile.role === 'caretaker' || profile.role === 'agent') {
            query = query.eq('landlord_id', profile.id);
          }
          const { data } = await query;
          if (data) setInquiries(data);
        } catch (err) {
          console.error('Failed to fetch inquiries for drive page:', err);
        } finally {
          setLoadingInquiries(false);
        }
      };
      fetchInquiries();
    }
  }, [profile]);

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page Hero Header */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-emerald-950 text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-500/30">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Google Workspace Integration</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Google Drive Document Hub
            </h1>

            <p className="text-stone-300 text-sm leading-relaxed">
              Seamlessly manage property documents, backup tenancy contracts, store property photos, and export tenant lead records directly to your Google Drive account with full permission.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-stone-300">
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Export Tenant Leads to CSV</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Backup Property Agreements</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>OAuth 2.0 Google Security</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-emerald-500/50 transition">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1">Lead Record Exports</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Export all tenant inquiries into clean Google Drive spreadsheet reports for off-line analysis and CRM sync.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-emerald-500/50 transition">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1">Property Vault</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Store title deeds, floor plans, water/electricity bills, and property photos safely in your Google Drive folders.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-emerald-500/50 transition">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1">Tenancy Agreements</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Auto-generate property summary files and tenancy agreements directly stored in your Google Drive account.
            </p>
          </div>
        </div>

        {/* Google Drive Main Manager */}
        <GoogleDriveManager inquiries={inquiries} propertyTitle="NestList Landlord Export" />

      </div>
    </div>
  );
}
