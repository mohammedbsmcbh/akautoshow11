'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Users, CheckCircle, XCircle, Clock, Trophy, Flag, ToggleLeft, ToggleRight, Calendar } from 'lucide-react';

interface EventStats {
  eventName: string;
  eventDate: string;
  location: string;
  eventStatus: string;
  totalRegistrations: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  attendanceConfirmedCount: number;
  attendanceNotConfirmedCount: number;
}

type Round = {
  id: string;
  name: string;
  round_order: number;
  status: string;
  round_date: string;
  registration_count: number;
  pending_count: number;
  approved_count: number;
};

export default function EventDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTogglingReg, setIsTogglingReg] = useState(false);

  const loadStats = () => {
    Promise.all([
      fetch(`/api/admin/events/${id}/stats`).then(r => r.json()),
      fetch(`/api/admin/events/${id}/rounds`).then(r => r.json()),
    ]).then(([statsData, roundsData]) => {
      setStats(statsData);
      if (roundsData.success) setRounds(roundsData.data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadStats();
  }, [id]);

  const handleToggleRegistration = async () => {
    if (!stats) return;
    const isCurrentlyActive = stats.eventStatus === 'active';
    const newStatus = isCurrentlyActive ? 'paused' : 'active';
    const confirmMsg = isCurrentlyActive 
      ? 'هل تريد إيقاف التسجيل مؤقتاً؟' 
      : 'هل تريد فتح التسجيل مجدداً؟';
    if (!window.confirm(confirmMsg)) return;
    setIsTogglingReg(true);
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setStats(prev => prev ? { ...prev, eventStatus: newStatus } : prev);
      } else {
        alert('حدث خطأ في تحديث حالة التسجيل');
      }
    } catch {
      alert('حدث خطأ غير متوقع');
    } finally {
      setIsTogglingReg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-600"></div>
      </div>
    );
  }

  const isRegActive = stats?.eventStatus === 'active';

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-red-600 mb-2">
              {stats?.eventName || 'لوحة تحكم الفعالية'}
            </h1>
            <div className="flex gap-6 text-gray-400 text-sm">
              <span>📅 {stats?.eventDate}</span>
              <span>📍 {stats?.location}</span>
            </div>
          </div>
          
          {/* Registration Toggle */}
          <div className="flex flex-col items-end gap-2">
            <div className={`text-sm font-semibold px-3 py-1 rounded-full border ${isRegActive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
              {isRegActive ? '✅ التسجيل مفتوح' : '⏸️ التسجيل موقوف'}
            </div>
            <button
              onClick={handleToggleRegistration}
              disabled={isTogglingReg}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 ${
                isRegActive 
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isTogglingReg ? (
                <span className="animate-spin">⏳</span>
              ) : isRegActive ? (
                <><ToggleRight className="w-5 h-5" /> إيقاف التسجيل مؤقتاً</>
              ) : (
                <><ToggleLeft className="w-5 h-5" /> فتح التسجيل</>
              )}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-700/50 rounded-2xl p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-4xl font-black text-blue-400">{stats?.totalRegistrations || 0}</span>
            </div>
            <p className="text-gray-300 font-bold">إجمالي التسجيلات</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-700/50 rounded-2xl p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-400" />
              <span className="text-4xl font-black text-yellow-400">{stats?.pendingCount || 0}</span>
            </div>
            <p className="text-gray-300 font-bold">قيد المراجعة</p>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-700/50 rounded-2xl p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <span className="text-4xl font-black text-green-400">{stats?.approvedCount || 0}</span>
            </div>
            <p className="text-gray-300 font-bold">مقبول</p>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 border border-red-700/50 rounded-2xl p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-red-400" />
              <span className="text-4xl font-black text-red-400">{stats?.rejectedCount || 0}</span>
            </div>
            <p className="text-gray-300 font-bold">مرفوض</p>
          </div>
        </div>

        {/* Attendance Confirmation Stats */}
        {(stats?.approvedCount ?? 0) > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border border-emerald-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">✅</span>
                <span className="text-4xl font-black text-emerald-400">{stats?.attendanceConfirmedCount || 0}</span>
              </div>
              <p className="text-gray-300 font-bold">أكد حضوره</p>
              <p className="text-gray-500 text-xs mt-1">من أصل {stats?.approvedCount || 0} مقبول</p>
            </div>
            <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border border-orange-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">⏳</span>
                <span className="text-4xl font-black text-orange-400">{stats?.attendanceNotConfirmedCount || 0}</span>
              </div>
              <p className="text-gray-300 font-bold">لم يؤكد حضوره بعد</p>
              <p className="text-gray-500 text-xs mt-1">مقبولون لكن لم يضغطوا تأكيد</p>
            </div>
          </div>
        )}

        {/* Organizer Field Tools (New) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-green-500">📱</span> أدوات المنظم الميدانية (جديد)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href={`/organizer/events/${id}/gate1`} target="_blank" className="bg-[#1a1a1a] border border-orange-700/50 hover:border-orange-500 rounded-xl p-5 text-center transition group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-orange-600 text-[10px] font-bold px-2 rounded-bl-lg">MOBILE</div>
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔶</div>
              <div className="font-bold text-orange-400 text-lg">البوابة 1</div>
              <div className="text-xs text-gray-500 mt-1">التحقق من الهوية</div>
            </Link>

            <Link href={`/organizer/events/${id}/gate2`} target="_blank" className="bg-[#1a1a1a] border border-blue-700/50 hover:border-blue-500 rounded-xl p-5 text-center transition group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-blue-600 text-[10px] font-bold px-2 rounded-bl-lg">MOBILE</div>
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔷</div>
              <div className="font-bold text-blue-400 text-lg">البوابة 2</div>
              <div className="text-xs text-gray-500 mt-1">الفحص الفني & الدخول</div>
            </Link>

            <Link href={`/organizer/events/${id}/judge`} target="_blank" className="bg-[#1a1a1a] border border-purple-700/50 hover:border-purple-500 rounded-xl p-5 text-center transition group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-purple-600 text-[10px] font-bold px-2 rounded-bl-lg">MOBILE</div>
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🏆</div>
              <div className="font-bold text-purple-400 text-lg">التحكيم</div>
              <div className="text-xs text-gray-500 mt-1">تقييم 1-10</div>
            </Link>

            <Link href={`/organizer/events/${id}/live`} target="_blank" className="bg-[#1a1a1a] border border-green-700/50 hover:border-green-500 rounded-xl p-5 text-center transition group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-green-600 text-[10px] font-bold px-2 rounded-bl-lg">LIVE</div>
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
              <div className="font-bold text-green-400 text-lg">مباشر</div>
              <div className="text-xs text-gray-500 mt-1">إحصائيات حية</div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link 
            href={`/admin/events/${id}/registrations`}
            className="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col items-center gap-3 transition group"
          >
            <div className="text-5xl group-hover:scale-110 transition-transform">📋</div>
            <h3 className="font-black text-lg text-center">إدارة المشاركين</h3>
            <p className="text-gray-400 text-sm text-center">مراجعة + تعديل بيانات التسجيل</p>
          </Link>

          <Link 
            href={`/admin/events/${id}/rounds`}
            className="bg-gradient-to-br from-red-600/20 to-red-800/20 hover:from-red-600/30 hover:to-red-800/30 border border-red-700/50 rounded-xl p-6 flex flex-col items-center gap-3 transition group"
          >
            <Trophy className="w-12 h-12 text-red-400 group-hover:scale-110 transition" />
            <h3 className="font-black text-lg text-center">إدارة الجولات</h3>
            <p className="text-gray-400 text-sm text-center">الإقصاءات والنتائج</p>
          </Link>

          <Link 
            href={`/admin/events/${id}/gate-scan`}
            className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 hover:from-purple-600/30 hover:to-purple-800/30 border border-purple-700/50 rounded-xl p-6 flex flex-col items-center gap-3 transition group"
          >
            <Flag className="w-12 h-12 text-purple-400 group-hover:scale-110 transition" />
            <h3 className="font-black text-lg text-center">فحص البوابة</h3>
            <p className="text-gray-400 text-sm text-center">مسح QR كود</p>
          </Link>

          <Link 
            href={`/admin/events/${id}/sponsors`}
            className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 hover:from-purple-600/30 hover:to-purple-800/30 border border-purple-700/50 rounded-xl p-6 flex flex-col items-center gap-3 transition group"
          >
            <div className="text-5xl group-hover:scale-110 transition-transform">🤝</div>
            <h3 className="font-black text-lg text-center">الرعاة</h3>
            <p className="text-gray-400 text-sm text-center">داخل لوحة الفعالية فقط</p>
          </Link>
        </div>

        {/* Weekly Rounds Section */}
        {rounds.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-black text-white">تسجيلات الأسابيع</h2>
              <span className="text-gray-500 text-sm">— إدارة مسجلي كل أسبوع بشكل منفصل</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {rounds.map((round) => {
                const isActive = round.status === 'active';
                const isCompleted = round.status === 'completed';
                const statusColor = isActive
                  ? 'border-green-600/60 from-green-900/20 to-green-800/10'
                  : isCompleted
                  ? 'border-gray-600/50 from-gray-800/20 to-gray-900/20'
                  : 'border-blue-700/40 from-blue-900/20 to-blue-800/10';
                const badgeColor = isActive
                  ? 'bg-green-500/20 text-green-400'
                  : isCompleted
                  ? 'bg-gray-500/20 text-gray-400'
                  : 'bg-blue-500/20 text-blue-400';
                const badgeLabel = isActive ? '🏁 جاري' : isCompleted ? '✅ مكتمل' : '⏳ قادم';

                return (
                  <Link
                    key={round.id}
                    href={`/admin/events/${id}/rounds/${round.id}/registrations`}
                    className={`bg-gradient-to-br ${statusColor} border rounded-xl p-5 flex flex-col gap-3 hover:scale-105 transition-all group`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-3xl font-black text-white opacity-30 group-hover:opacity-60 transition">
                        {round.round_order}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm leading-tight group-hover:text-blue-300 transition">
                        {round.name}
                      </h3>
                      {round.round_date && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          📅 {new Date(round.round_date).toLocaleDateString('ar-BH', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-blue-400 font-bold">{round.registration_count || 0} <span className="text-gray-500 font-normal">مسجل</span></span>
                      {Number(round.pending_count) > 0 && (
                        <span className="text-yellow-400 font-bold">{round.pending_count} <span className="text-gray-500 font-normal">ينتظر</span></span>
                      )}
                      {Number(round.approved_count) > 0 && (
                        <span className="text-green-400 font-bold">{round.approved_count} <span className="text-gray-500 font-normal">مقبول</span></span>
                      )}
                    </div>
                    <div className="text-xs text-blue-400 group-hover:text-blue-300 transition font-semibold">
                      👥 إدارة المسجلين ←
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}