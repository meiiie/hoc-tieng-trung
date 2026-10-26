# Bàn giao dữ liệu và trải nghiệm học tự chọn

Mốc nghiên cứu: **26-10-2026**. Hoàn tất kiểm tra cục bộ sau nửa đêm 27-10-2026 (Asia/Saigon). Thay đổi đang ở workspace `E:\Sach\Sua\NekoTiengTrung`; chưa commit, push hay triển khai website. Các báo cáo đợt 10.969 từ trước đó được giữ làm lịch sử, không phải số liệu cuối của bản này.

## Kết quả dữ liệu

| Phạm vi | Kết quả cuối |
|---|---:|
| Danh sách HSK 2021, giữ nguyên ID và thứ tự bảy file lịch sử | 10.969 thẻ |
| Dòng trong bảng từ chính thức 2025/2026 | 11.000/11.000 |
| Thẻ riêng của danh mục 2025/2026 | 10.960 |
| Thẻ mới cần bổ sung vào kho | 1.418 |
| Tổng thẻ riêng của hai danh mục | **12.387** |
| Thẻ có nghĩa tiếng Việt | **12.387/12.387** |
| MP3 từ, một giọng nữ và một giọng nam mỗi thẻ | **24.774/24.774** |
| Audio Kokoro / audio Microsoft kế thừa đang được dùng | 20.470 / 4.304 |
| Tổng byte của audio đang dùng | 184.026.144 |
| Chữ giản/phồn thể đang dùng có metadata và nét | **4.304/4.304** |
| Chữ mới bổ sung từ nguồn chốt phiên bản | 195 |
| Thẻ có từ loại | 12.120 |
| Thẻ có thông tin Hán Việt | 10.044 |
| Trong đó là âm ghép theo từng chữ, có nhãn tham khảo | 5.796 |
| Thẻ có câu ví dụ song ngữ riêng | **0** |

11.000 dòng không đồng nghĩa 11.000 thẻ: có dòng trùng và hai dòng cho cách đọc thay thế, tạo tổng cộng 11.002 liên kết tới 10.960 thẻ. Nhóm 7–9 được giữ chung theo nguồn; không tự suy đoán cấp 8/9 riêng. Nghĩa Việt có giá trị ở mọi thẻ là độ phủ trường dữ liệu, không phải tuyên bố đã bao quát mọi nghĩa, ngữ dụng và kết hợp từ.

Lượt rà cuối sửa “老公” về **lǎo gōng — chồng**, giữ ID lịch sử `老公|lao3gong1` và dùng chung thẻ giữa hai bộ. Vì vậy số thẻ bổ sung cuối là 1.418, thấp hơn con số 1.419 ở các nhật ký chẩn đoán trước khi hòa giải. Ghi chú về sắc thái sử dụng của “小姐” cũng được gắn đúng thẻ.

## Người học được tự chọn

- Mọi cấp đều mở ngay. Chọn danh sách 2021 hoặc đề cương 2025/2026 ở trang chủ; đổi danh mục giữ nguyên lịch ôn, ghi chú, sao và bằng chứng luyện tập.
- Có chế độ **Đọc đoạn tự chọn**: dán văn bản, tra từ trong đoạn, tìm riêng chữ/pinyin/nghĩa và xem nhiều cách đọc của một chữ. Văn bản nằm trong bộ nhớ trang, không tự gửi đi hay ghi vào hồ sơ.
- Công cụ ghép theo mục từ dài nhất; giao diện nói rõ có thể tách sai và cho tra riêng cụm từ. Không trình bày nó như bộ phân tích ngữ nghĩa hoàn hảo.
- Đọc, nghe, viết hoặc gắn sao không tự cập nhật lịch FSRS. Chỉ chế độ Ôn theo lịch thay đổi lịch.
- Các mục tiêu từ mới là giới hạn có thể đổi, bỏ cam kết số phút và nhãn đánh giá sự chăm chỉ. Chế độ không giới hạn không hiển thị cả kho như nhiệm vụ của hôm nay.
- Hướng dẫn học phân biệt nhớ từ với dùng từ trong ngữ cảnh. Phần phát âm bỏ các phép đồng nhất p với “ph” hoặc thanh 2/4 với dấu sắc/nặng tiếng Việt; phản hồi máy được gọi là tham khảo.

