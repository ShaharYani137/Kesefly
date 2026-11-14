"""
Build mobile/src/data/tase-securities.json: every tradable Tel Aviv Stock Exchange security
(shares, ETFs, bonds, warrants...) with its security number, Hebrew and English name, and the
Yahoo Finance symbol the app uses for prices.

Source: the public search list behind tase.co.il (api.tase.co.il/api/content/searchentities),
lang=0 Hebrew, lang=1 English. Yahoo symbol rule: TASE symbol with "." replaced by "-",
plus ".TA" (KSM.F51 -> KSM-F51.TA). Mutual funds are left out: Yahoo has no prices for them.

Run from the repo root:  python mobile/scripts/make_tase_list.py
Re-run now and then to pick up new listings.
"""
import json
import os
import urllib.request

URL = "https://api.tase.co.il/api/content/searchentities?lang={lang}"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "tase-securities.json")

# TASE sub-type (English description) -> short kind used by the app.
KINDS = {
    "Shares": "share",
    "ETF Fund - Equity": "etf",
    "ETF - Bonds": "etf",
    "Foreign ETF - Equity": "etf",
    "Foreign ETF - Bonds": "etf",
    "HiTech Fund": "etf",
    "Participating unit ": "etf",
    "Participating unit  TASE UP": "etf",
    "Corporate Bonds": "bond",
    "Corporate Bonds TASE UP": "bond",
    "Convertible Bonds": "bond",
    "Convertible Bonds TASE UP": "bond",
    "Government Bonds": "bond",
    "Treasury Bill": "bond",
    "Warrants": "warrant",
    "Purchase Warrant": "warrant",
}


def fetch(lang: int) -> list:
    req = urllib.request.Request(
        URL.format(lang=lang),
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json", "Referer": "https://www.tase.co.il/"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main() -> None:
    he = {x["Id"]: x for x in fetch(0) if x.get("Type") == 1}
    rows = []
    for x in fetch(1):
        if x.get("Type") != 1 or not x.get("Smb"):
            continue
        kind = KINDS.get(x.get("SubTypeDesc") or "")
        if not kind:
            continue
        h = he.get(x["Id"], {})
        yahoo = x["Smb"].strip().upper().replace(".", "-") + ".TA"
        rows.append([x["Id"], yahoo, (h.get("Name") or "").strip(), (x.get("Name") or "").strip(), kind])
    # Shares first, then ETFs, bonds, warrants; alphabetical inside each kind.
    order = {"share": 0, "etf": 1, "bond": 2, "warrant": 3}
    rows.sort(key=lambda r: (order[r[4]], r[3]))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(rows)} securities -> {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()
