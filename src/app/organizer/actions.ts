'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';
import { sendApprovalNotify, sendRejectionNotify } from './notifications'; // We will create this

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'AKAutoshow-Super-Secret-JWT-Key-2025-Admin-System'
);

const parseOrganizerSession = (raw?: string) => {
  if (!raw) return null;

  const candidates = [raw];
  try {
    candidates.push(decodeURIComponent(raw));
  } catch {
    // ignore decode errors
  }

  for (const value of candidates) {
    try {
      return JSON.parse(value);
    } catch {
      // continue
    }
  }

  return null;
};

type OrganizerSession = {
  userId: string;
  role: string;
  eventId: string;
  name: string;
  isAdmin?: boolean;
};

async function getOrganizerSession(): Promise<OrganizerSession | null> {
  const cookieStore = await cookies();
  
  // 1. Try Organizer Cookie
  const orgSession = cookieStore.get('organizer_session');
  let session: OrganizerSession | null = null;
  if (orgSession?.value) {
    session = parseOrganizerSession(orgSession.value) as OrganizerSession | null;
  }
  
  // 2. Try Admin Token
  if (!session) {
    const adminToken = cookieStore.get('carshowx_admin_token');
    if (adminToken?.value) {
      try {
        const { payload } = await jwtVerify(adminToken.value, JWT_SECRET);
        session = {
          userId: String(payload.id),
          role: String(payload.role),
          eventId: payload.assignedEventId ? String(payload.assignedEventId) : 'ALL_EVENTS',
          name: String(payload.name || 'Admin'),
          isAdmin: true
        };
      } catch (e) {
        // failed
      }
    }
  }

  return session;
}

async function logAdminActivity(params: {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  status?: 'success' | 'failed' | 'warning';
}) {
  try {
    await query(
      `INSERT INTO admin_activity_log (user_id, action, resource_type, resource_id, details, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.userId || null,
        params.action,
        params.resourceType || null,
        params.resourceId || null,
        JSON.stringify(params.details ?? {}),
        params.status || 'success'
      ]
    );
  } catch (e) {
    // Don't break core flows if log table isn't present
    console.warn('⚠️ Failed to write admin_activity_log:', e);
  }
}

export async function getOrganizerMeAction() {
  const session = await getOrganizerSession();
  if (!session) return null;
  return {
    userId: session.userId,
    role: session.role,
    eventId: session.eventId,
    name: session.name,
  };
}

// Types
export interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  registration_number: string;
  status: 'pending' | 'approved' | 'rejected';
  check_in_status?: string;
  inspection_status?: string;
  checked_in_at?: string;
  rejection_reason?: string;
  car_make: string;
  car_model: string;
  car_year: number;
  car_category?: string;
  created_at: string;
  driver_cpr_photo_url?: string;
  car_photo_url?: string;
  passenger_name?: string;
  passenger_cpr_photo_url?: string;
  safety_checklist?: any;
  has_passenger?: boolean;
  // Gate 1
  gate1_status?: string | null;
  gate1_notes?: string | null;
  gate1_checked_at?: string | null;
  gate1_officer_id?: string | null;
  // Scoring
  round_number?: number;
  avg_score?: number | null;
}

export type RegistrationStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

// 0. Login Action
export async function loginOrganizerAction(email: string, pass: string) {
  try {
    const res = await query(
      `SELECT * FROM admin_users 
       WHERE email = $1 
         AND role IN ('organizer', 'management', 'data_entry', 'admin', 'super_admin')`, 
      [email]
    );
    const user = res.rows[0];

    if (!user) {
      return { success: false, message: 'Invalid credentials or not an organizer' };
    }

    const validUser = await bcrypt.compare(pass, user.password_hash);
    if (!validUser) {
        return { success: false, message: 'Invalid credentials' };
    }

    if (!user.assigned_event_id) {
        return { success: false, message: 'No event assigned to this organizer account.' };
    }

    // Set Cookie
    const sessionData = { 
        userId: user.id, 
      role: user.role, 
        eventId: user.assigned_event_id,
        name: user.full_name
    };
    
    const cookieStore = await cookies();
    
    // Clean up any existing cookies
    try {
      cookieStore.delete({ name: 'organizer_session', path: '/' });
      cookieStore.delete({ name: 'organizer_session', path: '/organizer' });
      cookieStore.delete({ name: 'organizer_guard', path: '/' });
    } catch {
      // Ignore deletion errors
    }
    
    cookieStore.set('organizer_session', JSON.stringify(sessionData), { 
        httpOnly: true, 
        path: '/',
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24
    });
    
    cookieStore.set('organizer_guard', '1', {
      httpOnly: true,
      path: '/',
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
    });

    return { success: true, redirectUrl: `/organizer/events/${user.assigned_event_id}` };
  } catch (error) {
    console.error('Login Error:', error);
    return { success: false, message: 'System error during login' };
  }
}

// 1. Fetch Registrations (ISOLATED by eventId)
export async function getEventRegistrations(eventId: string) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('organizer_session');
    const user = parseOrganizerSession(session?.value);
    
    // If no session, they shouldn't see anything (or return error)
    if (!user) {
        // For security, strict failure
        console.error('Unauthorized: No session');
        return { registrations: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0 } };
    }
    
    // Strict Check: Organizer can ONLY see their assigned event
    if (String(user.eventId) !== String(eventId)) {
         console.error(`Unauthorized: Organizer ${user.userId} tried to access event ${eventId} but is assigned to ${user.eventId}`);
         // Return empty data to prevent leak
         return { registrations: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0 } };
    }

    const res = await query(
      `SELECT * FROM registrations 
       WHERE event_id = $1 
       ORDER BY created_at DESC`,
      [eventId]
    );

    const statsRes = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'approved') as approved,
         COUNT(*) FILTER (WHERE status = 'rejected') as rejected
       FROM registrations 
       WHERE event_id = $1`,
      [eventId]
    );

    return {
      registrations: res.rows as Registration[],
      stats: statsRes.rows[0] as RegistrationStats
    };
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    return { registrations: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0 } };
  }
}

