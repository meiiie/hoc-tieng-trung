# Quy trình dữ liệu học

Kho có 12.387 thẻ riêng, phục vụ hai danh mục tùy chọn: 10.969 thẻ theo danh sách 2021 và 10.960 thẻ ánh xạ đủ 11.000 dòng đề cương 2025/2026. Mọi cấp đều mở; HSK 7–9 là một nhóm chung của nguồn. Không tự đổi danh mục hoặc tiến độ của người dùng.

## Trách nhiệm của từng lớp

- `data/hsk*.json`: dữ liệu phục vụ ứng dụng, không chứa trạng thái người học.
- `data/hsk-extra.json`: 1.418 thẻ cần bổ sung cho đề cương mới; không thay đổi thứ tự bảy file cũ.
- `data/curricula.json`: phiên bản danh mục, membership ID→cấp và số dòng nguồn; danh mục không sở hữu trạng thái ôn.
- `data/sources/legacy-index.json`: ID đã phát hành và vị trí audio cũ. Không đổi ID khi sửa pinyin hoặc chuyển cấp; các khóa `id~r`, ghi chú, sao và lịch ôn đều phụ thuộc ID.
- `data/sources/corrections.json`: hiệu chỉnh theo ID, nghĩa ngắn `v`, giải thích `vd`, cách đọc `n`, chữ phồn thể `t`, từ loại `pos`, căn cứ `basis` và trạng thái duyệt. `p` luôn được suy ra từ `n`.
- `tools/content.py`: quy tắc nhập và kiểm tra chung. JSON lỗi không được coi là dữ liệu hợp lệ chỉ vì đọc được.
- Trường `a`: liên kết audio tường minh, `{voice}` thay bằng `f` hoặc `m`. Audio mới có địa chỉ băm từ ID, cách đọc và cấu hình sinh. Thứ tự mảng không quyết định audio.
- `data/sources/audio-assets.jsonl`: một bản ghi cho mỗi cặp ID/giọng, nguồn, checksum và kiểm tra đã làm.
- `data/sources/audio-overrides.json`: ngoại lệ giọng/câu dẫn theo ID, kèm lý do. Chỉ mục bị sửa đổi địa chỉ audio; giọng bổ sung phải có checksum trong `audio-model-files.json`.
- `data/content-release.json`: tập checksum của một bản dữ liệu hoàn chỉnh. Chỉ tạo sau khi mọi audio cần thiết có thật.
- `lang-zh.js`: chuyển dữ liệu sang giao diện; `core/app-core.js` giữ lịch ôn và các chế độ học. Luyện tập không cập nhật FSRS.

## Hiệu chỉnh nghĩa và cách đọc

Thêm hiệu chỉnh có căn cứ vào `corrections.json`, giữ ID nguyên trạng, rồi chạy:

```powershell
python -X utf8 tools/enrich-data.py
python -X utf8 tools/enrich-data.py --write
npm test
python -X utf8 tests/content_test.py
```

Lần đầu chỉ kiểm tra. Lần ghi kiểm tra cả bộ trước, rồi thay từng tệp bằng tệp tạm. Việc ghi nhiều JSON trên ổ đĩa không phải giao dịch nguyên tử toàn bộ; không phát hành một thư mục đang được xây dựng. Release gate và cài đặt service worker đầy đủ là ranh giới phát hành.

Chạy lại không nhân đôi mục từ. Đổi cách đọc sẽ sinh địa chỉ audio mới. Không tự động đổi ID để làm ID trông giống pinyin mới. Không tự động nhận kết quả dịch máy hoặc ASR là bản duyệt của giáo viên.

