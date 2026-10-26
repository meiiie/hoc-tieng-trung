# UX học tập và luyện nói — thay đổi ngày 27/10/2026

Mốc nghiên cứu: hết ngày 26/10/2026 theo giờ Việt Nam. Thực hiện trực tiếp, không dùng subagent. Đây là thay đổi chạy tại bản sao dự án trên máy; chưa phát hành lên website công khai.

## Căn cứ thiết kế

Đối chiếu `hoc-tu-vung` tại commit [89eedfc](https://github.com/meiiie/hoc-tu-vung/tree/89eedfc66d9b43ce5cf9e876ba14967785de5102), đặc biệt [quy tắc learner UX](https://github.com/meiiie/hoc-tu-vung/blob/89eedfc66d9b43ce5cf9e876ba14967785de5102/docs/OXFORD_AND_LEARNER_UX.md), [layout](https://github.com/meiiie/hoc-tu-vung/blob/89eedfc66d9b43ce5cf9e876ba14967785de5102/docs/LAYOUT.md), và [kiểm chứng luyện nói](https://github.com/meiiie/hoc-tu-vung/blob/89eedfc66d9b43ce5cf9e876ba14967785de5102/docs/PRONUNCIATION.md). Giữ một cột, nội dung học ở trung tâm, hành động chính rõ, thông tin kỹ thuật để trong trợ giúp. Tham khảo tương tác ghi âm của dự án tiếng Anh; không chuyển mô hình tiếng Anh sang đánh giá tiếng Trung.

Pinyin hiện là chữ phẳng, cùng màu chữ phụ, không nền viên thuốc, không viền thanh điệu hay hiệu ứng nổi. Vẫn bấm hoặc dùng bàn phím để mở hướng dẫn, có focus ring và vùng chạm tối thiểu 24 px. Điều này theo mục đích của [WCAG 2.2 SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), không bắt buộc mọi vùng chạm phải trông như một nút có khung.

Màn đọc có một khối nhập, nhãn thật, đếm ký tự và nút tra; chỉ hiện kết quả khi có nội dung. Tách ô tra một từ khỏi đoạn đang đọc. Nội dung được escape khi hiển thị, giữ trong bộ nhớ trang, không gửi đi và không tự thay lịch ôn. Giải thích cách tách từ và giới hạn được đặt trong “Cách dùng”.

## Nghiên cứu mô hình và quyết định

Các số đo dưới đây thuộc nguồn hoặc đánh giá cũ được ghi rõ. Không so sánh trực tiếp các bộ dữ liệu khác nhau và không gọi mô hình đang dùng là SOTA.

| Nguồn | Điều kiểm tra được | Quyết định cho ứng dụng |
|---|---|---|
| [SpeakToLearn](https://github.com/cogeor/speaktolearn/tree/1ca0f99cd0800687c37e3f9871d4d356435fb2d5) | V6 vẫn có trong cây mã trước mốc nghiên cứu. Bản INT8 đang có trong dự án đã có kiểm thử Python–WASM và Chromium–WebKit. README nêu MIT; cây mã kiểm tra không có tệp LICENSE riêng. | Giữ làm nhận dạng tùy chọn, không coi posterior là điểm phát âm. Không thay trọng số hay mở rộng tuyên bố cấp phép. |
| [Ear, bài viết tác giả 31/01/2026](https://simedw.com/2026/01/31/ear-pronunication-via-ctc/) | Tác giả báo cáo Conformer CTC 9M, khoảng 11 MB INT8, tone accuracy 98,29% trên phép đánh giá của họ. Chính tác giả nêu vấn đề với giọng hội thoại và trẻ em. | Kiến trúc đáng theo dõi. Chưa xác minh được bộ trọng số có giấy phép tái phân phối rõ cùng kiểm chứng người học Việt; không đóng gói hoặc thay mô hình chỉ vì số native cao. |
| [Charsiu-js](https://github.com/mnaoizy/charsiu-js) | Căn chỉnh transcript–âm thanh, mô hình tiếng Trung tiny khoảng 40 MB; mã MIT, dữ liệu/trọng số có điều kiện riêng. | Căn chỉnh biết trước câu đích không tự chứng minh người học nói đúng. Không dùng đường căn chỉnh làm điểm phát âm. |
| [TinyAligner](https://github.com/krmanik/tiny-aligner/tree/1f07ad6d186c70baac4fae26c605cc84660d65f7) | Có tệp ONNX 3.723.241 byte trong cây mã được kiểm tra. README mô tả mô hình CTC song ngữ để căn chỉnh cưỡng bức. | Nhỏ và có thể nghiên cứu căn chỉnh, nhưng chưa có bằng chứng đánh giá phát âm người học cho mục tiêu này. Chưa tích hợp. |
| [Whisper-Pinyin weights](https://huggingface.co/walston/whisper-pinyin) | API mô hình trả về checkpoint 1.681.705.415 byte. Chỉ mục tìm kiếm mô tả TER AISHELL-3 3,33%, nhưng API GitHub của kho `oshindow/whisper_pinyin` trả 404 tại lần kiểm tra trực tiếp. | Không xem kết quả chỉ mục là xác nhận độc lập. Checkpoint hiện không phù hợp tải vào PWA điện thoại; chưa benchmark hay tích hợp. |

[OMPAL, Interspeech 2025](https://www.isca-archive.org/interspeech_2025/hsieh25b_interspeech.pdf) có 1.768 phát ngôn của 46 người học nói tiếng Pháp, đánh giá bởi giáo viên, tách phụ âm, nguyên âm, thanh điệu và các tiêu chí ở cấp câu. Đây là ví dụ tốt về quy trình đánh giá, chưa phải kiểm chứng chuyển được sang người học Việt.

[Perception Norm for Mispronunciation Detection](https://www.mdpi.com/2076-3417/16/7/3311), công bố **29/03/2026** (khác ngày nộp 21/02), cho thấy sự khác nhau giữa người gán nhãn trên dữ liệu trẻ em nói tiếng Quan thoại có ảnh hưởng tiếng Uyghur. Bài này hỗ trợ việc phân biệt nhận dạng máy, cảm nhận của người nghe và kết luận sư phạm; không chứng minh hiệu quả riêng của ứng dụng.

Kết luận kỹ thuật: trước khi nâng cấp bộ chấm, cần dữ liệu người học Việt có sự đồng ý, nhiều giọng/micro/độ tuổi và đánh giá độc lập của giáo viên. Đo false correction, false acceptance, tỷ lệ từ chối kết luận và độ trễ trên thiết bị thật. Chưa có các phép đo đó, bỏ điểm gây hiểu nhầm hữu ích hơn việc gắn nhãn SOTA.

## Hành vi luyện nói mới

- AudioWorklet nhận âm trên luồng xử lý âm thanh; ScriptProcessor là phương án dự phòng nếu trình duyệt không khởi tạo worklet được. [MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) mô tả mô hình xử lý này. Không chạy SpeechRecognition song song tranh microphone.
- Mỗi lần ghi có context và stream mới, sóng âm lấy từ RMS thực, thời gian, trạng thái mở/đang nghe/nhận tiếng/chờ kết thúc. Tối đa 8 giây; có nút dừng. Chế độ giảm chuyển động không làm vòng micro phồng lên.
- Hủy khi quyền chưa trả về vẫn dừng mọi track nếu người dùng cấp quyền muộn. Đổi từ, mở Cài đặt, rời trang hoặc đưa trang xuống nền đều kết thúc thu âm. Bản ghi chỉ giữ trong RAM và được giải phóng khi đổi từ/rời màn hình.
- Không có mô hình: ghi âm và nghe so sánh. Không chấm bằng F0. Khi mô hình lỗi: giữ bản ghi để nghe lại, không biến lỗi thành điểm kém.
- Có mô hình: từng âm có nhãn nhận dạng, so sánh hoặc chưa nhận rõ. Ngưỡng xác suất/margin chỉ là hàng rào thận trọng, **chưa được hiệu chuẩn như xác suất đúng đối với người học**. Không có điểm 0–100, không tự đánh dấu thuộc từ, không tự sửa SRS.
- Không kết luận khi từ không thuộc vocab, kết quả hỏng, âm ü/u mà vocab không phân biệt, hoặc đuôi r. Thanh nhẹ không có verdict tự động. Chỉ so thanh khi nhận ra âm đích đủ rõ, có xét biến điệu do bộ quy tắc hiện tại cung cấp.
- Lịch sử số điểm trước đây vẫn giữ trong dữ liệu xuất/nhập. UI hiển thị số lượt/từ đã luyện; lượt mới không ghi số điểm. Đây không phải phép đo mức tiến bộ phát âm.

## Logo, tìm kiếm và PWA

Dùng nguyên sáu tài sản logo từ dự án tiếng Anh theo yêu cầu của chủ dự án; nguồn và SHA-256 nằm trong [logo-source-2026-10-27.json](audits/logo-source-2026-10-27.json). Có SVG/PNG favicon, touch icon, maskable icons, tiêu đề/description, canonical, Open Graph, Twitter summary, WebApplication JSON-LD và sitemap URL trang chính. Không đặt điểm đánh giá hay lời chứng thực giả.

PWA đã tồn tại trước lượt này. Bản cập nhật giữ start URL/scope và cách lấy định danh mặc định từ start URL cũ, thêm module ghi âm và đủ icon vào shell cache `htt-v11-20261027`. Không thêm `id: "./"` vì [id tương đối được tính theo origin](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id), dễ đổi danh tính của ứng dụng đặt ở đường dẫn con. Định danh đã được đối chiếu qua manifest do Chromium phân tích tại cả `/` và `/hoc-tieng-trung/`. Cache audio, mô hình và localStorage tiến độ được giữ; cập nhật chờ thao tác tải lại. Giọng mẫu muốn nghe offline phải tải hoặc nghe trước; mô hình là tải tùy chọn.

Theo [Google Search Central](https://developers.google.com/search/docs/appearance/favicon-in-search), favicon giúp đủ điều kiện hiển thị biểu tượng trong kết quả tìm kiếm, không bảo đảm hiển thị hay tăng thứ hạng. GitHub Pages đặt nhiều dự án chung hostname nên mỗi dự án không được bảo đảm favicon riêng trong Google. Chưa triển khai, gửi sitemap hay đo thay đổi SEO trên website công khai.

## Kiểm chứng

Xem kết quả thực tế tại [learner-ux-2026-10-27.json](audits/learner-ux-2026-10-27.json) và báo cáo bàn giao cuối lượt. Trọng số mô hình không đổi; test parity bảo vệ sự tương đương triển khai, không xác nhận độ đúng sư phạm. Playwright WebKit không thay thế kiểm thử microphone của iPhone vật lý. Không thu hay gửi giọng người dùng để chạy test.