// 2. Approve Registration
export async function approveRegistrationAction(regId: string, eventId: string) {
  try {
    const session = await getOrganizerSession();

    // Generate the specific BN Format: BN-DATE-RW2-XXXX
    // First, get event date or current date
    const eventRes = await query(`SELECT event_date FROM events WHERE id = $1`, [eventId]);
    const eventDate = eventRes.rows[0]?.event_date ? new Date(eventRes.rows[0].event_date) : new Date();
    
    // Format Date: DDMMYYYY
    const day = String(eventDate.getDate()).padStart(2, '0');
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const year = eventDate.getFullYear();
    const dateStr = `${day}${month}${year}`;

    // Generate Random 4 digits
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    
    // Construct Registration Number
    const regNumber = `BN-${dateStr}-RW2-${randomCode}`;

    // Update DB
    await query(
      `UPDATE registrations 
       SET status = 'approved', 
           registration_number = $1,
           approved_at = NOW()
       WHERE id = $2 AND event_id = $3`, 
      [regNumber, regId, eventId]
    );

    // Fetch user details for notification
    const userRes = await query(`SELECT * FROM registrations WHERE id = $1`, [regId]);
    const user = userRes.rows[0];

    // Trigger Notification Notification (Email + WhatsApp logic)
    // We will separate this logic to keep the action clean, but call it here
    const notifyResult = await sendApprovalNotify(user);

    await logAdminActivity({
      userId: session?.userId,
      action: 'approve_registration',
      resourceType: 'registration',
      resourceId: String(regId),
      details: { eventId, registrationNumber: regNumber, notification: notifyResult },
      status: notifyResult?.success === false ? 'warning' : 'success'
    });

    revalidatePath(`/organizer/events/${eventId}`);
    return {
      success: true,
      message:
        notifyResult?.success === false
          ? 'Registration Approved (notification failed)'
          : 'Registration Approved',
      regNumber,
      notification: notifyResult
    };
  } catch (error) {
    console.error('Approval Error:', error);
    return { success: false, message: 'Failed to approve' };
  }
}

