# Kết quả hoàn thiện dữ liệu ngày 26-10-2026

Đã hoàn thiện bản làm việc cục bộ tại commit nền `c9336d6ca1cc17fde1f7d9e6eee728847f87ffa5`. Mọi cấp đã mở, kho hiện hành có đủ nghĩa Việt và audio nam/nữ. Các điều kiện kỹ thuật đã được kiểm chứng; chưa có lần triển khai production hoặc chứng nhận ngôn ngữ của giáo viên/người nghe bản ngữ.

## Dữ liệu và trải nghiệm

| Hạng mục | Kết quả |
|---|---:|
| Mục từ HSK 3.0 năm 2021 | 10.969 |
| Nghĩa Việt ngắn | 10.969 / 10.969 |
| Nghĩa trống được điền | 36 |
| Nghĩa ngắn có sẵn được sửa | 141 |
| Mục có giải thích dài | 3.064 |
| Cách đọc đánh số được sửa | 50 |
| Pinyin có dấu thay đổi | 62 |
| Chữ phồn thể được sửa theo nghĩa | 4 |
| Audio được liên kết và giải mã | 21.938 / 21.938 |
| Audio mới từ Kokoro / audio cũ đang dùng | 17.630 / 4.308 |
| Dung lượng audio đang liên kết | 164,680,560 byte, khoảng 157.1 MiB |

HSK 1–6 và nhóm HSK 7–9 chọn được ngay. Danh sách hiển thị 100 từ mỗi trang, tìm kiếm vẫn xét toàn bộ bộ lọc. Tải audio có số file thành công/thất bại, giới hạn bốn yêu cầu đồng thời và tiếp tục khi thử lại. Các file Microsoft cũ còn được giữ để những bản ứng dụng trước đó vẫn truy cập được.

ID lịch sử, thẻ đảo `id~r`, ghi chú, sao và lịch ôn được giữ. FSRS và nguyên tắc chỉ Ôn theo lịch cập nhật lịch ôn không thay đổi. Đuôi `r5` được ghép vào âm trước trong hiển thị/chấm nói; điểm hiện chưa xác nhận riêng chất lượng uốn lưỡi. Đã sửa lỗi bỏ qua lần chạm đầu và mặt sau thẻ hiện phản chiếu trên WebKit.

## Cách bổ sung dữ liệu lâu dài

Bản hiệu chỉnh theo ID là nơi sửa nghĩa, cách đọc và chữ phồn thể. Audio có đường dẫn tường minh, checksum và cấu hình sinh; đổi thứ tự mảng không làm phát nhầm từ. Dữ liệu lỗi bị chặn trước khi ghi. Tệp tạm và manifest hỗ trợ tiếp tục sau gián đoạn, kể cả clone lại không có cache cục bộ. Lượt chạy lại thực tế bỏ qua đủ 17.630 file khớp checksum và không sinh thêm file nào.

`data/content-release.json` đóng băng nguồn, công cụ và dữ liệu bằng SHA-256; `audio-assets.jsonl` ghi từng cặp ID/giọng. Kiểm tra toàn bộ MP3, nguồn và mã băm hoàn tất. 114 file thử không còn được tham chiếu đã được chuyển vào `.cache/quarantine/`, giữ ngoài bản phát hành. Xuống dòng LF được cố định cho các tệp có checksum và đã kiểm tra qua bộ lọc Git.

Service worker chỉ cài phiên bản mới khi tải đủ shell và bảy tệp cấp độ. Kiểm thử xác nhận cài đặt lỗi giữ bản cũ, cập nhật thành công thay dữ liệu cũ, giữ tiến độ và cache không thuộc ứng dụng. Không có backend hoặc framework mới được thêm chỉ để quản lý kho tĩnh.

Hướng dẫn thao tác: [CONTENT-PIPELINE](CONTENT-PIPELINE.md). Nguồn và giấy phép: [SOURCES](../data/SOURCES.md). Bảng đủ 10.969 hàng để duyệt nghĩa/nghe: [content-review TSV](audits/content-review-2026-10-26.tsv). Tên người duyệt và ngày duyệt vẫn để trống.