## Nguồn và kiến trúc

[Bản nghiên cứu giáo dục](EDUCATION-RESEARCH-2026-10-26.md) ghi từng nguồn, mức đã đọc, kết quả và giới hạn: Đại học Bắc Kinh/Boya, BLCUP, ULIS–VNU, nghiên cứu người Việt học tiếng Hán, nghiên cứu spacing/retrieval đến năm 2026, và các dự án Lute, LinguaCafe, FSRS, Hanzi Writer, Anki-xiehanzi. Không sao chép giáo trình thương mại hoặc coi lời giới thiệu nhà xuất bản là thử nghiệm hiệu quả.

Giữ PWA và FSRS hiện có. `curricula.json` tách membership khỏi ID thẻ; `hsk-extra.json` chứa phần bổ sung. Pipeline kiểm tra source SHA, đủ dòng, tổng mỗi nhóm, chữ và cách đọc trước khi build. Chỉ chấp nhận cùng cách đọc hoặc quy tắc 一/不 được nêu tường minh. Các hiệu chỉnh pinyin trong PDF được giữ ở lớp biên tập riêng, không sửa bản trích nguồn và không tự nhận là errata của CTI.

Registry bảo vệ cả ID lịch sử lẫn ID bổ sung của bản này. Mỗi audio có nguồn, cấu hình giọng, địa chỉ theo nội dung và SHA-256. Manifest bảo vệ **4.342 file nội dung/công cụ/nguồn**, ngoài checksum riêng của 24.774 MP3. Service worker chỉ cài bản mới khi tải đủ shell, dữ liệu và membership; không xóa tiến độ hoặc cache của ứng dụng khác.

Đã áp dụng trực tiếp các nguyên tắc pstack: mô hình hóa đúng miền dữ liệu, xây công cụ tái sử dụng, chạy lại an toàn và kiểm chứng kết quả. Chi tiết và liên kết skill gốc trong [hồ sơ thiết kế](DATA-DELIVERY-2026-10-26.md). Không dùng subagent hoặc chuyển việc sang chat khác. Đây là tự kiểm tra trong cùng lượt làm việc, không phải review độc lập của chuyên gia.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| JavaScript: SRS, adapter, dữ liệu, thanh điệu, danh mục/đọc | 68 bài qua |
| Python: ID, nguồn, đa âm, tái tạo, audio mapping/journal | 19 bài qua |
| Bộ core được sinh từ nguồn tiếng Anh đã chốt SHA | Khớp output trong repo |
| E2E Chromium + WebKit | 40 kiểm tra qua |
| Chọn hai danh mục, mọi cấp, giữ tiến độ, tra đa âm, văn bản HTML vô hại | Qua ở cả hai trình duyệt |
| axe cho 10 màn hình cũ và 3 màn hình mới | Không có vi phạm được axe phát hiện ở cấu hình đã chạy |
| Nâng cấp SW bị thiếu membership, nâng cấp thành công, dữ liệu cũ, cache khác | Qua trên Chromium |
| Model phát âm trong browser so với fixture Python | Khớp 3 fixture ở mỗi trình duyệt |
| Hash và giải mã mọi MP3 đang dùng | 24.774/24.774 qua |
| Metadata/hình dạng dữ liệu nét và checksum | 4.304 chữ qua |
| Build lại hai danh mục từ nguồn đã lưu | Khớp dữ liệu phát hành |
| ID và thứ tự bảy file so với commit nền | Không thay đổi |
| Văn bản đọc 12.000 ký tự | Giữ đúng nội dung; riêng bước tách từ đo được 15 ms trong một lần chạy Chromium cục bộ, không phải benchmark thiết bị di động |

