"""
Anthropic Claude AI services for Doveland Traffic Control.
Every function degrades gracefully when API key is missing.
"""
import json
import logging
from typing import Optional
from anthropic import Anthropic, APIError
from django.conf import settings

log = logging.getLogger("apps.ai_engine")

# ── System Prompt ─────────────────────────────────────────────────
SYSTEM_PROMPT = """You are the AI assistant for Doveland School's Traffic Control System.

School structure (British National Curriculum):
- EYFS:    Nursery (age 3–4) and Reception (age 4–5)
- Primary: Years 1–6 (ages 5–11)

Your role:
1. Analyse real-time queue data and predict peak arrival windows
2. Flag potentially risky pickup patterns for safeguarding purposes
3. Answer staff questions about the current queue concisely
4. Generate professional post-session summaries for school records
5. Suggest queue optimisations to reduce congestion

Rules:
- Child safeguarding is ALWAYS the absolute top priority
- Respond in British English
- Be concise and professional
- Format lists with bullet points when helpful
"""


def _client() -> Optional[Anthropic]:
    key = settings.ANTHROPIC_API_KEY
    if not key or "your-anthropic" in key:
        log.warning("ANTHROPIC_API_KEY not configured — AI features disabled")
        return None
    return Anthropic(api_key=key)


def _live_context(session_id: Optional[str] = None) -> str:
    """Build a real-time queue summary to inject into the AI context."""
    from apps.pickups.models import PickupSession
    try:
        s = (PickupSession.objects.get(pk=session_id) if session_id
             else PickupSession.objects.filter(status__in=["open","active"]).latest("created_at"))
    except PickupSession.DoesNotExist:
        return "No active session."

    r = s.requests.all()
    return (
        f"Session: {s.get_session_type_display()} | {s.date:%A %d %B %Y}\n"
        f"Status: {s.get_status_display()} | {s.scheduled_start}–{s.scheduled_end}\n"
        f"Queue breakdown:\n"
        f"  Pending/En-route: {r.filter(status__in=['pending','en_route']).count()}\n"
        f"  Arrived/In queue: {r.filter(status__in=['arrived','in_queue']).count()}\n"
        f"  Called:           {r.filter(status='called').count()}\n"
        f"  Collected:        {r.filter(status='collected').count()}\n"
        f"  AI-flagged:       {r.filter(ai_flagged=True).count()}"
    )


def chat(messages: list, session_id: Optional[str] = None) -> str:
    """Send a conversation to Claude and return the reply text."""
    c = _client()
    if not c:
        return (
            "The AI assistant is unavailable. "
            "Please add your ANTHROPIC_API_KEY to backend\\.env and restart the server."
        )
    system = f"{SYSTEM_PROMPT}\n\n--- LIVE QUEUE DATA ---\n{_live_context(session_id)}"
    try:
        resp = c.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system,
            messages=messages,
        )
        return resp.content[0].text
    except APIError as e:
        log.error(f"Claude API error: {e}")
        return f"AI error: {e.message}"
    except Exception as e:
        log.error(f"Unexpected AI error: {e}")
        return "AI assistant encountered an error. Please try again."


def predict_peak(session) -> dict:
    """Predict peak arrival time for the session. Returns a JSON-safe dict."""
    c = _client()
    if not c:
        return {"error": "AI not configured"}

    from apps.pickups.models import PickupSession
    from django.db.models import Avg, Count
    hist = PickupSession.objects.filter(
        session_type=session.session_type, status="closed"
    ).aggregate(count=Count("id"), avg=Avg("ai_peak_duration"))

    prompt = (
        f"Predict the peak arrival time for this pickup session.\n\n"
        f"Type:     {session.get_session_type_display()}\n"
        f"Date:     {session.date:%A %d %B %Y}\n"
        f"Window:   {session.scheduled_start}–{session.scheduled_end}\n"
        f"History:  {hist['count'] or 0} past sessions, "
        f"average {hist['avg'] or 'N/A'} minutes duration\n\n"
        f"Respond ONLY with valid JSON, no markdown:\n"
        f'{{"predicted_peak":"HH:MM","duration_minutes":30,"confidence":0.8,"reasoning":"..."}}'
    )
    try:
        resp = c.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(resp.content[0].text.strip())
    except (APIError, json.JSONDecodeError) as e:
        log.error(f"Prediction error: {e}")
        return {"error": str(e)}


def risk_check(pickup_request) -> dict:
    """Run a safeguarding risk assessment on a pickup request."""
    c = _client()
    if not c:
        return {"flagged": False, "risk_level": "low", "reason": "AI offline"}

    col = pickup_request.collector
    kids = list(
        pickup_request.children.select_related(
            "student", "student__school_class__year_group"
        )
    )
    child_str = "; ".join(
        f"{i.student.full_name} ({i.student.school_class.year_group.display_name})"
        for i in kids
    )
    prompt = (
        f"Assess safeguarding concerns (UK guidelines).\n"
        f"Collector: {col.full_name} (role: {col.role})\n"
        f"Children: {child_str}\n"
        f"Check-in distance: {pickup_request.checkin_dist or '?'}m\n"
        f"Session: {pickup_request.session.get_session_type_display()}\n\n"
        f"Reply ONLY with valid JSON:\n"
        f'{{"flagged":false,"risk_level":"low","reason":"All checks passed"}}'
    )
    try:
        resp = c.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(resp.content[0].text.strip())
    except (APIError, json.JSONDecodeError) as e:
        log.error(f"Risk check error: {e}")
        return {"flagged": False, "risk_level": "low", "reason": "Assessment failed"}


def session_report(session) -> str:
    """Generate a professional post-session summary for school records."""
    c = _client()
    if not c:
        return "AI summary unavailable — configure ANTHROPIC_API_KEY in backend\\.env"

    r      = session.requests.all()
    total  = r.count()
    done   = r.filter(status="collected").count()
    noshw  = r.filter(status="no_show").count()
    flagged = r.filter(ai_flagged=True).count()
    dur     = ""
    if session.actual_start and session.actual_end:
        mins = int((session.actual_end - session.actual_start).total_seconds() / 60)
        dur  = f"{mins} minutes"

    prompt = (
        f"Write a 3-4 sentence professional post-session summary for UK school records.\n\n"
        f"Session:  {session.get_session_type_display()}\n"
        f"Date:     {session.date:%A %d %B %Y}\n"
        f"Duration: {dur or 'N/A'}\n"
        f"Stats:    {total} total | {done} collected | {noshw} no-shows | {flagged} AI-flagged\n\n"
        f"British English. Professional tone. No headers."
    )
    try:
        resp = c.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()
    except APIError as e:
        return f"Report generation failed: {e.message}"