Các ID bổ sung của bản này cũng được giữ ở `legacy-index.json.supplementalIds`; không chỉ ID của bảy file cũ được bảo vệ. Với thẻ bổ sung, sửa nghĩa trong TSV và thông tin từ trong nguồn lexical/editorial có liên quan, giữ ID hiện có, rồi build lại. `prepare-curricula.py` là bước nhập/đối chiếu nguồn, không phải lệnh sửa pinyin thường ngày; nếu nó đề xuất ID mới cho một từ đã phát hành, phải hòa giải với ID cũ trước khi build. Không xóa ID khỏi registry chỉ để làm kiểm tra qua.

`tools/build-data.py` là bộ nhập lịch sử, phụ thuộc các nguồn ngoài được mô tả trong file. Nó kiểm tra cả kho trước khi ghi các JSON từ vựng và gọi bước hiệu chỉnh ở cuối, nhưng chưa phải bản tái tạo độc lập của toàn bộ nguồn CVDICT lịch sử. Để cập nhật bản đang phát hành, dùng `enrich-data.py` và các nguồn đã lưu. Bộ nhập không cắt ngang nghĩa ở giới hạn ký tự; nghĩa quá dài cần bản ngắn đã biên tập. Giải thích dài cũng không bị cắt ở ký tự thứ 140.

## Sinh audio

Tạo môi trường Python 3.12 riêng; không cài phụ thuộc TTS vào runtime của ứng dụng:

```powershell
py -3.12 -m venv .cache/tts-venv
.cache/tts-venv/Scripts/python -m pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
.cache/tts-venv/Scripts/python -m pip install -r tools/tts-requirements.txt
.cache/tts-venv/Scripts/python tools/download-audio-model.py
.cache/tts-venv/Scripts/python tools/generate-audio.py --device cpu
python -X utf8 tools/verify-content.py --write --decode
```

Máy CUDA 12.4 có thể dùng bản torch tương ứng và `--device cuda`. Model, cấu hình, giọng và revision đều được chốt bằng checksum. Không dùng giọng nhân bản của một cá nhân được chỉ định.

Bộ sinh dùng pinyin của mục từ, áp dụng quy tắc biến điệu cơ bản, ghép `r5` vào âm trước. Nó tạo một câu dẫn ngắn, lấy mốc thời lượng âm vị của model rồi tìm khoảng nghỉ gần mốc để tách từ. Khoảng nghỉ không đủ yên thì dừng để kiểm tra, không cắt tùy ý. Đây là phương pháp đã thử trên mẫu của dự án, không phải chứng nhận âm học cho mọi file.

Mỗi file được kiểm tra tín hiệu, mã hóa MP3 rồi giải mã lại trước khi thay thế nguyên tử. Manifest đã phát hành `data/sources/audio-assets.jsonl` và journal `.cache/audio-receipts-*.jsonl` ghi checksum từng kết quả; chạy lại chỉ bỏ qua file khớp checksum. Sau khi clone lại hoặc mất `.cache`, manifest vẫn cung cấp trạng thái để tiếp tục; journal mới hơn được ưu tiên. Seed phụ thuộc đường dẫn từng tài nguyên, không phụ thuộc số file đã chạy trước đó. CPU/GPU và các thư viện có thể vẫn gây khác biệt bit; manifest đóng băng byte đã phát hành.

`--voice`, `--limit`, `--shard`, `--shards` hỗ trợ chạy một phần. Các shard đọc lại journal đã có để tiếp tục sau khi thay số shard. Không chạy hai tiến trình cùng một shard, hoặc các tiến trình có số `--shards` khác nhau: công việc có thể trùng và cùng ghi journal. Không cần phân tán hoặc hàng đợi máy chủ cho bộ dữ liệu tĩnh này.

`--words <JSON>` chỉ dùng khi chuẩn bị dữ liệu: nhận mảng thẻ đã qua kiểm tra, từ chối ID trùng hoặc địa chỉ audio cũ. Tác vụ cuối phải chạy với toàn bộ catalog. Âm mũi độc lập `嗯 / ng4` được biểu diễn bằng token model riêng và cần ưu tiên nghe duyệt; không tự đổi pinyin đề cương thành một từ khác để làm ASR khớp.