Đã xem ảnh giao diện điện thoại và sửa ô tra cứu, biểu tượng hướng dẫn, nhãn phát âm và dòng gợi ý ôn. WebKit Windows không hỗ trợ đầy đủ giải mã Web Audio/offline navigation trong môi trường này; các cờ tương ứng trong kiểm tra nội dung được ghi là không có khả năng kiểm thử. Không coi đó là chứng nhận chạy tốt trên iPhone thật. Workflow CI đã được cập nhật nhưng chưa chạy trên GitHub vì chưa push.

## Chẩn đoán audio và giới hạn

SenseVoice kiểm tra 2.844 file trong nhóm bổ sung và các thẻ cũ được sửa cách đọc. 172 bất đồng ban đầu được đối chiếu thêm bằng Whisper. Đã thử 1.052 bản ứng viên từ các giọng/câu dẫn có checksum, chọn lại 61 cặp thẻ và kiểm tra 122 file thay thế khớp byte với bản ứng viên được chẩn đoán. Whisper cũng được chạy lại trên 122 file này. Hai audio “老公” sau hòa giải được kiểm tra riêng và đều được SenseVoice nhận đúng chữ.

Trong bản chẩn đoán tổng hợp cuối, 2.743/2.844 file có chuỗi âm tiết không xét thanh điệu khớp theo phép chuẩn hóa tự động. Các trường hợp còn lại bao gồm lỗi đọc đa âm của thư viện pinyin, chữ đồng âm, ASR đoán sai hoặc vấn đề audio chưa loại trừ. **Đây không phải tỷ lệ phát âm đúng.** Mẫu đã dùng chọn giọng là dữ liệu phát triển, không phải tập kiểm định độc lập. Tất cả kết quả đều gắn SHA của file thực tế.

Danh sách ưu tiên nghe lại còn 19 mục từ theo phép đối chiếu kết hợp; gồm âm tiết đơn và một số cụm từ. Đặc biệt `嗯 / ng4` có phản hồi ASR không ổn định; thẻ có ghi chú cần người bản ngữ kiểm chứng. Không đánh dấu mục nào đã được người bản ngữ nghe duyệt hay giáo viên song ngữ duyệt khi chưa có việc đó.

- [Manifest phát hành](../data/content-release.json)
- [Bằng chứng kiểm tra cuối, gồm giới hạn WebKit](audits/education-verification-2026-10-26.json)
- [Kiểm kê cuối](audits/education-catalog-2026-10-26.json)
- [TSV toàn bộ thẻ để duyệt nghĩa và nghe hai giọng](audits/education-content-review-2026-10-26.tsv)
- [SenseVoice trên byte phát hành cuối](audits/curriculum-audio-final-2026-10-26.json)
- [Quyết định chọn audio và nhóm ưu tiên nghe lại](audits/curriculum-audio-selection-2026-10-26.json)
- [Whisper trên file thay thế](audits/curriculum-audio-selected-whisper-2026-10-26.json)
- [Quy trình cập nhật và tái kiểm tra](CONTENT-PIPELINE.md)

Phần triển khai và độ phủ danh mục/nghĩa ngắn/audio đã hoàn tất ở repo cục bộ. Những phần chưa hoàn tất về mặt thẩm định giáo dục là: duyệt độc lập toàn bộ nghĩa và cách dùng, nghe duyệt bản ngữ, câu ví dụ song ngữ phủ kho, thử trên iPhone thật và nghiên cứu hiệu quả với người học. Một phần metadata giải thích chữ vẫn bằng tiếng Anh. Không gọi bản này là từ điển Trung–Việt toàn diện hoặc sản phẩm đã được chứng nhận sẵn sàng production về ngôn ngữ.
