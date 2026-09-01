# caesar.github.io

个人主页,纯静态 HTML,GitHub Pages 部署。

## 添加 / 修改一篇 Research

首页 Research 板块的条目卡片**不要手改**(`index.html` 中 `ENTRIES:START/END` 标记之间是生成区)。报告页是唯一信息源:

1. 在 `research/<slug>/index.html` 中维护好:
   - `<h1>` —— 卡片标题的唯一来源
   - `<meta name="description">` —— 卡片摘要
   - 4 个卡片 meta:
     - `card:date` —— `YYYY-MM-DD`,卡片按它降序排列
     - `card:read` —— 如 `约 25 分钟阅读`
     - `card:tags` —— 用 `|` 分隔,如 `Benchmark 调研|LLM · Agent`
     - `card:cover-sub` —— 封面副标题
2. 运行 `python3 tools/sync_index.py`(仅需 Python 3 标准库),首页卡片即重新生成。
3. 一起提交报告页、首页的改动。

改标题/摘要同理:只改报告页,再跑一次脚本。
