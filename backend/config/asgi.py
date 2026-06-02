"""ASGI — HTTP + WebSocket via Django Channels"""
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django_app = get_asgi_application()

from apps.pickups.routing import ws_patterns as pickup_ws
from apps.alerts.routing import ws_patterns as alert_ws

application = ProtocolTypeRouter({
    "http": django_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(URLRouter(pickup_ws + alert_ws))
    ),
})