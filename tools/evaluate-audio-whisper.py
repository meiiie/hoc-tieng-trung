"""Second unprompted ASR diagnostic; short isolated words can cause hallucinations."""
import argparse
import os
from pathlib import Path
from content import ROOT, atomic_json, read_json, sha256


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--device', choices=['cpu', 'cuda'], default='cpu')
    parser.add_argument('--cuda-libs', type=Path, help='Windows CUDA/cuDNN DLL directory, if not on PATH')
    args = parser.parse_args()
    dll_handle = None
    if args.cuda_libs:
        os.environ['PATH'] = str(args.cuda_libs.resolve()) + os.pathsep + os.environ['PATH']
        if os.name == 'nt':
            dll_handle = os.add_dll_directory(str(args.cuda_libs.resolve()))
    import faster_whisper
    model = faster_whisper.WhisperModel('small', device=args.device,
        compute_type='float16' if args.device == 'cuda' else 'int8',
        download_root=str(ROOT / '.cache/whisper'), local_files_only=True)
    rows = read_json(args.inputs)
    for i, row in enumerate(rows):
        path = ROOT / row['path']
        segments, _ = model.transcribe(str(path), language='zh', beam_size=3,
            condition_on_previous_text=False, temperature=0)
        row.update({'heardWhisper':''.join(s.text for s in segments), 'audioSha256':sha256(path)})
        print(f'Checked {i + 1}/{len(rows)}', flush=True)
    atomic_json(args.output, {'engine':'Whisper small via faster-whisper',
        'engineVersion':faster_whisper.__version__, 'settings':{'device':args.device,
        'language':'zh','beamSize':3,'temperature':0,'conditionOnPreviousText':False,'expectedTextPrompt':False},
        'limitations':'Diagnostic only. ASR can hallucinate on isolated words and does not certify tone accuracy.',
        'rows':rows})
    if dll_handle:
        dll_handle.close()


if __name__ == '__main__':
    main()
