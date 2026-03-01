'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { 
    getEventRegistrations, 
    approveRegistrationAction, 
    rejectRegistrationAction,
    getEventDetails,
    getOrganizerMeAction,
    setRegistrationGateStatusAction,
    Registration 
} from '../../actions';

export default function EventDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventInfo, setEventInfo] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [isPending, startTransition] = useTransition();
    const [me, setMe] = useState<null | { userId: string; role: string; eventId: string; name: string }>(null);
    const [verifiedSafety, setVerifiedSafety] = useState<Record<string, boolean>>({});

  // Filters
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [roundFilter, setRoundFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'headers' | 'turbo' | '4x4'>('all');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
        const [data, info, meRes] = await Promise.all([
        getEventRegistrations(id),
                getEventDetails(id),
                getOrganizerMeAction()
    ]);
    setRegistrations(data.registrations);
    setStats(data.stats);
    setEventInfo(info);
        setMe(meRes);
    setLoading(false);
  }

    const role = (me?.role || 'viewer').toLowerCase();
    const canApproveReject = ['management', 'admin', 'super_admin'].includes(role);
    const canCheckIn = ['organizer', 'management', 'admin', 'super_admin'].includes(role);

    useEffect(() => {
        if (!selectedReg) return;
        const raw = selectedReg.safety_checklist;
        const items = Array.isArray(raw)
            ? raw
            : raw && typeof raw === 'object'
                ? Object.keys(raw)
                : [];

        const nextState: Record<string, boolean> = {};
        for (const item of items) nextState[String(item)] = false;
        setVerifiedSafety(nextState);
    }, [selectedReg]);

  const handleApprove = (regId: string) => {
    if(!confirm('Are you sure you want to approve this racer?')) return;
    
    startTransition(async () => {
        const res = await approveRegistrationAction(regId, id);
        if(res.success) {
                        const notifyFailed = (res as any).notification?.success === false;
                        alert(
                            notifyFailed
                                ? `Approved! ID: ${res.regNumber}\n\n⚠️ Email notification failed: ${(res as any).notification?.error || 'unknown'}`
                                : `Approved! ID: ${res.regNumber}`
                        );
            setSelectedReg(null);
            loadData();
        } else {
            alert('Error: ' + res.message);
        }
    });
  };

    const handleCheckIn = (reg: Registration) => {
        startTransition(async () => {
            const raw = reg.safety_checklist;
            const items = Array.isArray(raw)
                ? raw
                : raw && typeof raw === 'object'
                    ? Object.keys(raw)
                    : [];

            const verified = items.length === 0
                ? []
                : items.filter((item: any) => verifiedSafety[String(item)]);

            if (items.length > 0 && verified.length !== items.length) {
                alert('Please verify all safety items before check-in.');
                return;
            }

            const res = await setRegistrationGateStatusAction({
                regId: reg.id,
                eventId: id,
                decision: 'check_in',
                verifiedSafetyItems: verified.map(String),
            });

            if (res.success) {
                alert('Checked in successfully');
                setSelectedReg(null);
                loadData();
            } else {
                alert('Error: ' + res.message);
            }
        });
    };

    const handleGateReject = (reg: Registration) => {
        const notes = prompt('Reason for gate rejection (safety/inspection):') || '';
        if (!notes.trim()) return;

        startTransition(async () => {
            const res = await setRegistrationGateStatusAction({
                regId: reg.id,
                eventId: id,
                decision: 'reject_gate',
                notes,
            });

            if (res.success) {
                alert('Rejected at gate');
                setSelectedReg(null);
                loadData();
            } else {
                alert('Error: ' + res.message);
            }
        });
    };

  const handleReject = (regId: string) => {
    const reason = prompt('Enter rejection reason:');
    if(!reason) return;

    startTransition(async () => {
        const res = await rejectRegistrationAction(regId, id, reason);
        if(res.success) {
            alert('Rejected successfully');
            setSelectedReg(null);
            loadData();
        }
    });
  };

    const registrationsForCounts = filter === 'all'
        ? registrations
        : registrations.filter(r => r.status === filter);

    const categoryCounts = registrationsForCounts.reduce(
        (acc, r) => {
            const key = (r.car_category || '').toLowerCase();
            if (key === 'headers' || key === 'turbo' || key === '4x4') {
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        },
        { headers: 0, turbo: 0, '4x4': 0 } as { headers: number; turbo: number; '4x4': number }
    );

    const filteredList = registrations.filter(r => {
        const matchesStatus = filter === 'all' ? true : r.status === filter;
        const matchesCategory =
            categoryFilter === 'all'
                ? true
                : String(r.car_category || '').toLowerCase() === categoryFilter;
        const matchesRound =
            roundFilter === 'all'
                ? true
                : String((r as any).round_number) === roundFilter;
        return matchesStatus && matchesCategory && matchesRound;
    });

  if (loading) return (
    <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mr-2"></div>
        Loading Dashboard...
    </div>
  );

  return (
    <div className="space-y-6">
       {/* Header */}
       <header className="flex justify-between items-end border-b border-gray-800 pb-6">
          <div>
            <h5 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-1">Event Dashboard</h5>
            <h1 className="text-3xl font-black text-white">{eventInfo?.name || 'Loading...'}</h1>
            <div className="flex gap-4 mt-2 text-sm text-gray-400">
                <span>🗓️ {eventInfo?.event_date ? new Date(eventInfo.event_date).toLocaleDateString() : 'Date TBA'}</span>
                <span>📍 {eventInfo?.location || 'Location TBA'}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
             <StatCard label="Pending" value={stats.pending} color="bg-yellow-500/10 text-yellow-500 border-yellow-500/20" />
             <StatCard label="Approved" value={stats.approved} color="bg-green-500/10 text-green-500 border-green-500/20" />
             <StatCard label="Refused" value={stats.rejected} color="bg-red-500/10 text-red-500 border-red-500/20" />
          </div>
       </header>

       {/* Operations Navigation */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
         <Link href={`/organizer/events/${id}/gate1`} className="bg-orange-900/30 border border-orange-700/50 hover:border-orange-500 rounded-xl p-4 text-center transition group">
           <div className="text-2xl mb-1">🔶</div>
           <div className="text-sm font-bold text-orange-400 group-hover:text-orange-300">البوابة 1</div>
           <div className="text-xs text-gray-500 mt-0.5">الهوية</div>
         </Link>
         <Link href={`/organizer/events/${id}/gate2`} className="bg-blue-900/30 border border-blue-700/50 hover:border-blue-500 rounded-xl p-4 text-center transition group">
           <div className="text-2xl mb-1">🔷</div>
           <div className="text-sm font-bold text-blue-400 group-hover:text-blue-300">البوابة 2</div>
           <div className="text-xs text-gray-500 mt-0.5">الفحص الفني</div>
         </Link>
         <Link href={`/organizer/events/${id}/judge`} className="bg-purple-900/30 border border-purple-700/50 hover:border-purple-500 rounded-xl p-4 text-center transition group">
           <div className="text-2xl mb-1">🏆</div>
           <div className="text-sm font-bold text-purple-400 group-hover:text-purple-300">التحكيم</div>
           <div className="text-xs text-gray-500 mt-0.5">تقييم 1-10</div>
         </Link>
         <Link href={`/organizer/events/${id}/live`} className="bg-green-900/30 border border-green-700/50 hover:border-green-500 rounded-xl p-4 text-center transition group">
           <div className="text-2xl mb-1">📊</div>
           <div className="text-sm font-bold text-green-400 group-hover:text-green-300">مباشر</div>
           <div className="text-xs text-gray-500 mt-0.5">إحصائيات حية</div>
         </Link>
       </div>

       {/* Filters */}
       <div className="flex gap-2 flex-wrap">
          {/* Round Filter */}
          {['all', '1', '2', '3'].map(r => (
             <button
                key={`round-${r}`}
                onClick={() => setRoundFilter(r as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                    roundFilter === r
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
             >
                {r === 'all' ? '🏁 All Rounds' : `Round ${r}`}
             </button>
          ))}
       </div>
       <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
             <button 
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${
                    filter === f 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
             >
                {f}
             </button>
          ))}
       </div>

             {/* Category Sections */}
             <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setCategoryFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            categoryFilter === 'all'
                                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        All Categories
                    </button>
                    <button
                        onClick={() => setCategoryFilter('headers')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            categoryFilter === 'headers'
                                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        Headers (هدرز) ({categoryCounts.headers})
                    </button>
                    <button
                        onClick={() => setCategoryFilter('turbo')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            categoryFilter === 'turbo'
                                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        Turbo (تيربو) ({categoryCounts.turbo})
                    </button>
                    <button
                        onClick={() => setCategoryFilter('4x4')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            categoryFilter === '4x4'
                                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        4x4 (دفع رباعي) ({categoryCounts['4x4']})
                    </button>
             </div>

       {/* List */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map(reg => (
             <div key={reg.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition group relative overflow-hidden">
                {/* Status Stripe */}
                <div className={`absolute top-0 left-0 w-1 h-full ${
                    reg.status === 'approved' ? 'bg-green-500' : 
                    reg.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>

                <div className="pl-3">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-white text-lg">{reg.full_name}</h3>
                            <p className="text-sm text-gray-500">{reg.email}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                            reg.status === 'approved' ? 'bg-green-900/30 text-green-400' : 
                            reg.status === 'rejected' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                            {reg.status}
                        </span>
                    </div>

                    <div className="bg-black/30 rounded p-3 mb-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Car:</span>
                            <span className="text-gray-300 font-mono">{reg.car_make} {reg.car_model} {reg.car_year}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Category:</span>
                            <span className="text-gray-300">{reg.car_category || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Phone:</span>
                            <span className="text-gray-300">{reg.phone_number}</span>
                        </div>
                        {reg.has_passenger && (
                            <div className="flex justify-between text-yellow-500/80">
                                <span>Passenger:</span>
                                <span>Yes</span>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setSelectedReg(reg)}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg text-sm transition"
                    >
                        View Details / Action
                    </button>
                </div>
             </div>
          ))}
          {filteredList.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-500">
                  No registrations found in this category.
              </div>
          )}
       </div>

       {/* Modal */}
       {selectedReg && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedReg(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{selectedReg.full_name}</h2>
                        <p className="text-gray-400 text-sm">Reg ID: {selectedReg.registration_number || 'PENDING'}</p>
                    </div>
                    <button onClick={() => setSelectedReg(null)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Images */}
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-gray-500 text-sm font-bold uppercase mb-2">Driver ID (CPR)</h4>
                            {selectedReg.driver_cpr_photo_url ? (
                                <img src={selectedReg.driver_cpr_photo_url} className="w-full rounded-lg border border-gray-700" alt="CPR" />
                            ) : (
                                <div className="bg-gray-800 h-32 rounded-lg flex items-center justify-center text-gray-500">No Image</div>
                            )}
                        </div>
                        
                        <div>
                            <h4 className="text-gray-500 text-sm font-bold uppercase mb-2">Car Photo</h4>
                            {selectedReg.car_photo_url ? (
                                <img src={selectedReg.car_photo_url} className="w-full rounded-lg border border-gray-700" alt="Car" />
                            ) : (
                                <div className="bg-gray-800 h-32 rounded-lg flex items-center justify-center text-gray-500">No Image</div>
                            )}
                        </div>

                         {selectedReg.has_passenger && (
                            <div>
                                <h4 className="text-gray-500 text-sm font-bold uppercase mb-2">Passenger ID</h4>
                                {selectedReg.passenger_cpr_photo_url ? (
                                    <img src={selectedReg.passenger_cpr_photo_url} className="w-full rounded-lg border border-gray-700" alt="Passenger CPR" />
                                ) : (
                                    <div className="bg-gray-800 h-32 rounded-lg flex items-center justify-center text-gray-500">No Image</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Data & Actions */}
                    <div className="space-y-6">
                         <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                            <h3 className="font-bold text-red-500 mb-4 divider">Details</h3>
                            <dl className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-gray-800 pb-2">
                                    <dt className="text-gray-500">Email</dt>
                                    <dd className="text-right">{selectedReg.email}</dd>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-2">
                                    <dt className="text-gray-500">Phone</dt>
                                    <dd className="text-right" dir="ltr">{selectedReg.phone_number}</dd>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-2">
                                    <dt className="text-gray-500">Make/Model</dt>
                                    <dd className="text-right">{selectedReg.car_make} {selectedReg.car_model}</dd>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-2">
                                    <dt className="text-gray-500">Year</dt>
                                    <dd className="text-right">{selectedReg.car_year}</dd>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-2">
                                    <dt className="text-gray-500">Category</dt>
                                    <dd className="text-right font-bold text-yellow-500">{selectedReg.car_category}</dd>
                                </div>
                            </dl>
                         </div>

                         {selectedReg.has_passenger && (
                             <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                                <h3 className="font-bold text-blue-500 mb-4">Passenger Info</h3>
                                <p className="text-white text-lg">{selectedReg.passenger_name}</p>
                             </div>
                         )}

                                                 {selectedReg.status === 'approved' && canCheckIn && (
                                                     <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                                                         <h3 className="font-bold text-yellow-500 mb-4">Gate Check-in / Safety</h3>
                                                         <p className="text-sm text-gray-400 mb-3">Verify safety items before allowing entry.</p>

                                                         {Array.isArray(selectedReg.safety_checklist) && selectedReg.safety_checklist.length > 0 ? (
                                                             <div className="space-y-2">
                                                                 {selectedReg.safety_checklist.map((item: any) => (
                                                                     <label key={String(item)} className="flex items-center gap-2 text-sm text-gray-200">
                                                                         <input
                                                                             type="checkbox"
                                                                             className="h-4 w-4"
                                                                             checked={!!verifiedSafety[String(item)]}
                                                                             onChange={(e) => setVerifiedSafety(prev => ({ ...prev, [String(item)]: e.target.checked }))}
                                                                         />
                                                                         <span>{String(item)}</span>
                                                                     </label>
                                                                 ))}
                                                             </div>
                                                         ) : (
                                                             <div className="text-sm text-gray-400">No safety checklist submitted.</div>
                                                         )}

                                                         <div className="flex gap-2 mt-4">
                                                             <button
                                                                 disabled={isPending}
                                                                 onClick={() => handleCheckIn(selectedReg)}
                                                                 className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                                                             >
                                                                 {isPending ? 'Processing...' : '✅ Check-in (Pass)'}
                                                             </button>
                                                             <button
                                                                 disabled={isPending}
                                                                 onClick={() => handleGateReject(selectedReg)}
                                                                 className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 font-bold py-3 rounded-xl transition disabled:opacity-50"
                                                             >
                                                                 {isPending ? 'Processing...' : '🚫 Reject at Gate'}
                                                             </button>
                                                         </div>
                                                     </div>
                                                 )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-800 bg-gray-900 sticky bottom-0 z-10 flex gap-4">
                    {selectedReg.status === 'pending' && (
                        <>
                            {canApproveReject ? (
                              <>
                                <button 
                                    disabled={isPending}
                                    onClick={() => handleApprove(selectedReg.id)}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition text-lg disabled:opacity-50"
                                >
                                    {isPending ? 'Processing...' : '✅ Approve & Generate BN'}
                                </button>
                                <button 
                                    disabled={isPending}
                                    onClick={() => handleReject(selectedReg.id)}
                                    className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 font-bold py-4 rounded-xl transition text-lg disabled:opacity-50"
                                >
                                    {isPending ? 'Processing...' : '❌ Decline'}
                                </button>
                              </>
                            ) : (
                              <div className="w-full text-center py-3 text-gray-400">
                                You don’t have permission to approve/reject. ({me?.role || 'viewer'})
                              </div>
                            )}
                        </>
                    )}
                    {selectedReg.status !== 'pending' && (
                        <div className="w-full text-center py-3 text-gray-500 font-mono">
                            Action completed on {new Date().toLocaleDateString()}
                        </div>
                    )}
                </div>
            </div>
         </div>
       )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className={`px-4 py-2 rounded-lg border flex flex-col items-center min-w-[100px] ${color}`}>
            <span className="text-2xl font-black leading-none">{value}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">{label}</span>
        </div>
    );
}