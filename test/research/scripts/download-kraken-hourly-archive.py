"""Download only Kraken BTC/EUR and ETH/EUR hourly CSVs from the official ZIP.

Uses validated HTTP ranges rather than downloading every market/timeframe.
Python standard library only. Extracted files are CRC-checked by zipfile.
The entire multipart ZIP's SHA256 is not checked by selective extraction.
"""
import argparse
import io
import json
import re
import time
import urllib.error
import urllib.request
import zipfile
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    destination = Path(args.output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    remote = RemoteArchive(PARTS)
    result = {"archive": "Kraken_OHLCVT_Full_2026Q2.zip", "sources": [BASE + name for name in PARTS],
              "wholeArchiveSha256Verified": False, "files": []}
    with zipfile.ZipFile(remote) as archive:
        names = archive.namelist()
        for symbol, alternatives in [("BTCEUR", ["XBTEUR_60.csv", "XXBTZEUR_60.csv", "BTCEUR_60.csv"]),
                                     ("ETHEUR", ["ETHEUR_60.csv", "XETHZEUR_60.csv"])]:
            candidates = [name for name in names if Path(name).name in alternatives]
            if len(candidates) != 1:
                raise RuntimeError(f"Expected exactly one hourly file for {symbol}; found {candidates}")
            info = archive.getinfo(candidates[0])
            target = destination / f"{symbol}_60.csv"
            temporary = target.with_suffix(".csv.partial")
            with archive.open(info) as source, temporary.open("wb") as output:
                while chunk := source.read(1024 * 1024):
                    output.write(chunk)
            # Reading to EOF checks ZIP CRC before the completed file is exposed.
            temporary.replace(target)
            result["files"].append({"symbol": symbol, "entry": info.filename, "path": str(target.resolve()),
                                    "bytes": info.file_size, "zipCrc32": f"{info.CRC:08x}", "crcVerified": True})
        manifests = [name for name in names if Path(name).name == "MANIFEST.json"]
        if len(manifests) == 1:
            content = archive.read(manifests[0])
            (destination / "MANIFEST.json").write_bytes(content)
    result["downloadedBytes"] = remote.downloaded_bytes
    (destination / "download-receipt.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