// 3. Reject Registration
export async function rejectRegistrationAction(regId: string, eventId: string, reason: string) {
  try {
    const session = await getOrganizerSession();
    await query(
      `UPDATE registrations 
       SET status = 'rejected', 
           rejected_at = NOW()
       WHERE id = $1 AND event_id = $2`,
      [regId, eventId]
    );
     
    // Fetch user details
    const userRes = await query(`SELECT * FROM registrations WHERE id = $1`, [regId]);
    const user = userRes.rows[0];

    const notifyResult = await sendRejectionNotify(user, reason);

    await logAdminActivity({
      userId: session?.userId,
      action: 'reject_registration',
      resourceType: 'registration',
      resourceId: String(regId),
      details: { eventId, reason, notification: notifyResult },
      status: notifyResult?.success === false ? 'warning' : 'success'
    });

    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true, message: 'Registration Rejected' };
  } catch (error) {
    console.error('Rejection Error:', error);
    return { success: false, message: 'Failed to reject' };
  }
}

// 4. Fetch Event Details (Name only)
export async function getEventDetails(eventId: string) {
  try {
    const res = await query(`SELECT name, event_date, location FROM events WHERE id = $1`, [eventId]);
    return res.rows[0];
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
}

// 0.b Login Action (Form Submit with server-side redirect)
export async function loginOrganizerFormAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const pass = String(formData.get('password') || '');

  if (!email || !pass) {
    redirect('/organizer/login?error=missing');
  }

  // Query database - NO try/catch around redirect()
  const res = await query(
    `SELECT * FROM admin_users 
     WHERE email = $1 
       AND role IN ('organizer', 'management', 'data_entry', 'admin', 'super_admin')`,
    [email]
  ).catch((error) => {
    console.error('❌ Organizer DB query error:', error);
    return null;
  });

  if (!res || res.rows.length === 0) {
    redirect('/organizer/login?error=invalid');
  }

  const user = res.rows[0];

  // Verify password - NO try/catch around redirect()
  const validUser = await bcrypt.compare(pass, user.password_hash).catch((error) => {
    console.error('❌ Password verification error:', error);
    return false;
  });

  if (!validUser) {
    redirect('/organizer/login?error=invalid');
  }

  if (!user.assigned_event_id) {
    redirect('/organizer/login?error=no_event');
  }

  const sessionData = {
    userId: user.id,
    role: user.role,
    eventId: user.assigned_event_id,
    name: user.full_name
  };

  const cookieStore = await cookies();
  
  // Clean up any existing cookies
  cookieStore.delete('organizer_session');
  cookieStore.delete('organizer_guard');

  // Set fresh cookies with root path
  cookieStore.set('organizer_session', JSON.stringify(sessionData), {
    httpOnly: true,
    path: '/',
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24
  });
  
  cookieStore.set('organizer_guard', '1', {
    httpOnly: true,
    path: '/',
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24
  });

  console.log('✅ Login successful for:', email);
  redirect(`/organizer/events/${user.assigned_event_id}`);
}

