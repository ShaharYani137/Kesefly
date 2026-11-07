#!/usr/bin/env python3
"""Regenerate the skill from Apple's published Human Interface Guidelines.

Downloads the DocC JSON that backs https://developer.apple.com/design/human-interface-guidelines
(the same data the website renders), converts every page to Markdown verbatim, and
rebuilds references/ plus the index in SKILL.md. Standard library only.

Usage: python3 scripts/sync_hig.py
"""
import glob, json, os, re, tempfile, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

DATA = "https://developer.apple.com/tutorials/data"
SITE = "https://developer.apple.com"
ROOT_URL = "/design/human-interface-guidelines"
PREFIX = ROOT_URL + "/"
SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_DIR = os.path.join(SKILL_DIR, "references")
CACHE = tempfile.mkdtemp(prefix="hig-")
pages = {}


def fetch(path):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(DATA + path + ".json", timeout=30) as r:
                return path, json.load(r)
        except Exception as e:
            err = e
            time.sleep(1 + attempt)
    raise RuntimeError(f"failed to fetch {path}: {err}")


def crawl():
    queue, seen = [ROOT_URL], set()
    while queue:
        batch = [q for q in queue if q not in seen]
        queue = []
        seen.update(batch)
        with ThreadPoolExecutor(8) as ex:
            for path, data in ex.map(fetch, batch):
                pages[path] = data
                for ref in data.get("references", {}).values():
                    u = ref.get("url", "")
                    if u.startswith(PREFIX) and "#" not in u and u not in seen:
                        queue.append(u)


def slug(url):
    return url.rstrip("/").split("/")[-1]


class Renderer:
    def __init__(self, data):
        self.refs = data.get("references", {})

    def target(self, ident):
        r = self.refs.get(ident, {})
        u = r.get("url", "")
        if u.startswith(PREFIX):
            return slug(u) + ".md", r.get("title")
        if u.startswith("/"):
            return SITE + u, r.get("title")
        return u or ident, r.get("title")

    def media(self, node, kind):
        """Apple's alt text plus any caption shown under the image or video."""
        alt = (self.refs.get(node.get("identifier"), {}).get("alt") or "").strip()
        caption = self.inline(node.get("metadata", {}).get("abstract")).strip()
        out = f"[{kind}: {alt}]" if alt else ""
        if caption:
            out += (" " if out else "") + f"Caption: {caption}"
        return out

    def inline(self, items):
        out = ""
        for x in items or []:
            t = x["type"]
            if t == "text":
                out += x["text"]
            elif t == "strong":
                inner = self.inline(x["inlineContent"])
                out += "**" + inner.strip() + "**" + (" " if inner.endswith(" ") else "")
            elif t == "emphasis":
                out += "*" + self.inline(x["inlineContent"]).strip() + "*"
            elif t == "codeVoice":
                out += "`" + x["code"] + "`"
            elif t == "reference":
                link, title = self.target(x["identifier"])
                out += f"[{x.get('overridingTitle') or title or link}]({link})"
            elif t == "link":
                out += f"[{x.get('title') or x['destination']}]({x['destination']})"
            elif t == "image":
                out += self.media(x, "Image")
            elif "inlineContent" in x:
                out += self.inline(x["inlineContent"])
            elif "text" in x:
                out += x["text"]
        return out

    def blocks(self, blocks):
        out = []
        for b in blocks or []:
            t = b["type"]
            if t == "heading":
                out.append("#" * b["level"] + " " + b["text"])
            elif t == "paragraph":
                out.append(self.inline(b["inlineContent"]).strip())
            elif t in ("unorderedList", "orderedList"):
                lines = []
                for n, item in enumerate(b["items"], 1):
                    body = self.blocks(item.get("content", [])).strip().replace("\n", "\n   ")
                    lines.append(("- " if t == "unorderedList" else f"{n}. ") + body)
                out.append("\n".join(lines))
            elif t == "aside":
                name = b.get("name") or b.get("style", "Note").capitalize()
                body = self.blocks(b["content"]).strip()
                out.append(f"> **{name}:** " + body.replace("\n", "\n> "))
            elif t == "table":
                cells = [[self.blocks(c).strip().replace("\n", " ").replace("|", "\\|") for c in row]
                         for row in b.get("rows", [])]
                if not cells:
                    continue
                w = max(len(r) for r in cells)
                cells = [r + [""] * (w - len(r)) for r in cells]
                head, body = (cells[0], cells[1:]) if b.get("header") == "row" else ([""] * w, cells)
                out.append("\n".join(["| " + " | ".join(head) + " |", "|" + "---|" * w]
                                     + ["| " + " | ".join(r) + " |" for r in body]))
            elif t == "tabNavigator":
                for tab in b["tabs"]:
                    out.append(f"**{tab['title']}**\n\n" + self.blocks(tab["content"]).strip())
            elif t == "row":
                out.extend(self.blocks(col["content"]).strip() for col in b["columns"])
            elif t == "links":
                out.append("\n".join("- [{1}]({0})".format(*self.target(i)) for i in b["items"]))
            elif t == "video":
                out.append(self.media(b, "Video"))
            elif t == "small":
                out.append(self.inline(b["inlineContent"]))
            elif "content" in b:
                out.append(self.blocks(b["content"]))
            else:
                print("warning: unhandled block type", t)
        return "\n\n".join(o for o in out if o)


