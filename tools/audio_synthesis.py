"""Synthesize an isolated word after a carrier, cutting only inside its pause."""
import hashlib
import numpy as np
import torch
from audio_phonemes import phonemes


def synthesize(model, voice, word, speed, seed_key, carrier='read'):
    torch.manual_seed(int(hashlib.sha256(seed_key.encode()).hexdigest()[:8], 16))
    reading = phonemes(word)
    carriers = {'read': {'s': '请读', 'n': 'qing3 du2'}, 'listen': {'s': '请听', 'n': 'qing3 ting1'}}
    prefix = phonemes(carriers[carrier]) + '. '
    text = prefix + reading + '. ' + prefix
    if set(text) - model.vocab.keys():
        raise ValueError(f"Unsupported model input: {word['id']}")
    result = model(text, voice[len(text) - 1], speed=speed, return_output=True)
    audio, durations = result.audio.numpy(), result.pred_dur.numpy()
    # One duration frame is 600 samples in this pinned 24 kHz model.
    if len(audio) != int(durations.sum()) * 600:
        raise ValueError('Model duration alignment changed')
    period = len(prefix) - 2
    center = int((durations[:period + 1].sum() + durations[period + 1] / 2) * 600)
    window = 240
    candidates = range(max(0, center - 2400), min(len(audio) - window, center + 2400), 120)
    start = min(candidates, key=lambda i: np.mean(audio[i:i + window] ** 2))
    pause_rms = float(np.sqrt(np.mean(audio[start:start + window] ** 2)))
    end_period = len(prefix) + len(reading)
    end_center = int((durations[:end_period + 1].sum() + durations[end_period + 1] / 2) * 600)
    end_candidates = range(max(start + window, end_center - 2400), min(len(audio) - window, end_center + 2400), 120)
    end = min(end_candidates, key=lambda i: np.mean(audio[i:i + window] ** 2))
    end_pause_rms = float(np.sqrt(np.mean(audio[end:end + window] ** 2)))
    if max(pause_rms, end_pause_rms) > 0.01:
        raise ValueError(f"No carrier pause below -40 dBFS for {word['id']}: {pause_rms}, {end_pause_rms}")
    segment = audio[start:end].copy()
    fade = min(120, len(segment) // 2)
    segment[:fade] *= np.linspace(0, 1, fade)
    segment[-fade:] *= np.linspace(1, 0, fade)
    return segment, {'phonemes': reading, 'carrier': carrier, 'carrierCutSeconds': round(start / 24000, 4),
                             'carrierEndSeconds': round(end / 24000, 4),
                             'carrierPauseRms': round(pause_rms, 7), 'endPauseRms': round(end_pause_rms, 7)}