// 3.b Gate Check-In / Inspection Decision
export async function setRegistrationGateStatusAction(params: {
  regId: string;
  eventId: string;
  decision: 'check_in' | 'reject_gate';
  notes?: string;
  verifiedSafetyItems?: string[];
}) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, message: 'Unauthorized' };
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(params.eventId)) {
      return { success: false, message: 'Forbidden' };
    }

    if (params.decision === 'check_in') {
      await query(
        `UPDATE registrations
         SET check_in_status = 'checked_in',
             inspection_status = 'passed',
             checked_in_at = NOW()
         WHERE id = $1 AND event_id = $2`,
        [params.regId, params.eventId]
      );

      await logAdminActivity({
        userId: session.userId,
        action: 'check_in_participant',
        resourceType: 'registration',
        resourceId: String(params.regId),
        details: { eventId: params.eventId, verifiedSafetyItems: params.verifiedSafetyItems ?? [] },
        status: 'success'
      });

      revalidatePath(`/organizer/events/${params.eventId}`);
      return { success: true, message: 'Checked in' };
    }

    await query(
      `UPDATE registrations
       SET inspection_status = 'rejected',
           rejection_reason = $1
       WHERE id = $2 AND event_id = $3`,
      [params.notes || 'Rejected at gate', params.regId, params.eventId]
    );

    await logAdminActivity({
      userId: session.userId,
      action: 'reject_at_gate',
      resourceType: 'registration',
      resourceId: String(params.regId),
      details: { eventId: params.eventId, notes: params.notes || null },
      status: 'warning'
    });

    revalidatePath(`/organizer/events/${params.eventId}`);
    return { success: true, message: 'Rejected at gate' };
  } catch (error) {
    console.error('Gate status error:', error);
    return { success: false, message: 'Failed to update gate status' };
  }
}

// ─── GATE 1 ────────────────────────────────────────────────────────────────