## Kiểm chứng và nghiên cứu

- 62 kiểm thử JavaScript, 13 kiểm thử hợp đồng dữ liệu, kiểm tra tái sinh core: đạt.
- 40 kiểm tra E2E; axe không phát hiện lỗi ở 10 màn hình trên mỗi trình duyệt Chromium/WebKit.
- Mô hình phát âm trong ứng dụng khớp ba fixture trên mỗi trình duyệt. Đây là kiểm tra tương đương runtime, không phải chứng nhận thuật toán chấm nói.
- Chromium xác nhận phát/giải mã hai giọng, tải lỗi/thử lại và tải lại offline. WebKit trên Windows xác nhận giao diện, tải file và cache; môi trường này không xác nhận giải mã MP3 hoặc tải lại khi mất mạng. Chưa thử iPhone vật lý.
- Audio: 21.938 checksum và 21.938 file giải mã đạt. 50 file được chọn ở vòng sửa cuối khớp byte với file đã chạy chẩn đoán.
- SenseVoice sau sửa khớp chuỗi âm tiết chưa xét thanh ở 301/308 file nhóm rủi ro và 280/280 file mẫu phân tầng. Các mẫu đã được dùng để sửa dữ liệu nên đây là kiểm tra hồi quy, **không phải đánh giá độc lập hay tỷ lệ phát âm đúng của cả kho**. Whisper đã đối chiếu các bất đồng; vẫn cần nghe lại một số âm ngắn, đuôi r và cặp s/sh. Xem [lựa chọn audio và mục ưu tiên](audits/audio-repair-selection-2026-10-26.json).

Đã nghiên cứu Data Cards/kiểm tra dữ liệu, đánh giá dịch bằng MQM, chẩn đoán TTS qua ASR, Qwen3-TTS, CosyVoice và Kokoro đến ngày yêu cầu. Chọn công cụ theo khả năng kiểm soát và kiểm chứng trên dự án; không tự nhận SOTA từ tên mô hình. Pstack được áp dụng qua nguyên tắc mô hình hóa dữ liệu, công cụ tái dùng, thao tác chạy lại an toàn và bằng chứng kiểm thử; tự thực hiện toàn bộ theo yêu cầu không dùng subagent. [Nghiên cứu và nguồn](RESEARCH-DATA-2026-10-26.md), [thiết kế/pstack](DATA-DELIVERY-2026-10-26.md), [biên bản kiểm tra](audits/content-validation-2026-10-26.json).

## Phần chưa được chứng nhận hoặc mở rộng

Kho này là danh sách HSK 3.0 **năm 2021**, 7–9 chung một nhóm. Đề cương thi 2025/2026 là phiên bản khác; 1.200 headword thiếu và 4.103 ứng viên đổi cấp từ audit trước chưa được nhập/gán lại. Không tuyên bố kho đã phủ đề cương mới.

Đủ nghĩa ngắn không đồng nghĩa đủ mọi nghĩa/ngữ dụng của từng từ. Nghĩa bổ sung có hỗ trợ AI; toàn bộ kho chưa được giáo viên song ngữ duyệt. CVDICT gốc trả 404 ở lần tải mới, nên dùng dữ liệu kế thừa và công khai giới hạn tái tạo. Audio tổng hợp chưa được nghe duyệt toàn bộ; không dùng kết quả máy để tự điền trạng thái đã được người duyệt chấp thuận.

Ngoài phạm vi nghĩa ngắn/audio: chưa có câu ví dụ; từ loại đạt 10.707 mục, Hán Việt đầy đủ 9.225 mục và các cách đọc tham khảo vẫn có nhãn. Dữ liệu nét/thông tin còn thiếu ba chữ `枴`, `獃`, `薙`. Hồ sơ chuẩn bị đã chỉ rõ các phần này để không nhầm độ phủ trường với chất lượng sư phạm hoàn chỉnh.

Chưa commit, push hoặc deploy. GitHub Actions đã được cấu hình, chưa có kết quả chạy từ GitHub.
