import urllib.request, urllib.parse, json, time

TARGET_CHAT = "u2i-lsoGDTQcZF~g00PDiMfUiA"

data = urllib.parse.urlencode({
    "grant_type": "client_credentials",
    "client_id": "F1Ok3Hz0bjR2EcLFjesX",
    "client_secret": "1h5pkPBVKwbvipEpq-aGTh-Xuje8ZX3vgJD8Ireu"
}).encode()
req = urllib.request.Request(
    "https://api.avito.ru/token",
    data=data,
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
token = json.loads(urllib.request.urlopen(req).read())["access_token"]

req2 = urllib.request.Request(
    "https://api.avito.ru/core/v1/accounts/self",
    headers={"Authorization": "Bearer " + token}
)
user_id = json.loads(urllib.request.urlopen(req2).read())["id"]

# Get last messages from target chat
req3 = urllib.request.Request(
    "https://api.avito.ru/messenger/v3/accounts/{}/chats/{}/messages/?limit=5".format(user_id, TARGET_CHAT),
    headers={"Authorization": "Bearer " + token}
)
msgs_data = json.loads(urllib.request.urlopen(req3).read())
messages = msgs_data.get("messages", [])

# Find last client message (not our own, text type)
last_client_msg = None
for m in messages:
    if str(m.get("author_id")) != str(user_id) and m.get("type") == "text":
        last_client_msg = m
        break

if not last_client_msg:
    print("NO CLIENT MESSAGE FOUND")
    exit(1)

print("LAST CLIENT MSG:", last_client_msg.get("id"), "|", last_client_msg.get("content", {}).get("text"))

# Get chat info for item_id
req4 = urllib.request.Request(
    "https://api.avito.ru/messenger/v2/accounts/{}/chats/{}".format(user_id, TARGET_CHAT),
    headers={"Authorization": "Bearer " + token}
)
chat_info = json.loads(urllib.request.urlopen(req4).read())
context = chat_info.get("context", {})
item_id = context.get("value", {}).get("id") if context.get("type") == "item" else 0
print("ITEM_ID:", item_id)

# Reset dedup in n8n: static data stores replied[chatId] = msgId
# Easier: send webhook with a FAKE msgId so it bypasses dedup
forced_msg_id = "forced_" + str(int(time.time()))

payload = {
    "id": "forced-trigger-" + str(int(time.time())),
    "version": "v3.0.0",
    "timestamp": int(time.time()),
    "payload": {
        "type": "message",
        "value": {
            "id": forced_msg_id,
            "chat_id": TARGET_CHAT,
            "user_id": user_id,
            "author_id": last_client_msg.get("author_id"),
            "created": int(time.time()),
            "type": "text",
            "chat_type": "u2i",
            "content": {"text": last_client_msg.get("content", {}).get("text", "")},
            "item_id": item_id,
            "published_at": "2026-04-17T00:00:00Z"
        }
    }
}

print("\nSENDING WEBHOOK...")
wh_req = urllib.request.Request(
    "https://mycheagent.ru/webhook/avito-messages",
    method="POST",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"}
)
resp = urllib.request.urlopen(wh_req)
print("RESULT:", resp.status, resp.read().decode())
