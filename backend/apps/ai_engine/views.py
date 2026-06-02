import logging
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import AIInsight, AIChatHistory
from .serializers import AIInsightSerializer
from .services import chat, predict_peak, session_report
from apps.pickups.models import PickupSession

log = logging.getLogger("apps.ai_engine")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def ai_chat(request):
    msg = request.data.get("message", "").strip()
    sid = request.data.get("session_id")
    if not msg:
        return Response({"error": "message required"}, status=400)

    history, _ = AIChatHistory.objects.get_or_create(
        user=request.user, session_ctx_id=sid, defaults={"messages": []}
    )
    msgs = list(history.messages)
    msgs.append({"role": "user", "content": msg})
    reply = chat(msgs, session_id=sid)
    msgs.append({"role": "assistant", "content": reply})
    history.messages = msgs
    history.save(update_fields=["messages", "updated_at"])
    return Response({"reply": reply, "conversation_id": str(history.id)})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def ai_predict(request, pk):
    try:
        session = PickupSession.objects.get(pk=pk)
    except PickupSession.DoesNotExist:
        return Response({"error": "not found"}, status=404)

    prediction = predict_peak(session)

    if "error" not in prediction:
        from datetime import time
        try:
            h, m = map(int, prediction["predicted_peak"].split(":"))
            session.ai_peak_time     = time(h, m)
            session.ai_peak_duration = prediction.get("duration_minutes")
            session.ai_confidence    = prediction.get("confidence")
            session.save(update_fields=["ai_peak_time", "ai_peak_duration", "ai_confidence"])
        except Exception:
            pass
        AIInsight.objects.create(
            session=session,
            insight_type=AIInsight.TYPE_PREDICTION,
            title=f"Peak prediction — {session.date}",
            content=prediction.get("reasoning", ""),
            confidence=prediction.get("confidence"),
            raw_data=prediction,
        )

    return Response(prediction)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def ai_report(request, pk):
    try:
        session = PickupSession.objects.get(pk=pk)
    except PickupSession.DoesNotExist:
        return Response({"error": "not found"}, status=404)
    report = session_report(session)
    AIInsight.objects.create(
        session=session, insight_type=AIInsight.TYPE_SUMMARY,
        title=f"Session summary — {session.date}", content=report,
    )
    return Response({"report": report})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def ai_insights(request):
    sid = request.query_params.get("session")
    qs  = AIInsight.objects.filter(acknowledged=False)
    if sid:
        qs = qs.filter(session_id=sid)
    return Response(AIInsightSerializer(qs.order_by("-created_at")[:20], many=True).data)