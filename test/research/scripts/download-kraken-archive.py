"""Extract CRC-verified official daily/4h Kraken EUR data for causal dynamic basket research.
Keeps source data; the whole multipart archive SHA256 is not verified.
"""
import argparse
import io
import json
import re
import time
import urllib.error
import urllib.request
import zipfile
import zlib
import struct
import concurrent.futures
import datetime
import hashlib
from pathlib import Path

BASE = "https://assets.kraken.com/marketing/institutions/"
PARTS = [f"Kraken_OHLCVT_Full_2026Q2.zip.part{i:02d}" for i in range(5)]


def get_range(url, start, end):
    for attempt in range(3):
        request = urllib.request.Request(url, headers={
            "Range": f"bytes={start}-{end}", "User-Agent": "TradingAssistant/1.0",
            "Accept-Encoding": "identity",
        })
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                match = re.fullmatch(r"bytes (\d+)-(\d+)/(\d+)", response.headers.get("Content-Range", ""))
                if response.status != 206 or not match:
                    raise RuntimeError("Archive server did not honor the requested range.")
                actual_start, actual_end, total = map(int, match.groups())
                if actual_start != start or actual_end != min(end, total - 1):
                    raise RuntimeError("Archive range does not match the request.")
                data = response.read()
                if len(data) != actual_end - actual_start + 1:
                    raise RuntimeError("Incomplete archive range response.")
                return data, total
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(attempt + 1)
    raise RuntimeError("Archive range retrieval failed.")


class RemoteArchive(io.RawIOBase):
    def __init__(self, parts):
        super().__init__()
        self.parts, self.offsets, self.size = [], [], 0
        for name in parts:
            url = BASE + name
            _, length = get_range(url, 0, 0)
            self.parts.append((url, length))
            self.offsets.append(self.size)
            self.size += length
        self.position = 0
        self.cache_start = -1
        self.cache = b""
        self.downloaded_bytes = 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=io.SEEK_SET):
        position = offset if whence == io.SEEK_SET else self.position + offset if whence == io.SEEK_CUR else self.size + offset
        if position < 0:
            raise ValueError("Negative archive offset")
        self.position = position
        return position

    def read(self, size=-1):
        remaining = self.size - self.position if size < 0 else min(size, self.size - self.position)
        chunks = []
        while remaining > 0:
            if not (self.cache_start <= self.position < self.cache_start + len(self.cache)):
                index = max(i for i, offset in enumerate(self.offsets) if offset <= self.position)
                url, length = self.parts[index]
                local = self.position - self.offsets[index]
                fetch_size = min(max(remaining, 1024 * 1024), length - local)
                self.cache, _ = get_range(url, local, local + fetch_size - 1)
                self.cache_start = self.position
                self.downloaded_bytes += len(self.cache)
            begin = self.position - self.cache_start
            count = min(remaining, len(self.cache) - begin)
            chunks.append(self.cache[begin:begin + count])
            self.position += count
            remaining -= count
        return b"".join(chunks)


