from django.urls import re_path
from . import consumers

ws_patterns = [
    re_path(r"ws/queue/(?P<session_id>[0-9a-f-]+)/$", consumers.QueueConsumer.as_asgi()),
    re_path(r"ws/dashboard/$",                         consumers.DashboardConsumer.as_asgi()),
]