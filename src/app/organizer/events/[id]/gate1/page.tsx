'use client';

import React, { useState, useEffect, useTransition, use } from 'react';
import { getEventRegistrations, gate1PassAction, gate1RejectAction } from '../../../actions';
import Link from 'next/link';

export default function Gate1Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    setLoading(true);
    const res = await getEventRegistrations(id);
    setRegistrations(res.registrations || []);
    setLoading(false);
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = registrations.filter(r => {
    if (r.status !== 'approved') return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.registration_number?.toLowerCase().includes(q) ||
      r.phone_number?.includes(q)
    );
  });

  function gate1Color(r: any) {
    if (r.gate1_status === 'passed') return 'border-green-500 bg-green-500/10';
    if (r.gate1_status === 'rejected') return 'border-red-500 bg-red-500/10';
    return 'border-gray-700 bg-gray-800';
  }

  function gate1Badge(r: any) {
    if (r.gate1_status === 'passed') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">✅ اجتاز</span>;
    if (r.gate1_status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">❌ مرفوض</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">⏳ لم يُفحص</span>;
  }

  function handlePass(reg: any) {
    startTransition(async () => {
      const res = await gate1PassAction({ regId: reg.id, eventId: id });
      if (res.success) {
        showToast(`✅ تم قبول ${reg.full_name} في البوابة 1`, 'success');
        setSelected(null);
        loadData();
      } else {
        showToast('خطأ: ' + res.message, 'error');
      }
    });
  }

  function handleRejectConfirm(reg: any) {
    if (!rejectNotes.trim()) { showToast('يرجى كتابة سبب الرفض', 'error'); return; }
    startTransition(async () => {
      const res = await gate1RejectAction({ regId: reg.id, eventId: id, notes: rejectNotes });
      if (res.success) {
        showToast(`❌ تم رفض ${reg.full_name}`, 'success');
        setSelected(null);
        setShowRejectModal(false);
        setRejectNotes('');
        loadData();
      } else {
        showToast('خطأ: ' + res.message, 'error');
      }
    });
  }

  const pendingCount = filtered.filter(r => !r.gate1_status).length;
  const passedCount = filtered.filter(r => r.gate1_status === 'passed').length;
  const rejectedCount = filtered.filter(r => r.gate1_status === 'rejected').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-2xl ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#111] border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href={`/organizer/events/${id}`} className="text-gray-400 text-lg">←</Link>
        <div className="flex-1">
          <div className="text-xs text-orange-400 font-bold uppercase tracking-wider">البوابة الأولى</div>
          <div className="text-sm font-bold text-white">التحقق من الهوية والتسجيل</div>
        </div>
        <div className="text-xs text-gray-400 font-mono">{passedCount}/{filtered.length}</div>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-0 text-center text-xs font-bold border-b border-gray-800">
        <div className="py-2 bg-yellow-500/10 text-yellow-400">⏳ {pendingCount} لم يُفحص</div>
        <div className="py-2 bg-green-500/10 text-green-400">✅ {passedCount} اجتاز</div>
        <div className="py-2 bg-red-500/10 text-red-400">❌ {rejectedCount} مرفوض</div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <input
          type="text"
          placeholder="🔍 بحث بالاسم / رقم التسجيل / الهاتف..."
          className="w-full bg-[#1a1a1a] border border-gray-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="px-4 pb-24 space-y-3 mt-2">
        {loading ? (
          <div className="text-center text-gray-500 pt-12">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 pt-12">لا توجد نتائج</div>
        ) : filtered.map(reg => (
          <button
            key={reg.id}
            onClick={() => setSelected(reg)}
            className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${gate1Color(reg)} flex items-center gap-3`}
          >
            {/* QR Color Indicator */}
            <div className={`w-3 h-12 rounded-full flex-shrink-0 ${
              reg.gate1_status === 'passed' ? 'bg-green-500' :
              reg.gate1_status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white truncate">{reg.full_name}</span>
                {gate1Badge(reg)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                <span className="font-mono">{reg.registration_number}</span>
                <span>{reg.car_category?.toUpperCase()}</span>
                <span>{reg.car_make} {reg.car_model}</span>
              </div>
              {reg.gate1_status === 'rejected' && reg.gate1_notes && (
                <div className="text-xs text-red-400 mt-1">سبب: {reg.gate1_notes}</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" dir="rtl">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#111]">
            <button onClick={() => setSelected(null)} className="text-gray-400 text-xl">←</button>
            <div className="flex-1">
              <div className="font-bold text-white">{selected.full_name}</div>
              <div className="text-xs font-mono text-gray-400">{selected.registration_number}</div>
            </div>
            {gate1Badge(selected)}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Car Info */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase mb-2 font-bold">معلومات السيارة</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">النوع:</span> <span className="text-white font-bold">{selected.car_make} {selected.car_model}</span></div>
                <div><span className="text-gray-400">السنة:</span> <span className="text-white font-bold">{selected.car_year}</span></div>
                <div><span className="text-gray-400">الفئة:</span> <span className="text-orange-400 font-bold">{selected.car_category?.toUpperCase()}</span></div>
                <div><span className="text-gray-400">الجولة:</span> <span className="text-white font-bold">{selected.round_number}</span></div>
              </div>
            </div>

            {/* Driver CPR Photo */}
            {selected.driver_cpr_photo_url && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800">
                <div className="text-xs text-gray-500 uppercase mb-2 font-bold">هوية السائق (CPR)</div>
                <img src={selected.driver_cpr_photo_url} alt="CPR" className="w-full rounded-xl max-h-48 object-cover" />
              </div>
            )}

            {/* Passenger */}
            {selected.has_passenger && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-yellow-800/40">
                <div className="text-xs text-yellow-400 uppercase mb-2 font-bold">⚠️ يوجد مرافق</div>
                <div className="text-sm text-white font-bold">{selected.passenger_name}</div>
                {selected.passenger_cpr_photo_url && (
                  <img src={selected.passenger_cpr_photo_url} alt="Passenger CPR" className="w-full rounded-xl max-h-48 object-cover mt-2" />
                )}
              </div>
            )}

            {/* Car Photo */}
            {selected.car_photo_url && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800">
                <div className="text-xs text-gray-500 uppercase mb-2 font-bold">صورة السيارة</div>
                <img src={selected.car_photo_url} alt="Car" className="w-full rounded-xl max-h-48 object-cover" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-4 bg-[#111] border-t border-gray-800 space-y-3">
            {selected.gate1_status !== 'passed' && (
              <button
                disabled={isPending}
                onClick={() => handlePass(selected)}
                className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg transition disabled:opacity-50"
              >
                {isPending ? '...' : '✅ قبول — تحويل للبوابة 2'}
              </button>
            )}
            <button
              disabled={isPending}
              onClick={() => setShowRejectModal(true)}
              className="w-full bg-red-900/60 hover:bg-red-900 active:scale-95 border border-red-700 text-red-300 font-bold py-4 rounded-2xl text-lg transition disabled:opacity-50"
            >
              ❌ رفض
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selected && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col justify-end" dir="rtl">
          <div className="bg-[#1a1a1a] rounded-t-3xl p-6 border-t border-gray-700">
            <div className="text-center font-bold text-white mb-4">سبب رفض: {selected.full_name}</div>
            <textarea
              className="w-full bg-[#111] border border-gray-700 text-white rounded-xl p-3 text-sm outline-none focus:border-red-500 min-h-[100px] resize-none"
              placeholder="اكتب سبب الرفض..."
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowRejectModal(false); setRejectNotes(''); }} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold">إلغاء</button>
              <button
                disabled={isPending}
                onClick={() => handleRejectConfirm(selected)}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50"
              >
                {isPending ? '...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
