# Hoàn thiện dữ liệu học ngày 26-10-2026

## Kết quả cần chứng minh

- Mọi cấp HSK 1–9 chọn được ngay với tài khoản mới và tiến độ cũ.
- Mọi mục từ hiện hành có nghĩa Việt, pinyin tách âm tiết hợp lệ và audio nam/nữ có tệp thực.
- Toàn bộ ID đã phát hành giữ nguyên. Audio không đổi từ khi sắp xếp dữ liệu.
- Nhập liệu chạy lại không tạo bản sao, không ghi đè dữ liệu sai nguồn và có kiểm tra trước phát hành.
- Trình duyệt cập nhật dữ liệu, dùng được offline sau tải và không thay lịch ôn khi luyện tập.

## Phạm vi và giới hạn

Kho đang dùng danh sách HSK 3.0 năm 2021, 10.969 mục. Đề cương thi 2025 có hiệu lực năm 2026 là một phiên bản chương trình khác. Không gán nhãn toàn bộ kho cũ là đề cương mới. Danh sách 1.200 headword thiếu và 4.103 hàng có thể đổi cấp trong audit là đầu vào đối chiếu, chưa phải quyết định chuyển nghĩa hoặc chuyển tiến độ.

Nghĩa Việt bổ sung được biên soạn và đối chiếu bằng công cụ, chưa được giáo viên song ngữ duyệt. Audio tổng hợp phải ghi đúng nguồn; số tệp đầy đủ và kiểm tra tín hiệu không chứng nhận phát âm hoàn hảo. Không dùng kết quả benchmark của nhà cung cấp để tự nhận chất lượng SOTA trên các từ của dự án.

## Các bước thực hiện

1. Đọc nguyên tắc pstack, đóng băng ID và liên kết audio cũ; lập kiểm tra bảo toàn dữ liệu.
2. Thử audio trên từ đơn, chữ đa âm, thanh nhẹ, biến điệu, âm uốn lưỡi; chọn nguồn phù hợp máy và khả năng tái tạo.
3. Bổ sung nghĩa Việt thiếu và sửa pinyin bằng bản hiệu chỉnh theo ID, có nguồn và trạng thái duyệt.
4. Sinh audio có phiên bản, kiểm tra tín hiệu, ghi tệp tạm rồi thay thế nguyên tử; tiếp tục được sau gián đoạn.
5. Bỏ điều kiện mở khóa, cập nhật bộ nhớ đệm và tải audio offline theo bộ lọc; giữ thuật toán FSRS.
6. Chạy kiểm tra dữ liệu, tiến độ cũ, phát audio, offline và Chromium/WebKit; lưu kết quả và giới hạn còn lại.

## Thiết kế đã chọn

Hai cách được cân nhắc: sửa trực tiếp từng JSON/MP3 bằng vị trí mảng; hoặc bản hiệu chỉnh theo ID cùng liên kết tài nguyên tường minh. Chọn cách thứ hai vì giữ được lịch ôn, tái chạy được và kiểm tra được bằng máy. Không cần backend hay chuyển framework để xử lý kho từ tĩnh này.

`data/sources/legacy-index.json` chụp ID, cấp và chỉ số audio đã phát hành. `data/sources/corrections.json` sở hữu hiệu chỉnh ngôn ngữ. Trường `a` trong mục từ là đường dẫn audio có chỗ `{voice}` thay bằng `f` hoặc `m`; không tính lại từ vị trí mảng lúc chạy. Dữ liệu nguồn và manifest giữ checksum, giấy phép, phiên bản công cụ, phạm vi và giới hạn kiểm tra.

## Pstack và nghiên cứu áp dụng

Đọc pstack từ `cursor/plugins` tại commit `99b609a72323b70204eab407c622f436e858e112`, áp dụng trực tiếp trong chat. Không cài plugin vào Cursor và không dùng subagent theo yêu cầu người dùng.

- [Model the Domain](https://github.com/cursor/plugins/blob/99b609a72323b70204eab407c622f436e858e112/pstack/skills/principle-model-the-domain/SKILL.md): dùng ID và bản ghi tài nguyên thay cho điều kiện theo cấp.
- [Build the Lever](https://github.com/cursor/plugins/blob/99b609a72323b70204eab407c622f436e858e112/pstack/skills/principle-build-the-lever/SKILL.md): công cụ nhập, sinh và kiểm tra được giữ trong repo.
- [Make Operations Idempotent](https://github.com/cursor/plugins/blob/99b609a72323b70204eab407c622f436e858e112/pstack/skills/principle-make-operations-idempotent/SKILL.md): checksum, tệp tạm và tiếp tục theo trạng thái thực.
- [Prove It Works](https://github.com/cursor/plugins/blob/99b609a72323b70204eab407c622f436e858e112/pstack/skills/principle-prove-it-works/SKILL.md): kiểm tra trên dữ liệu và trình duyệt thật.
- [TensorFlow Data Validation](https://www.tensorflow.org/tfx/guide/tfdv) và [Data Cards](https://arxiv.org/abs/2204.01075): kiểm tra ở biên nhập, phát hiện thiếu/sai/lệch và công khai xuất xứ. Áp dụng nguyên tắc bằng công cụ nhỏ, không thêm TensorFlow vào ứng dụng.
- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS), phát hành 22-01-2026, và [CosyVoice 3](https://github.com/QwenAudio/CosyVoice), bản 2512: có tiếng Trung, kiểm soát giọng và hệ sinh thái triển khai; chưa đo trên máy này. CosyVoice có điều khiển phát âm bằng pinyin.
- [Kokoro v1.1-zh](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh): 82M tham số, Apache-2.0, hỗ trợ tiếng Trung và đầu vào âm vị; được thử cho tác vụ sinh hàng loạt trên CPU. Kích thước nhỏ là tiêu chí vận hành, không phải bằng chứng hơn các mô hình trên về chất lượng.
- [HearMandarin](https://hearmandarin.com/datasets/): dữ liệu từ CC BY 4.0, audio không nằm trong giấy phép dataset. Chỉ dùng làm nguồn đối chiếu đề cương.
- [audio-cmn](https://github.com/hugolpz/audio-cmn): bản thu mở có ích nhưng không đủ kho hiện hành, cần đối chiếu cách đọc và điều kiện CC BY-SA theo bản thu.

Nhật ký quyết định ở `docs/audits/data-decisions-2026-10-26.tsv`. Các bước review nhiều mô hình trong pstack được thay bằng tự kiểm tra do chỉ thị không dùng subagent; không gọi đó là review độc lập.
