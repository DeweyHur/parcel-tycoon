#!/usr/bin/env python3
"""Suno 원본(audio-src/*.wav 또는 *.mp3) → 게임용 루프/원샷 (www/audio/*.mp3)
- 원본은 wav 를 우선으로 찾는다 (Suno 는 유료 플랜에서 무손실 wav 를 준다 — 재인코딩 손실을 한 번 아낀다)
- 루프 곡: 시작 1초 이후 구간과 파형 상관이 가장 높은 지점을 루프 끝으로 골라 크로스페이드로 이음 (심리스)
- 라우드니스 정규화 (loudnorm), mp3 160k
사용: python3 tools/make_loops.py
"""
import subprocess, numpy as np, os, sys, json
SR = 44100
ROOT = os.path.join(os.path.dirname(__file__), '..', 'www', 'audio')
SRC = os.path.join(os.path.dirname(__file__), '..', 'audio-src')

def src_path(name):
    """audio-src/<name>.wav 가 있으면 그걸, 없으면 .mp3 를 쓴다"""
    for ext in ('.wav', '.mp3'):
        p = os.path.join(SRC, name + ext)
        if os.path.exists(p):
            return p
    raise SystemExit(f'원본을 찾을 수 없습니다: {os.path.join(SRC, name)}.wav|.mp3')

def load(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'])
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def save(a, path, lufs):
    tmp = path + '.tmp.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', tmp], input=a.astype(np.float32).tobytes(), check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11', '-ar', str(SR), '-codec:a', 'libmp3lame', '-b:a', '160k', path], check=True)
    os.remove(tmp)

def best_loop_end(a, start_s, min_end_s, max_end_s):
    """RMS 엔벨로프(10ms) 16초 창의 상관이 가장 높은 루프 길이를 [min,max]에서 고른 뒤 샘플 단위로 위상 정렬"""
    mono = a.mean(axis=1)
    hop = 441; n = len(mono) // hop; fps = SR / hop
    e = np.sqrt((mono[:n * hop].reshape(n, hop) ** 2).mean(axis=1)); x = e - e.mean()
    W = int(16 * fps); s0 = int(start_s * fps)
    ref = x[s0:s0 + W]
    cands = []
    for L in np.arange(min_end_s - start_s, max_end_s - start_s, 0.01):
        i = int(s0 + L * fps); seg = x[i:i + W]
        if len(seg) < W: break
        cands.append((float(np.dot(ref, seg) / np.sqrt(np.dot(ref, ref) * np.dot(seg, seg) + 1e-9)), float(L)))
    cands.sort(reverse=True)
    best_c, best_len = cands[0]
    coarse = int((start_s + best_len) * SR)
    blk = mono[int(start_s * SR):int(start_s * SR) + 8820]
    blk = (blk - blk.mean()) / (blk.std() + 1e-9)
    best2, bi2 = -9, coarse
    for i in range(coarse - 1500, coarse + 1500, 2):
        seg = mono[i:i + 8820]
        c = np.dot(blk, (seg - seg.mean()) / (seg.std() + 1e-9)) / 8820
        if c > best2: best2, bi2 = c, i
    print(f'   candidates: {[(round(c, 2), round(L, 2)) for c, L in cands[:5]]}, wave-corr={best2:.2f}')
    return bi2 / SR, best_c

OVERRIDE = {'warehouse': 33.2, 'market': 23.1}  # 루프 끝 지점을 직접 지정 (초, ±50ms 안에서 위상 정렬). 이음새가 어색하면 여기서 조정

def make_loop(name, start_s, min_end_s, max_end_s, lufs=-16, xf_ms=40):
    a = load(src_path(name))
    if name in OVERRIDE: end_s, corr = best_loop_end(a, start_s, OVERRIDE[name] - 0.05, OVERRIDE[name] + 0.05)
    else: end_s, corr = best_loop_end(a, start_s, min_end_s, max_end_s)
    s, e, xf = int(start_s * SR), int(end_s * SR), int(xf_ms / 1000 * SR)
    out = a[s:e].copy()
    # 끝부분을 시작 직전 샘플과 크로스페이드 → 루프 이음새 제거
    t = np.linspace(0, 1, xf)[:, None]
    out[-xf:] = out[-xf:] * (1 - t) + a[s - xf:s] * t
    save(out, os.path.join(ROOT, name + '.mp3'), lufs)
    print(f'{name}: loop {start_s:.2f}s → {end_s:.3f}s ({end_s - start_s:.1f}s, corr {corr:.2f})')

def make_oneshot(name, end_s=None, fade_s=0, lufs=-16):
    a = load(src_path(name))
    if end_s: a = a[:int(end_s * SR)].copy()
    if fade_s:
        n = int(fade_s * SR); a[-n:] *= np.linspace(1, 0, n)[:, None]
    a[:int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
    save(a, os.path.join(ROOT, name + '.mp3'), lufs)
    print(f'{name}: one-shot {len(a) / SR:.1f}s')

if __name__ == '__main__':
    make_loop('title', 1.0, 48, 64)
    make_loop('warehouse', 1.0, 30, 56)      # 58초 이후 분위기 바뀜 → 그 전까지만 (16.1초 프레이즈 ×2)
    make_loop('overflow', 1.0, 40, 56, xf_ms=300)   # 엔벨로프 주기가 약해 긴 크로스페이드로 이음새 완화
    make_loop('market', 1.0, 22, 34, xf_ms=200)     # 후반부 커짐 → 앞부분만
    make_oneshot('gameover', end_s=26, fade_s=3)
    make_oneshot('fanfare', end_s=7, fade_s=1.5, lufs=-14)
