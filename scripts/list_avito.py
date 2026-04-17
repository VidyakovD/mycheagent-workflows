import urllib.request, urllib.parse, json

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
self_info = json.loads(urllib.request.urlopen(req2).read())
user_id = self_info["id"]
print("USER_ID:", user_id, "NAME:", self_info.get("name", ""))

req3 = urllib.request.Request(
    "https://api.avito.ru/messenger/v2/accounts/{}/chats?limit=20&unread_only=false".format(user_id),
    headers={"Authorization": "Bearer " + token}
)
chats = json.loads(urllib.request.urlopen(req3).read())

print()
print("LAST CHATS:")
for c in chats.get("chats", [])[:10]:
    last = c.get("last_message", {}) or {}
    author = str(last.get("author_id", ""))
    is_us = author == str(user_id)
    label = "OUR" if is_us else "CLIENT"
    text = (last.get("content", {}) or {}).get("text", "") or ""
    print("  chat_id:", c.get("id", ""), "| last_author:", author, "(" + label + ")", "| text:", text[:70])