export async function gate1PassAction(params: { regId: string; eventId: string }) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, message: 'Unauthorized' };
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(params.eventId)) return { success: false, message: 'Forbidden' };

    await query(
      `UPDATE registrations
       SET gate1_status = 'passed', gate1_checked_at = NOW(), gate1_officer_id = $3, gate1_notes = NULL
       WHERE id = $1 AND event_id = $2`,
      [params.regId, params.eventId, session.userId]
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function gate1RejectAction(params: { regId: string; eventId: string; notes: string }) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, message: 'Unauthorized' };
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(params.eventId)) return { success: false, message: 'Forbidden' };

    await query(
      `UPDATE registrations
       SET gate1_status = 'rejected', gate1_checked_at = NOW(), gate1_officer_id = $3, gate1_notes = $4
       WHERE id = $1 AND event_id = $2`,
      [params.regId, params.eventId, session.userId, params.notes]
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// ─── GATE 2 ────────────────────────────────────────────────────────────────

export async function gate2PassAction(params: { regId: string; eventId: string }) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, message: 'Unauthorized' };
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(params.eventId)) return { success: false, message: 'Forbidden' };

    await query(
      `UPDATE registrations
       SET check_in_status = 'checked_in', inspection_status = 'passed', checked_in_at = NOW()
       WHERE id = $1 AND event_id = $2`,
      [params.regId, params.eventId]
    );

    // Log entry
    await query(
      `INSERT INTO entry_log (registration_id, event_id, action, officer_id) VALUES ($1, $2, 'enter', $3)`,
      [params.regId, params.eventId, session.userId]
    );

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function gate2RejectAction(params: { regId: string; eventId: string; notes: string }) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, message: 'Unauthorized' };
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(params.eventId)) return { success: false, message: 'Forbidden' };

    await query(
      `UPDATE registrations
       SET inspection_status = 'rejected', rejection_reason = $3
       WHERE id = $1 AND event_id = $2`,
      [params.regId, params.eventId, params.notes]
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// ─── RE-ENTRY ───────────────────────────────────────────────────────────────

export async function recordExitAction(params: { regId: string; eventId: string }) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, message: 'Unauthorized' };
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(params.eventId)) return { success: false, message: 'Forbidden' };

    await query(
      `INSERT INTO entry_log (registration_id, event_id, action, officer_id) VALUES ($1, $2, 'exit', $3)`,
      [params.regId, params.eventId, session.userId]
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function recordReEntryAction(params: { regId: string; eventId: string }) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, message: 'Unauthorized' };
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(params.eventId)) return { success: false, message: 'Forbidden' };

    await query(
      `INSERT INTO entry_log (registration_id, event_id, action, officer_id) VALUES ($1, $2, 're_enter', $3)`,
      [params.regId, params.eventId, session.userId]
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// ─── JUDGE SCORING ──────────────────────────────────────────────────────────

export async function submitJudgeScoreAction(params: {
  eventId: string;
  roundNumber: number;
  registrationId: string;
  score: number;
}) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, message: 'Unauthorized' };
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(params.eventId)) return { success: false, message: 'Forbidden' };

    if (params.score < 1 || params.score > 10) return { success: false, message: 'Score must be 1-10' };

    await query(
      `INSERT INTO judge_scores (event_id, round_number, registration_id, judge_id, score)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id, round_number, registration_id, judge_id)
       DO UPDATE SET score = $5, created_at = NOW()`,
      [params.eventId, params.roundNumber, params.registrationId, session.userId, params.score]
    );

    // Calculate new average
    const avgRes = await query(
      `SELECT AVG(score)::NUMERIC(4,2) as avg, COUNT(*) as count
       FROM judge_scores
       WHERE event_id = $1 AND round_number = $2 AND registration_id = $3`,
      [params.eventId, params.roundNumber, params.registrationId]
    );

    return {
      success: true,
      avg: parseFloat(avgRes.rows[0]?.avg || '0'),
      judgeCount: parseInt(avgRes.rows[0]?.count || '0')
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function getJudgeScoresAction(eventId: string, roundNumber: number) {
  try {
    const session = await getOrganizerSession();
    if (!session) return { success: false, scores: [] };

    const res = await query(
      `SELECT
         r.id, r.full_name, r.registration_number, r.car_make, r.car_model, r.car_category,
         r.car_photo_url,
         AVG(js.score)::NUMERIC(4,2) as avg_score,
         COUNT(js.id) as judge_count,
         json_agg(json_build_object('judge_id', js.judge_id, 'score', js.score) ORDER BY js.created_at) as scores
       FROM registrations r
       LEFT JOIN judge_scores js ON js.registration_id = r.id AND js.event_id = $1 AND js.round_number = $2
       WHERE r.event_id = $1 AND (r.round_number = $2 OR js.round_number = $2) AND r.status = 'approved'
       GROUP BY r.id, r.full_name, r.registration_number, r.car_make, r.car_model, r.car_category, r.car_photo_url
       HAVING COUNT(js.id) > 0 OR r.round_number = $2
       ORDER BY avg_score DESC NULLS LAST`,
      [eventId, roundNumber]
    );

    return { success: true, scores: res.rows };
  } catch (e: any) {
    return { success: false, scores: [], message: e.message };
  }
}

export async function getLiveStatsAction(eventId: string) {
  try {
    const session = await getOrganizerSession();
    if (!session) return null;
    if (session.eventId !== 'ALL_EVENTS' && String(session.eventId) !== String(eventId)) return null;

    const eventRes = await query(`SELECT current_round FROM events WHERE id = $1`, [eventId]);
    const currentRound = eventRes.rows[0]?.current_round ?? 1;

    const statsRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'approved') as approved,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE gate1_status = 'passed') as gate1_passed,
         COUNT(*) FILTER (WHERE gate1_status = 'rejected') as gate1_rejected,
         COUNT(*) FILTER (WHERE check_in_status = 'checked_in') as entered,
         COUNT(*) FILTER (WHERE inspection_status = 'rejected') as gate2_rejected
       FROM registrations
       WHERE event_id = $1 AND round_number = $2`,
      [eventId, currentRound]
    );

    const entryLogRes = await query(
      `SELECT action, COUNT(*) as count
       FROM entry_log
       WHERE event_id = $1
       GROUP BY action`,
      [eventId]
    );

    const entryMap: Record<string, number> = {};
    entryLogRes.rows.forEach((r: any) => { entryMap[r.action] = parseInt(r.count); });

    return {
      currentRound,
      ...statsRes.rows[0],
      exits: entryMap['exit'] || 0,
      reentries: entryMap['re_enter'] || 0,
    };
  } catch (e: any) {
    return null;
  }
}