## Tái tạo danh mục 2025/2026

```powershell
python -X utf8 tools/build-curricula.py --check
# Sau một thay đổi nguồn/biên tập đã đối chiếu:
python -X utf8 tools/build-curricula.py --write
python -X utf8 tools/enrich-data.py --write
python -X utf8 tests/content_test.py
```

Bộ build chỉ dùng dữ liệu đã lưu trong repo, không gọi dịch vụ dịch hay mạng. Nó kiểm tra đủ dòng, tổng mỗi nhóm, chữ và cách đọc của mỗi liên kết; chỉ cho phép cùng cách đọc hoặc biến điệu 一/不 được định nghĩa tường minh. Đồng bộ một ID sai đa âm với `cardReading` cũng bị từ chối khi không phù hợp pinyin dòng nguồn. Cả source SHA lẫn file phát hành được kiểm tra. Không dùng số dòng đề cương làm ID tiến độ.

`prepare-curricula.py <PDF>` dùng khi đánh giá lại một nguồn: cần PyMuPDF, pypinyin, PDF đúng checksum và snapshot CC-CEDICT đã chốt ở `.cache/research/cedict.u8`. Nó giữ pinyin in trong PDF và áp dụng các đối chiếu biên tập riêng; không tự publish nghĩa. `cti-editorial.json` không phải errata chính thức của CTI. Trước khi dùng phiên bản nguồn khác cần xem lại hằng số, số dòng và kiểm thử, không thay SHA để bỏ qua kiểm soát.

`extend-characters.py` dùng snapshot Make Me a Hanzi đã chốt và gói Hanzi Writer Data có integrity; mặc định dry run. Lượt kiểm tra phát hành xác nhận metadata và hình dạng dữ liệu nét cho toàn bộ 4.304 chữ đang dùng, cùng provenance của 195 chữ bổ sung. Mọi file nét đang dùng có checksum trong manifest phát hành.

## Điều kiện kiểm tra và phát hành

```powershell
python -X utf8 tools/verify-content.py --decode
python -X utf8 tests/generator_parity.py
node tools/audit-hsk.cjs
python -X utf8 tests/cache_upgrade.py
python tools/serve.py
# Trong terminal khác:
python -X utf8 tests/e2e.py http://127.0.0.1:8931/ all
python -X utf8 tests/content_browser.py http://127.0.0.1:8931/
python -X utf8 tests/curricula_browser.py http://127.0.0.1:8931/
python -X utf8 tests/model_parity.py http://127.0.0.1:8931/ all
```

Thay tên cache `V` trong `sw.js` khi phát hành shell hoặc JSON mới. Service worker chỉ cài bản mới sau khi tải đủ shell, bảy file cũ, file bổ sung và cả membership; nếu thiếu một tệp, bản đang chạy tiếp tục hoạt động. Kiểm thử nâng cấp cố ý làm lỗi tải `curricula.json`. Người dùng chọn tải lại để kích hoạt. Không xóa cache audio/model, cache của ứng dụng khác hoặc localStorage.

Audio được tải theo cấp/bộ lọc và giọng đang chọn, bốn yêu cầu cùng lúc. Kết quả hiển thị số file thực sự lưu, có lỗi và thử lại. Không bắt tải toàn bộ audio khi mở app. Danh sách hiển thị 100 từ/trang nhưng tìm kiếm trên toàn bộ bộ lọc.

CI trong `.github/workflows/verify.yml` kiểm tra cùng các ranh giới. CI chưa chạy trên GitHub cho đến khi thay đổi được đẩy lên. Kiểm thử WebKit Windows không thay thế thử trên iPhone thật.

Kiểm tra generator tải đúng `app.js` tại commit tiếng Anh đã chốt và kiểm SHA-256 trước khi sinh. Nếu chạy offline, truyền đường dẫn bản nguồn đã lưu vào `tests/generator_parity.py`.

## Dữ liệu và quyền sử dụng