def render(url):
    data = pages[url]
    r, meta = Renderer(data), data["metadata"]
    custom = meta.get("customMetadata", {})
    header = [f"> Source: {SITE}{url}"]
    if custom.get("supported-platforms"):
        header.append("> Platforms: " + custom["supported-platforms"])
    if custom.get("alert-date"):
        header.append(f"> Last update noted by Apple: {custom['alert-date']} — {custom.get('alert-text', '')}")
    abstract = r.inline(data.get("abstract")).strip()
    parts = ["# " + meta["title"], "  \n".join(header)]
    if abstract:
        parts.append("*" + abstract + "*")
    parts += [r.blocks(s.get("content", [])) for s in data.get("primaryContentSections", [])]
    text = re.sub(r"\n{3,}", "\n\n", "\n\n".join(p for p in parts if p.strip())) + "\n"
    with open(os.path.join(REF_DIR, slug(url) + ".md"), "w") as f:
        f.write(text)
    return meta["title"], abstract


def children(url, placed):
    """Topic groups of a page, in Apple's order: [(group title, [child urls])]."""
    data, groups = pages[url], []
    for ts in data.get("topicSections", []):
        items = []
        for ident in ts["identifiers"]:
            u = data["references"].get(ident, {}).get("url", "")
            if u.startswith(PREFIX) and u not in placed:
                placed.add(u)
                items.append(u)
        groups.append((ts.get("title"), items))
    return groups


def build():
    os.makedirs(REF_DIR, exist_ok=True)
    for f in glob.glob(os.path.join(REF_DIR, "*.md")):
        os.remove(f)
    placed, lines = set(), []

    def entry(url, depth):
        title, abstract = render(url)
        lines.append("  " * depth + f"- [{title}](references/{slug(url)}.md) — {abstract}")
        for _, items in children(url, placed):
            for u in items:
                entry(u, depth + 1)

    for _, sections in children(ROOT_URL, placed):
        for section in sections:
            title, abstract = render(section)
            lines += ["", f"### [{title}](references/{slug(section)}.md)", "", f"*{abstract}*", ""]
            for _, items in children(section, placed):
                for u in items:
                    entry(u, 0)
    orphans = sorted(set(pages) - placed - {ROOT_URL})
    if orphans:
        lines += ["", "### Other pages", ""]
        for u in orphans:
            title, abstract = render(u)
            lines.append(f"- [{title}](references/{slug(u)}.md) — {abstract}")

    skill = os.path.join(SKILL_DIR, "SKILL.md")
    text = open(skill).read()
    start, end = "<!-- INDEX:START -->", "<!-- INDEX:END -->"
    stamp = time.strftime("%Y-%m-%d")
    index = f"{start}\n\n_{len(pages) - 1} pages, synced {stamp}._\n" + "\n".join(lines) + f"\n\n{end}"
    text = re.sub(re.escape(start) + ".*?" + re.escape(end), lambda _: index, text, flags=re.S)
    open(skill, "w").write(text)
    print(f"Wrote {len(pages) - 1} reference pages and updated the SKILL.md index.")


if __name__ == "__main__":
    crawl()
    build()
