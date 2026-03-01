'use client';

import React, { useState, useEffect, useTransition, use } from 'react';
import { getEventRegistrations, gate2PassAction, gate2RejectAction, recordExitAction, recordReEntryAction } from '../../../actions';
import Link from 'next/link';

export default function Gate2Page({ params }: { params: Promise<{ id: string }> }) {
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
    // Gate 2 only sees gate1=passed
    const gate1Passed = (res.registrations || []).filter((r: any) => r.gate1_status === 'passed');
    setRegistrations(gate1Passed);
    setLoading(false);
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.registration_number?.toLowerCase().includes(q) ||
      r.phone_number?.includes(q)
    );
  });

  function statusColor(r: any) {
    if (r.check_in_status === 'checked_in') return 'border-green-500 bg-green-500/10';
    if (r.inspection_status === 'rejected') return 'border-red-500 bg-red-500/10';
    return 'border-blue-700 bg-blue-900/20';
  }

  function statusBadge(r: any) {
    if (r.check_in_status === 'checked_in') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">✅ دخل</span>;
    if (r.inspection_status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">❌ مرفوض</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">🔵 اجتاز B1</span>;
  }

  function handlePass(reg: any) {
    startTransition(async () => {
      const res = await gate2PassAction({ regId: reg.id, eventId: id });
      if (res.success) {
        showToast(`✅ تم الدخول: ${reg.full_name}`, 'success');
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
      const res = await gate2RejectAction({ regId: reg.id, eventId: id, notes: rejectNotes });
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

  function handleExit(reg: any) {
    startTransition(async () => {
      const res = await recordExitAction({ regId: reg.id, eventId: id });
      if (res.success) { showToast(`خروج مسجّل: ${reg.full_name}`, 'success'); setSelected(null); }
    });
  }

  function handleReEntry(reg: any) {
    startTransition(async () => {
      const res = await recordReEntryAction({ regId: reg.id, eventId: id });
      if (res.success) { showToast(`✅ إعادة دخول: ${reg.full_name}`, 'success'); setSelected(null); }
    });
  }

  const waitingCount = filtered.filter(r => r.check_in_status !== 'checked_in' && r.inspection_status !== 'rejected').length;
  const enteredCount = filtered.filter(r => r.check_in_status === 'checked_in').length;
  const rejectedCount = filtered.filter(r => r.inspection_status === 'rejected').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-2xl ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#111] border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href={`/organizer/events/${id}`} className="text-gray-400 text-lg">←</Link>
        <div className="flex-1">
          <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">البوابة الثانية</div>
          <div className="text-sm font-bold text-white">الفحص الفني والأمني</div>
        </div>
        <div className="text-xs text-gray-400 font-mono">{enteredCount}/{filtered.length}</div>
      </header>

      <div className="grid grid-cols-3 gap-0 text-center text-xs font-bold border-b border-gray-800">
        <div className="py-2 bg-blue-500/10 text-blue-400">🔵 {waitingCount} ينتظر</div>
        <div className="py-2 bg-green-500/10 text-green-400">✅ {enteredCount} دخل</div>
        <div className="py-2 bg-red-500/10 text-red-400">❌ {rejectedCount} مرفوض</div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <input
          type="text"
          placeholder="🔍 بحث بالاسم / رقم التسجيل / الهاتف..."
          className="w-full bg-[#1a1a1a] border border-gray-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="px-4 pb-24 space-y-3 mt-2">
        {loading ? (
          <div className="text-center text-gray-500 pt-12">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 pt-12">لا يوجد أحد اجتاز البوابة 1 بعد</div>
        ) : filtered.map(reg => (
          <button
            key={reg.id}
            onClick={() => setSelected(reg)}
            className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${statusColor(reg)} flex items-center gap-3`}
          >
            <div className={`w-3 h-12 rounded-full flex-shrink-0 ${
              reg.check_in_status === 'checked_in' ? 'bg-green-500' :
              reg.inspection_status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white truncate">{reg.full_name}</span>
                {statusBadge(reg)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                <span className="font-mono">{reg.registration_number}</span>
                <span>{reg.car_category?.toUpperCase()}</span>
                <span>{reg.car_make} {reg.car_model}</span>
              </div>
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
            {statusBadge(selected)}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Car Details */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase mb-3 font-bold">بيانات السيارة الفنية</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-black/40 rounded-xl p-3">
                  <div className="text-xs text-gray-500">الفئة</div>
                  <div className="text-orange-400 font-bold mt-1">{selected.car_category?.toUpperCase()}</div>
                </div>
                <div className="bg-black/40 rounded-xl p-3">
                  <div className="text-xs text-gray-500">السنة</div>
                  <div className="text-white font-bold mt-1">{selected.car_year}</div>
                </div>
                <div className="bg-black/40 rounded-xl p-3 col-span-2">
                  <div className="text-xs text-gray-500">النوع</div>
                  <div className="text-white font-bold mt-1">{selected.car_make} {selected.car_model}</div>
                </div>
              </div>
            </div>

            {/* Safety Checklist */}
            {Array.isArray(selected.safety_checklist) && selected.safety_checklist.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-yellow-800/40">
                <div className="text-xs text-yellow-400 uppercase mb-3 font-bold">⚠️ قائمة السلامة المُبلّغ عنها</div>
                <div className="space-y-2">
                  {selected.safety_checklist.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-200">
                      <span className="text-yellow-500">•</span>
                      {String(item)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Car Photo */}
            {selected.car_photo_url && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800">
                <div className="text-xs text-gray-500 uppercase mb-2 font-bold">صورة السيارة</div>
                <img src={selected.car_photo_url} alt="Car" className="w-full rounded-xl max-h-56 object-cover" />
              </div>
            )}

            {/* Passenger */}
            {selected.has_passenger && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-yellow-800/40">
                <div className="text-xs text-yellow-400 uppercase mb-2 font-bold">⚠️ مرافق: {selected.passenger_name}</div>
                {selected.passenger_cpr_photo_url && (
                  <img src={selected.passenger_cpr_photo_url} alt="Passenger CPR" className="w-full rounded-xl max-h-40 object-cover" />
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-4 bg-[#111] border-t border-gray-800 space-y-3">
            {selected.check_in_status !== 'checked_in' ? (
              <>
                <button
                  disabled={isPending}
                  onClick={() => handlePass(selected)}
                  className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg transition disabled:opacity-50"
                >
                  {isPending ? '...' : '✅ اجتاز الفحص — دخول الفعالية'}
                </button>
                <button
                  disabled={isPending}
                  onClick={() => setShowRejectModal(true)}
                  className="w-full bg-red-900/60 hover:bg-red-900 active:scale-95 border border-red-700 text-red-300 font-bold py-4 rounded-2xl text-lg transition disabled:opacity-50"
                >
                  ❌ رفض فني
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isPending}
                  onClick={() => handleExit(selected)}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-2xl transition disabled:opacity-50"
                >
                  🚪 تسجيل خروج
                </button>
                <button
                  disabled={isPending}
                  onClick={() => handleReEntry(selected)}
                  className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition disabled:opacity-50"
                >
                  🔄 إعادة دخول
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selected && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col justify-end" dir="rtl">
          <div className="bg-[#1a1a1a] rounded-t-3xl p-6 border-t border-gray-700">
            <div className="text-center font-bold text-white mb-1">سبب الرفض الفني</div>
            <div className="text-center text-sm text-gray-400 mb-4">{selected.full_name}</div>
            <textarea
              className="w-full bg-[#111] border border-gray-700 text-white rounded-xl p-3 text-sm outline-none focus:border-red-500 min-h-[100px] resize-none"
              placeholder="مثل: الإطارات غير مطابقة / تسرب زيت / بدون حزام أمان..."
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
