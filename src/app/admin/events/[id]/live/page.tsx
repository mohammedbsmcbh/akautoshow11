'use client';

import React, { useState, useEffect, use } from 'react';
import { getLiveStatsAction, getJudgeScoresAction } from '@/app/organizer/actions';
import Link from 'next/link';

export default function LiveDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stats, setStats] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function loadData() {
    const [s, sc] = await Promise.all([
      getLiveStatsAction(id),
      getJudgeScoresAction(id, 3)
    ]);
    setStats(s);
    setScores(sc.scores || []);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [id]);

  const categories = ['turbo', 'headers', '4x4'];

  function getTopByCategory(cat: string) {
    return scores
      .filter(s => (s.car_category || '').toLowerCase() === cat && s.avg_score)
      .sort((a: any, b: any) => parseFloat(b.avg_score) - parseFloat(a.avg_score))
      .slice(0, 3);
  }

  function getMedalEmoji(pos: number) {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    if (pos === 2) return '🥉';
    return `${pos + 1}.`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
          جاري التحميل...
        </div>
      </div>
    );
  }

  const currentRound = stats?.currentRound ?? 3;
  const approved = parseInt(stats?.approved || 0);
  const gate1Passed = parseInt(stats?.gate1_passed || 0);
  const gate1Rejected = parseInt(stats?.gate1_rejected || 0);
  const entered = parseInt(stats?.entered || 0);
  const gate2Rejected = parseInt(stats?.gate2_rejected || 0);
  const exits = parseInt(stats?.exits || 0);
  const reentries = parseInt(stats?.reentries || 0);
  const insideNow = entered - exits + reentries;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      <header className="sticky top-0 z-40 bg-[#111] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/events/${id}`} className="text-gray-400 text-lg">←</Link>
          <div>
            <div className="text-xs text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
              مباشر
            </div>
            <div className="text-sm font-bold text-white">لوحة التحكم — الجولة {currentRound}</div>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          آخر تحديث: {lastUpdated.toLocaleTimeString('ar-BH')}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="إجمالي المقبولين" value={approved} color="indigo" icon="👥" />
          <StatCard label="داخل الفعالية الآن" value={insideNow} color="green" icon="🏟️" pulse />
        </div>

        {/* Gate Flow */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-4">
          <div className="text-xs text-gray-500 uppercase font-bold mb-3">تدفق البوابات</div>

          <div className="space-y-2">
            {/* Gate 1 */}
            <div className="flex items-center gap-3">
              <div className="w-16 text-xs text-orange-400 font-bold text-left">B1</div>
              <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: approved > 0 ? `${(gate1Passed / approved) * 100}%` : '0%' }}
                />
              </div>
              <div className="w-8 text-xs text-right font-bold text-orange-400">{gate1Passed}</div>
            </div>

            {/* Gate 2 */}
            <div className="flex items-center gap-3">
              <div className="w-16 text-xs text-blue-400 font-bold text-left">B2</div>
              <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: gate1Passed > 0 ? `${(entered / gate1Passed) * 100}%` : '0%' }}
                />
              </div>
              <div className="w-8 text-xs text-right font-bold text-blue-400">{entered}</div>
            </div>
          </div>
        </div>

        {/* Detail Grid */}
        <div className="grid grid-cols-3 gap-2">
          <MiniCard label="اجتاز B1" value={gate1Passed} color="orange" />
          <MiniCard label="رفض B1" value={gate1Rejected} color="red" />
          <MiniCard label="رفض B2" value={gate2Rejected} color="red" />
          <MiniCard label="دخل" value={entered} color="green" />
          <MiniCard label="خرج" value={exits} color="gray" />
          <MiniCard label="رجع" value={reentries} color="blue" />
        </div>

        {/* Leaderboard */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 uppercase font-bold">🏆 الترتيب الحالي</div>
          {categories.map(cat => {
            const top = getTopByCategory(cat);
            if (top.length === 0) return null;
            return (
              <div key={cat} className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                <div className={`px-3 py-2 text-xs font-bold uppercase ${
                  cat === 'turbo' ? 'bg-red-900/40 text-red-400' :
                  cat === 'headers' ? 'bg-blue-900/40 text-blue-400' :
                  'bg-green-900/40 text-green-400'
                }`}>
                  {cat === 'turbo' ? '🔥' : cat === 'headers' ? '💨' : '🚗'} {cat}
                </div>
                {top.map((s: any, idx: number) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-800">
                    <span className="text-lg w-7 text-center">{getMedalEmoji(idx)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{s.full_name}</div>
                      <div className="text-xs text-gray-400">{s.car_make} {s.car_model}</div>
                    </div>
                    <div className={`text-lg font-black ${
                      parseFloat(s.avg_score) >= 8 ? 'text-green-400' :
                      parseFloat(s.avg_score) >= 6 ? 'text-yellow-400' : 'text-orange-400'
                    }`}>
                      {s.avg_score}<span className="text-xs text-gray-500">/10</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadData}
          className="w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm transition active:scale-95"
        >
          🔄 تحديث يدوي
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, pulse }: { label: string; value: number; color: string; icon: string; pulse?: boolean }) {
  const colors: Record<string, string> = {
    indigo: 'border-indigo-700 bg-indigo-900/20',
    green: 'border-green-700 bg-green-900/20',
    orange: 'border-orange-700 bg-orange-900/20',
    red: 'border-red-700 bg-red-900/20',
  };
  const textColors: Record<string, string> = {
    indigo: 'text-indigo-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color] || 'border-gray-700 bg-gray-800'}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-3xl font-black ${textColors[color] || 'text-white'} ${pulse ? 'animate-pulse' : ''}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: number; color: string }) {
  const textColors: Record<string, string> = {
    green: 'text-green-400', red: 'text-red-400',
    orange: 'text-orange-400', blue: 'text-blue-400', gray: 'text-gray-400',
  };
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-3 text-center">
      <div className={`text-xl font-black ${textColors[color] || 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}