#!/usr/bin/env python3
"""Suno WAV 원본에 박힌 C2PA 콘텐츠 자격증명을 읽는다 (외부 패키지 없음).

  python3 tools/c2pa-dump.py                 → audio-src/*.wav 의 자격증명 요약
  python3 tools/c2pa-dump.py --md            → docs/LICENSE-MUSIC.md 에 넣을 표를 출력

각 파일은 Suno 가 서명한 매니페스트를 품고 있다. 그 안에는 곡 id(contentId)와
생성 시각(createdAt), 생성 시스템, 그리고 오디오 데이터에 묶인 해시가 들어 있어
파일이 바뀌면 서명이 깨진다 — 스크린샷보다 훨씬 단단한 증빙이다.

주의: www/audio/*.mp3 는 루프 가공·재인코딩을 거치므로 이 자격증명이 남지 않는다.
증빙으로 보관해야 하는 것은 audio-src 의 wav 원본이다.
"""
import struct, sys, os, hashlib, datetime

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'audio-src')

# ---- 최소 CBOR 리더 (맵·배열·문자열·바이트·정수·태그만) ----
def cbor(b, i=0):
    h = b[i]; mt, ai = h >> 5, h & 0x1f; i += 1
    if ai < 24: v = ai
    elif ai == 24: v = b[i]; i += 1
    elif ai == 25: v = struct.unpack('>H', b[i:i+2])[0]; i += 2
    elif ai == 26: v = struct.unpack('>I', b[i:i+4])[0]; i += 4
    elif ai == 27: v = struct.unpack('>Q', b[i:i+8])[0]; i += 8
    else: raise ValueError('unsupported')
    if mt == 0: return v, i
    if mt == 1: return -1 - v, i
    if mt == 2: return b[i:i+v], i + v
    if mt == 3: return b[i:i+v].decode('utf8', 'replace'), i + v
    if mt == 4:
        out = []
        for _ in range(v): x, i = cbor(b, i); out.append(x)
        return out, i
    if mt == 5:
        out = {}
        for _ in range(v):
            k, i = cbor(b, i); val, i = cbor(b, i); out[k] = val
        return out, i
    if mt == 6: return cbor(b, i)
    return None, i

def riff_chunk(b, want):
    pos = 12
    while pos + 8 <= len(b):
        cid = b[pos:pos+4]; sz = struct.unpack('<I', b[pos+4:pos+8])[0]
        if cid == want: return b[pos+8:pos+8+sz]
        pos += 8 + sz + (sz & 1)
    return None

def jumbf_boxes(buf, off=0, end=None, depth=0):
    end = len(buf) if end is None else end
    while off + 8 <= end:
        size = struct.unpack('>I', buf[off:off+4])[0]; typ = buf[off+4:off+8]
        if size < 8 or off + size > end: return
        yield depth, typ, buf[off+8:off+size]
        if typ == b'jumb':
            yield from jumbf_boxes(buf, off + 8, off + size, depth + 1)
        off += size

def certs_in(sig_box):
    """COSE x5chain 의 인증서에서 이름(O/CN)만 뽑는다 — ASN.1 UTF8String(0x0c)·PrintableString(0x13) TLV"""
    names, i = [], 0
    while i < len(sig_box) - 2:
        if sig_box[i] in (0x0c, 0x13):
            n = sig_box[i+1]
            if 2 <= n <= 64:
                v = sig_box[i+2:i+2+n]
                if len(v) == n and all(32 <= c < 127 for c in v):
                    s = v.decode('ascii')
                    if s not in names: names.append(s)
                    i += 2 + n; continue
        i += 1
    return names

def read(path):
    b = open(path, 'rb').read()
    out = {'file': os.path.basename(path), 'sha256': hashlib.sha256(b).hexdigest(), 'bytes': len(b)}
    # RIFF 주석: 이 파일이 만들어진(=내려받은) 시각
    lst = riff_chunk(b, b'LIST')
    if lst:
        t = lst.decode('latin1')
        if 'created=' in t:
            out['downloaded'] = t.split('created=')[1].split(';')[0].split('\x00')[0].strip()
    c2 = riff_chunk(b, b'C2PA')
    if not c2:
        out['c2pa'] = None
        return out
    out['c2pa'] = True
    for depth, typ, payload in jumbf_boxes(c2):
        if typ == b'cbor':
            try: obj, _ = cbor(payload)
            except Exception: continue
            if isinstance(obj, dict) and 'contentId' in obj:
                out['contentId'] = obj.get('contentId'); out['createdAt'] = obj.get('createdAt')
                out['provider'] = obj.get('providerName'); out['system'] = f"{obj.get('systemName')} {obj.get('systemVersion')}"
            if isinstance(obj, dict) and 'actions' in obj:
                a = obj['actions'][0] if obj['actions'] else {}
                out['action'] = a.get('action'); out['sourceType'] = (a.get('digitalSourceType') or '').rsplit('/', 1)[-1]
        if typ == b'jumd' and payload[17:].split(b'\x00')[0] == b'c2pa.signature':
            pass
    sig = c2[c2.find(b'c2pa.signature'):] if b'c2pa.signature' in c2 else b''
    names = certs_in(sig)
    out['signer'] = [x for x in names if 'DigiCert' not in x and x not in ('US', 'www.digicert.com')]
    out['tsa'] = [x for x in names if 'DigiCert' in x]
    return out

def main():
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith('.wav')) if os.path.isdir(SRC) else []
    if not files:
        print(f'{SRC} 에 wav 원본이 없습니다'); return 1
    rows = [read(os.path.join(SRC, f)) for f in files]
    if '--md' in sys.argv:
        print('| 파일 | 곡 id (contentId) | 생성(UTC) | 다운로드(UTC) | 서명 | sha256 |')
        print('|---|---|---|---|---|---|')
        for r in rows:
            print(f"| `{r['file']}` | `{r.get('contentId','—')}` | {r.get('createdAt','—')} | {r.get('downloaded','—')} | "
                  f"{' ← '.join(r.get('signer') or ['—'])} | `{r['sha256'][:16]}…` |")
        return 0
    for r in rows:
        print(f"\n{r['file']}  ({r['bytes']:,} B)")
        if not r.get('c2pa'):
            print('  C2PA 자격증명 없음 — 재인코딩됐거나 자격증명 도입 전 파일입니다'); continue
        print(f"  곡 id      {r.get('contentId')}")
        print(f"  생성       {r.get('createdAt')}   (Suno 에서 곡이 만들어진 시각)")
        print(f"  다운로드   {r.get('downloaded')}   (이 파일이 렌더돼 내려온 시각)")
        print(f"  생성 시스템 {r.get('provider')} · {r.get('system')}")
        print(f"  선언       {r.get('action')} / {r.get('sourceType')}")
        print(f"  서명       {' ← '.join(r.get('signer') or [])}")
        print(f"  타임스탬프 {(r.get('tsa') or ['—'])[0]}   (제3자 RFC 3161 타임스탬프)")
        print(f"  sha256     {r['sha256']}")
    return 0

if __name__ == '__main__':
    sys.exit(main())
