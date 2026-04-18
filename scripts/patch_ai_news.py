import json

with open("C:/Users/Денис/Desktop/N8N/.claude/worktrees/fervent-hoover/scripts/fetch_rss.js", "r", encoding="utf-8") as f:
    code = f.read()

with open("C:/Users/Денис/Desktop/N8N/.claude/worktrees/fervent-hoover/workflows/07-ai-news.json", "r", encoding="utf-8") as f:
    wf = json.load(f)

for n in wf["nodes"]:
    if n["name"] == "Fetch RSS Feeds":
        n["parameters"]["jsCode"] = code
        break

with open("C:/Users/Денис/Desktop/N8N/.claude/worktrees/fervent-hoover/workflows/07-ai-news.json", "w", encoding="utf-8") as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("patched")
