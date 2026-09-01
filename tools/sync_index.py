#!/usr/bin/env python3
"""从 research/*/index.html 重新生成首页(index.html)的 Research 条目卡片。

报告页是唯一信息源,首页标记区间内的内容请勿手改:
  卡片标题  <- 报告页 <h1>
  卡片摘要  <- <meta name="description" content="...">
  其余字段  <- 4 个卡片 meta:
    card:date       YYYY-MM-DD,用于排序(新在前)
    card:read       如 "约 25 分钟阅读"
    card:tags       用 | 分隔,如 "Benchmark 调研|LLM · Agent"
    card:cover-sub  封面副标题

用法: python3 tools/sync_index.py
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
START = "<!-- ENTRIES:START -->"
END = "<!-- ENTRIES:END -->"


def extract(pattern: str, text: str, what: str, path: Path, flags: int = 0) -> str:
    m = re.search(pattern, text, flags)
    if not m:
        raise SystemExit(f"error: {path.relative_to(ROOT)} 缺少 {what}")
    return m.group(1).strip()


def load_entry(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    # 先剥离 HTML 注释,避免注释里的示例标签(如 <h1>)被误匹配
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)

    def meta(name: str) -> str:
        return extract(rf'<meta\s+name="{name}"\s+content="([^"]*)"', text,
                       f'<meta name="{name}">', path)

    raw_h1 = extract(r"<h1[^>]*>(.*?)</h1>", text, "<h1>", path, re.S)
    return {
        "href": f"{path.parent.relative_to(ROOT)}/",
        "title": re.sub(r"<[^>]+>", "", raw_h1),  # 剥离 h1 内部标签
        "desc": meta("description"),
        "date": meta("card:date"),
        "read": meta("card:read"),
        "tags": [t.strip() for t in meta("card:tags").split("|") if t.strip()],
        "cover_sub": meta("card:cover-sub"),
    }


def render(e: dict) -> str:
    esc = html.escape
    tags = "\n".join(
        f'          <span class="pill{" green" if i % 2 else ""}">{esc(t)}</span>'
        for i, t in enumerate(e["tags"])
    )
    return f"""    <article class="entry">
      <a class="entry-cover" href="{e["href"]}" aria-label="阅读:{esc(e["title"])}">
        <div class="mini-bars"><i></i><i></i><i></i><i></i><i></i></div>
        <div class="cover-title">{esc(e["title"])}</div>
        <div class="cover-sub">{esc(e["cover_sub"])}</div>
      </a>
      <div class="entry-body">
        <div class="entry-meta">
{tags}
          <span>{esc(e["date"])} · {esc(e["read"])}</span>
        </div>
        <h3><a href="{e["href"]}">{esc(e["title"])}</a></h3>
        <p>{esc(e["desc"])}</p>
        <a class="read-more" href="{e["href"]}">阅读全文 →</a>
      </div>
    </article>"""


def main() -> None:
    paths = sorted(ROOT.glob("research/*/index.html"))
    if not paths:
        raise SystemExit("error: 没有找到任何 research/*/index.html")
    entries = sorted((load_entry(p) for p in paths), key=lambda e: e["date"], reverse=True)

    block = START + "\n" + "\n\n".join(render(e) for e in entries) + "\n    " + END
    text = INDEX.read_text(encoding="utf-8")
    new, n = re.subn(re.escape(START) + r".*?" + re.escape(END), lambda _: block, text, flags=re.S)
    if n != 1:
        raise SystemExit(f"error: {INDEX.name} 中应恰有一对 {START} / {END} 标记")
    if new == text:
        print("index.html 已是最新,无变化")
        return
    INDEX.write_text(new, encoding="utf-8")
    print(f"已同步 {len(entries)} 篇到 index.html:")
    for e in entries:
        print(f"  {e['date']}  {e['href']}  {e['title']}")


if __name__ == "__main__":
    main()
