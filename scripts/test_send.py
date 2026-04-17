import urllib.request, urllib.parse, json

data = urllib.parse.urlencode({
    "grant_type": "client_credentials",
    "client_id": "F1Ok3Hz0bjR2EcLFjesX",
    "client_secret": "1h5pkPBVKwbvipEpq-aGTh-Xuje8ZX3vgJD8Ireu"
}).encode()
req = urllib.request.Request(
    "https://api.avito.ru/token", data=data,
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
token = json.loads(urllib.request.urlopen(req).read())["access_token"]

CHAT = "u2i-lsoGDTQcZF~g00PDiMfUiA"
USER = 170808740

tests = [("v1", ""), ("v1", "/"), ("v2", ""), ("v2", "/"), ("v3", ""), ("v3", "/")]

for ver, slash in tests:
    url = "https://api.avito.ru/messenger/{}/accounts/{}/chats/{}/messages{}".format(ver, USER, CHAT, slash)
    body = json.dumps({"message": {"text": "ignore test ping"}, "type": "text"}).encode()
    req2 = urllib.request.Request(
        url, method="POST", data=body,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}
    )
    try:
        r = urllib.request.urlopen(req2)
        print("SEND " + ver + slash + " OK:", r.status, r.read().decode()[:150])
        break
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:100]
        print("SEND " + ver + slash + " ERR:", e.code, err)
    except Exception as e:
        print("SEND " + ver + slash + " EXC:", str(e)[:100])