def main():
    parser = argparse.ArgumentParser(description="CRC-verified selective official Kraken archive extraction and pre-period EUR liquidity ranking.")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--through", default="2022-05-26T20:00:00Z")
    parser.add_argument("--rank-before", default="2021-12-21T16:00:00Z")
    args = parser.parse_args()
    destination = Path(args.output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    remote = RemoteArchive(PARTS)
    with zipfile.ZipFile(remote) as archive:
        entries = {Path(i.filename).name: i for i in archive.infolist()}
    cutoff = int(datetime.datetime.fromisoformat(args.rank_before.replace("Z", "+00:00")).timestamp())
    through = int(datetime.datetime.fromisoformat(args.through.replace("Z", "+00:00")).timestamp())
    candidates = []
    def extract(info):
        def read_at(start, count):
            chunks = []
            while count:
                index = max(i for i, offset in enumerate(remote.offsets) if offset <= start)
                url, length = remote.parts[index]
                local = start - remote.offsets[index]
                size = min(count, length-local)
                chunk, _ = get_range(url, local, local+size-1)
                chunks.append(chunk); start += size; count -= size
            return b"".join(chunks)
        header = read_at(info.header_offset, 30)
        if header[:4] != b"PK\x03\x04": raise RuntimeError("Invalid ZIP local header")
        name_size, extra_size = struct.unpack_from("<HH", header, 26)
        compressed = read_at(info.header_offset+30+name_size+extra_size, info.compress_size)
        content = zlib.decompress(compressed, -15) if info.compress_type == zipfile.ZIP_DEFLATED else compressed
        if len(content) != info.file_size or zlib.crc32(content) & 0xffffffff != info.CRC:
            raise RuntimeError("Invalid ZIP CRC/length")
        return content
    aliases = {"XBT":"BTC", "XXBTZ":"BTC", "XETHZ":"ETH", "XXRPZ":"XRP", "XLTCZ":"LTC", "XXLMZ":"XLM", "XXDGZ":"DOGE", "XDG":"DOGE", "XZECZ":"ZEC", "XXMRZ":"XMR", "XETCZ":"ETC", "XXTZZ":"XTZ"}
    stable = {"UST", "USTC", "USDD", "USDS", "USDP", "FRAX", "LUSD", "FDUSD", "USDT", "USDC", "DAI", "EURC", "EURT", "PYUSD", "TUSD", "USDE", "USDG", "RLUSD", "USDQ", "EURQ", "USD1", "EUR", "USD", "GBP", "CHF", "AUD", "CAD", "JPY"}
    def rank_entry(info):
        base = Path(info.filename).name.removesuffix("EUR_1440.csv")
        base = aliases.get(base, base)
        if base in stable: return None
        target = destination / (base+"EUR_1440.csv")
        content = target.read_bytes() if target.exists() else extract(info)
        if len(content) != info.file_size or zlib.crc32(content) & 0xffffffff != info.CRC: raise RuntimeError("Cached source CRC mismatch")
        target.write_bytes(content)
        rows = [line.split(",") for line in content.decode().splitlines() if line.strip()]
        closed = [r for r in rows if int(r[0])+86400 <= cutoff]
        recent = [r for r in closed if int(r[0]) >= cutoff-30*86400]
        if any(int(r[0])+86400 <= through for r in rows):
            candidates.append({"symbol":base+"EUR", "archiveBase":Path(info.filename).name.removesuffix("_1440.csv")})
        if not recent: return None
        turnover = sum(float(r[4])*float(r[5]) for r in recent)
        return {"symbol": base+"EUR", "turnoverEUR30d":turnover, "dailyWarmupBars":len(closed), "dailySourceSha256":hashlib.sha256(content).hexdigest(), "archiveBase":Path(info.filename).name.removesuffix("_1440.csv")}
    daily = [v for k,v in entries.items() if k.endswith("EUR_1440.csv")]
    ranked = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for i, row in enumerate(pool.map(rank_entry, daily)):
            if row: ranked.append(row)
            if i % 25 == 0: print(json.dumps({"dailyScanned":i, "total":len(daily)}), flush=True)
    ranked.sort(key=lambda r:(-r["turnoverEUR30d"],r["symbol"]))
    selected = ranked[:30]
    if len(selected) != 30: raise RuntimeError("Insufficient historical eligible markets")
    receipt = {"archive":"Kraken_OHLCVT_Full_2026Q2.zip", "sources":[BASE+n for n in PARTS], "wholeArchiveSha256Verified":False, "rankingAt":args.rank_before, "rankingWindowDays":30, "rankingMethod":"Sum of completed daily close times base volume; EUR turnover proxy, not order-book depth", "eligibleUniverse":len(ranked), "dailyMarketsScanned":len(daily), "excludedStablecoins":sorted(stable), "selected":selected, "files":[], "historicalCandidates":sorted(candidates,key=lambda c:c["symbol"]), "historicalThrough":args.through}
    for row in sorted(candidates,key=lambda c:c["symbol"]):
        info = entries[row["archiveBase"]+"_240.csv"]
        target = destination/(row["symbol"]+"_240.csv")
        content = target.read_bytes() if target.exists() else extract(info)
        if len(content) != info.file_size or zlib.crc32(content) & 0xffffffff != info.CRC: raise RuntimeError("Cached 4h source CRC mismatch")
        target.write_bytes(content)
        receipt["files"].append({"symbol":row["symbol"], "entry":info.filename, "path":str(target.resolve()), "bytes":info.file_size, "zipCrc32":f"{info.CRC:08x}", "crcVerified":True, "sha256":hashlib.sha256(content).hexdigest()})
        print(json.dumps({"extracted":row["symbol"]}), flush=True)
    (destination/"liquidity-selection.json").write_text(json.dumps(receipt,indent=2)+"\n")

if __name__ == "__main__":
    main()
