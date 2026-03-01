'use client';

import React, { useState, useEffect, useTransition, use } from 'react';
import { getEventRegistrations, submitJudgeScoreAction, getJudgeScoresAction } from '@/app/organizer/actions';
import Link from 'next/link';

export default function JudgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [score, setScore] = useState<number>(5);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [tab, setTab] = useState<'score' | 'leaderboard'>('score');
  const [currentRound, setCurrentRound] = useState(3);

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    setLoading(true);
    const [regRes, scoreRes] = await Promise.all([
      getEventRegistrations(id),
      getJudgeScoresAction(id, currentRound)
    ]);
    // Judge sees only checked-in participants
    const checkedIn = (regRes.registrations || []).filter((r: any) => r.check_in_status === 'checked_in');
    setRegistrations(checkedIn);
    setScores(scoreRes.scores || []);
    setLoading(false);
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.full_name?.toLowerCase().includes(q) || r.registration_number?.toLowerCase().includes(q);
  });

  // Group scores by category for leaderboard
  const categories = ['turbo', 'headers', '4x4'];
  function getTopByCategory(cat: string) {
    return scores
      .filter(s => (s.car_category || '').toLowerCase() === cat && s.avg_score)
      .sort((a, b) => parseFloat(b.avg_score) - parseFloat(a.avg_score))
      .slice(0, 3);
  }

  function handleSubmit() {
    if (!selected) return;
    startTransition(async () => {
      const res = await submitJudgeScoreAction({
        eventId: id,
        roundNumber: currentRound,
        registrationId: selected.id,
        score,
      });
      if (res.success) {
        showToast(`✅ تم تسجيل ${score}/10 لـ ${selected.full_name} — متوسط: ${res.avg}/10 (${res.judgeCount} مقيّم)`, 'success');
        setSelected(null);
        setScore(5);
        loadData();
      } else {
        showToast('خطأ: ' + res.message, 'error');
      }
    });
  }

  function getScoreColor(s: number) {
    if (s >= 8) return 'text-green-400';
    if (s >= 6) return 'text-yellow-400';
    if (s >= 4) return 'text-orange-400';
    return 'text-red-400';
  }

  function getMedalEmoji(pos: number) {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    if (pos === 2) return '🥉';
    return `${pos + 1}.`;
  }

  function getScoreForReg(regId: string) {
    return scores.find(s => s.id === regId);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-2xl max-w-xs text-center ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#111] border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href={`/admin/events/${id}`} className="text-gray-400 text-lg">←</Link>
        <div className="flex-1">
          <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">لجنة التحكيم</div>
          <div className="text-sm font-bold text-white">تقييم المتسابقين — الجولة {currentRound}</div>
        </div>
        <div className="text-xs text-gray-400 font-mono">{registrations.length} متسابق</div>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-gray-800">
        <button
          onClick={() => setTab('score')}
          className={`py-3 text-sm font-bold transition ${tab === 'score' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500'}`}
        >
          🎯 التقييم
        </button>
        <button
          onClick={() => { setTab('leaderboard'); loadData(); }}
          className={`py-3 text-sm font-bold transition ${tab === 'leaderboard' ? 'text-yellow-400 border-b-2 border-yellow-500' : 'text-gray-500'}`}
        >
          🏆 الترتيب
        </button>
      </div>

      {/* Score Tab */}
      {tab === 'score' && (
        <>
          <div className="px-4 pt-4 pb-2">
            <input
              type="text"
              placeholder="🔍 بحث بالاسم أو رقم التسجيل..."
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="px-4 pb-24 space-y-3 mt-2">
            {loading ? (
              <div className="text-center text-gray-500 pt-12">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 pt-12">لا يوجد متسابقون داخل الفعالية بعد</div>
            ) : filtered.map(reg => {
              const regScore = getScoreForReg(reg.id);
              return (
                <button
                  key={reg.id}
                  onClick={() => { setSelected(reg); setScore(5); }}
                  className="w-full text-right p-4 rounded-2xl border-2 border-gray-700 bg-gray-800/50 hover:border-purple-600 transition-all flex items-center gap-3"
                >
                  <div className="w-3 h-12 rounded-full flex-shrink-0 bg-purple-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white truncate">{reg.full_name}</span>
                      {regScore?.avg_score
                        ? <span className={`text-sm font-bold ${getScoreColor(parseFloat(regScore.avg_score))}`}>{regScore.avg_score}/10</span>
                        : <span className="text-xs text-gray-500">لم يُقيّم</span>
                      }
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                      <span className="font-mono">{reg.registration_number}</span>
                      <span className="text-orange-400">{reg.car_category?.toUpperCase()}</span>
                      <span>{reg.car_make} {reg.car_model}</span>
                    </div>
                    {regScore && (
                      <div className="text-xs text-gray-500 mt-1">{regScore.judge_count} مقيّم قيّموا</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div className="px-4 py-4 pb-24 space-y-6">
          {loading ? (
            <div className="text-center text-gray-500 pt-12">جاري التحميل...</div>
          ) : categories.map(cat => {
            const top = getTopByCategory(cat);
            return (
              <div key={cat} className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                <div className={`px-4 py-3 font-bold text-sm uppercase flex items-center gap-2 ${
                  cat === 'turbo' ? 'bg-red-900/40 text-red-400' :
                  cat === 'headers' ? 'bg-blue-900/40 text-blue-400' :
                  'bg-green-900/40 text-green-400'
                }`}>
                  {cat === 'turbo' ? '🔥' : cat === 'headers' ? '💨' : '🚗'} {cat.toUpperCase()}
                </div>
                {top.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-gray-500">لا توجد تقييمات بعد</div>
                ) : top.map((s: any, idx: number) => (
                  <div key={s.id} className={`flex items-center gap-3 px-4 py-3 border-t border-gray-800 ${idx === 0 ? 'bg-yellow-500/5' : ''}`}>
                    <span className="text-2xl w-8 text-center">{getMedalEmoji(idx)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{s.full_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{s.registration_number} — {s.car_make} {s.car_model}</div>
                    </div>
                    <div className={`text-xl font-black ${getScoreColor(parseFloat(s.avg_score))}`}>
                      {s.avg_score}
                      <span className="text-xs text-gray-500 font-normal">/10</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Score Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-end" dir="rtl">
          <div className="bg-[#1a1a1a] rounded-t-3xl border-t border-gray-700 p-6 max-h-[92vh] overflow-y-auto">
            {/* Car Photo */}
            {selected.car_photo_url && (
              <img src={selected.car_photo_url} alt="Car" className="w-full rounded-2xl max-h-40 object-cover mb-4" />
            )}

            <div className="text-center mb-1">
              <div className="font-bold text-white text-lg">{selected.full_name}</div>
              <div className="text-sm text-orange-400 font-bold">{selected.car_category?.toUpperCase()} — {selected.car_make} {selected.car_model}</div>
              <div className="text-xs text-gray-400 font-mono mt-1">{selected.registration_number}</div>
            </div>

            {/* Score Slider */}
            <div className="mt-6 mb-4">
              <div className={`text-center text-6xl font-black mb-4 ${getScoreColor(score)}`}>
                {score}<span className="text-2xl text-gray-500">/10</span>
              </div>

              {/* Score Buttons */}
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setScore(n)}
                    className={`py-4 rounded-xl font-black text-lg transition active:scale-95 ${
                      score === n
                        ? n >= 8 ? 'bg-green-500 text-white shadow-lg shadow-green-900/50'
                          : n >= 6 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-900/50'
                          : n >= 4 ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/50'
                          : 'bg-red-600 text-white shadow-lg shadow-red-900/50'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => setSelected(null)} className="flex-1 py-4 rounded-2xl bg-gray-800 text-gray-300 font-bold text-lg">إلغاء</button>
              <button
                disabled={isPending}
                onClick={handleSubmit}
                className="flex-1 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg disabled:opacity-50 active:scale-95 transition"
              >
                {isPending ? '...' : `✅ إرسال ${score}/10`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}