- Danh sách chữ và cấp: complete-hsk-vocabulary, MIT; revision của bộ gốc trong audit và legacy index.
- Nghĩa CVDICT có sẵn: giữ xuất xứ CC BY-SA 4.0 từ bản cũ. Upstream không tải lại được tại lần khảo sát này.
- Hiệu chỉnh 26-10-2026: biên soạn có hỗ trợ AI, đối chiếu CC-CEDICT, CC BY-SA 4.0; chưa được giáo viên song ngữ duyệt. Bản trích dẫn và SHA của nguồn nằm trong `cedict-reference-2026-10-26.json`.
- Audio Microsoft cũ: giữ các tệp của repo nền, không suy diễn giấy phép MIT của mã nguồn thành giấy phép của dịch vụ tạo tiếng nói.
- Audio Kokoro mới: từ mô hình mở Apache-2.0 tại revision đã ghi; trọng số không được đưa vào ứng dụng hoặc repo. Model card và giấy phép được dẫn trong hồ sơ nguồn.
- Không nhập audio HearMandarin: giấy phép dữ liệu từ của họ không bao gồm audio.

Kiểm tra cấu trúc, checksum, tín hiệu và ASR chỉ là các lớp kiểm soát lỗi. Từ đa nghĩa, ngữ dụng, thanh nhẹ, âm uốn lưỡi và phát âm chuẩn vẫn cần biên tập ngôn ngữ và nghe duyệt. Không gọi 100% trường có giá trị là 100% nội dung được chứng nhận đúng.

`python tools/export-content-review.py` xuất toàn bộ kho ra TSV để duyệt nghĩa và nghe hai giọng. Người duyệt và ngày duyệt để trống cho đến khi có việc duyệt thật. Nghiên cứu và các thử nghiệm bị bác bỏ được lưu trong `RESEARCH-DATA-2026-10-26.md`.

## Chẩn đoán audio và nghe duyệt

`tools/sample-audio.py --output <sample.json>` chọn 20 mục ở mỗi nhóm cấp, hai giọng, theo seed cố định. Không dùng `--available-only` cho mẫu của bản phát hành. `tools/evaluate-audio.py` nhận JSON đó và chạy SenseVoice không có prompt từ đích; `tools/evaluate-audio-whisper.py` là lượt đối chiếu riêng. Các chương trình trả chuỗi máy nghe được và SHA-256 từng MP3, không tự sửa mục từ hoặc tự duyệt nội dung.

Môi trường đã dùng: SenseVoice qua `sherpa-onnx==1.12.35` trong môi trường TTS; Whisper Small qua `faster-whisper==1.2.1`, `ctranslate2==4.8.2` trong Python 3.13.7. Tải SenseVoice INT8 theo [tài liệu sherpa-onnx](https://k2-fsa.github.io/sherpa/onnx/sense-voice/pretrained.html); checksum model và token nằm trong mỗi báo cáo. Whisper cần có sẵn model trong `.cache/whisper` vì công cụ tắt tải ngầm. Trọng số chẩn đoán không được đóng gói vào PWA.

Một mẫu đã được dùng để chọn giọng thay thế là dữ liệu phát triển. Chạy lại cùng mẫu sau sửa chỉ đo hồi quy; không gọi đó là đánh giá độc lập. Báo cáo `audio-repair-selection-2026-10-26.json` giữ cấu hình được chọn, checksum khớp file phát hành và các bất đồng ưu tiên nghe lại. Bảng `content-review-2026-10-26.tsv` vẫn để trống người duyệt/ngày duyệt.

Các file có checksum được lưu với xuống dòng LF và khai báo trong `.gitattributes`, để checkout trên Windows/Linux không làm sai manifest. Giữ file cũ còn được bản ứng dụng đang chạy tham chiếu khi triển khai; chỉ cách ly những file thử chưa từng phát hành. Không dọn cache audio của người học để ép cập nhật.
