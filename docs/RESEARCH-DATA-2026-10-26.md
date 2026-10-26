# Nghiên cứu phục vụ dữ liệu học, chốt ngày 26-10-2026

Mục tiêu là dữ liệu có thể truy nguyên, sửa đúng mục và kiểm chứng được trên ứng dụng. Mô hình mới hơn hoặc lớn hơn không tự chứng minh nghĩa Việt và phát âm của kho này đúng. Những kết luận dưới đây phân biệt kết quả của tác giả với cách áp dụng trong dự án.

## Nghiên cứu gần thời điểm khảo sát

| Nguồn gốc | Kết quả liên quan | Cách áp dụng và giới hạn |
|---|---|---|
| [PEDBench, 14-10-2026](https://arxiv.org/abs/2610.20830), bản thảo đã đọc phần thiết kế và giới hạn | Thử 13 mô hình trên lỗi âm vị, gồm dữ liệu tự nhiên, diễn có kịch bản và tổng hợp; phát hiện lỗi vẫn không ổn định. | Không dùng một bộ chấm hoặc LLM làm người duyệt cuối. Nghiên cứu chủ yếu về tiếng Anh, không đem tỷ lệ của họ gán sang người Việt học tiếng Trung. |
| [ASR-Roundtrip Evaluation…, 11-08-2026](https://arxiv.org/abs/2608.10606), đã đọc giao thức đánh giá | ASR có thể trả đúng chữ dù TTS đọc sai theo ngữ cảnh. Tách đoạn và đối chiếu nhiều bộ nhận dạng phát hiện thêm lỗi; tập khảo sát có chủ đích nên không đại diện tỷ lệ lỗi tổng thể. | Chấm riêng đoạn từ sau khi tách, lưu văn bản máy nghe được; không cho ASR biết trước từ cần nghe. Bất đồng là ứng viên cần nghe lại, không tự sửa pinyin theo ASR. |
| [WordVoice, 07-07-2026](https://arxiv.org/abs/2607.06461), đã đọc pipeline gán nhãn | Kiểm soát theo từng từ về thời lượng, khoảng nghỉ, năng lượng, cao độ và ngữ điệu; dùng gán mốc và kiểm tra nhất quán dữ liệu. | Lưu mốc cắt và năng lượng tại khoảng nghỉ; tách kiểm tra file, nội dung và nghe duyệt. Dự án không triển khai WordVoice hay tuyên bố tái lập kết quả của bài báo. |
| [MQM Re-Annotation, ACL tháng 7-2026](https://aclanthology.org/2026.acl-long.1553/), đã đọc PDF | Vòng đọc lại chú giải bởi người đánh giá có thể phát hiện lỗi bị bỏ sót; chú giải tự động hữu ích nhưng cần được sửa hoặc bác bỏ. | Giữ bản hiệu chỉnh, căn cứ, trạng thái chưa duyệt và bảng xuất cho biên tập. Tự kiểm tra trong chat không được gọi là đánh giá độc lập của giáo viên. |
| [WMT26 Chinese–Southeast Asian MT](https://www2.statmt.org/wmt26/chinese-southeast-asian.html) | Có hướng Trung–Việt và tiêu chí chất lượng, hiệu suất, dữ liệu ít tài nguyên. | Nguồn tham khảo cho lựa chọn mô hình dịch về sau. Điểm dịch câu không chứng nhận từng nghĩa từ điển hoặc mức phù hợp sư phạm. |

Các nguồn đều được công bố trước mốc người dùng yêu cầu. Không suy diễn một bảng xếp hạng tổng quát thành mô hình tốt nhất cho mọi tác vụ. Nghiên cứu dịch Trung–Việt [Luo và Chai, 28-07-2026](https://doi.org/10.3390/app16157505) cũng được tìm thấy, nhưng trang toàn văn trả lỗi 429 trong lần truy cập này; chỉ tham khảo tóm tắt, không dùng làm căn cứ duy nhất để sửa nghĩa.

## Lựa chọn dữ liệu và mô hình

CC-CEDICT được tải từ MDBG và chốt SHA-256; trích các mục cần đối chiếu kèm giấy phép CC BY-SA 4.0. Nghĩa Việt được viết ngắn theo ngữ cảnh sử dụng, không dịch máy hàng loạt lại những trường đã có. 13 khác biệt cách đọc bổ sung được hiệu chỉnh theo mục từ; cách đọc khác của 泄露 vẫn giữ vì chính nguồn ghi nhận biến thể đó.

Đối chiếu điểm về sắc thái và tiếng Việt có dùng [mục 玩意兒 của Bộ Giáo dục Đài Loan](https://dict.revised.moe.edu.tw/dictView.jsp?ID=161614&la=0&powerMode=0), [理科 của ZIM](https://dictionary.zim.vn/trung-viet/%E7%90%86%E7%A7%91) và [有劲儿 của Tiếng Trung Panda](https://tiengtrungpanda.vn/tu-dien/youjinr/). Một số từ điển trực tuyến dùng chung CC-CEDICT, nên các kết quả giống nhau không được tính là những lần duyệt độc lập. Không nhập nguyên bộ nghĩa hoặc audio từ các trang này.

Rà cấu trúc phát hiện nghĩa chỉ dẫn sang từ khác, câu bị cắt ở 60/140 ký tự và cách đọc không khớp nghĩa đang dạy. Bản cập nhật có 181 mục nghĩa mang nguồn biên tập, trong đó 177 nghĩa ngắn thay đổi so với commit nền (36 nghĩa trước đó trống), cùng các sửa ghi chú. 干, 价, 胖, 雨, 调 và 空 được đối chiếu theo nghĩa trước khi đổi cách đọc; ID không đổi. Không gọi việc có đủ trường là đã bao phủ mọi nghĩa của mọi từ trong tiếng Trung.

Qwen3-TTS và CosyVoice 3 là những ứng viên có tiếng Trung và khả năng điều khiển. Kokoro v1.1-zh được chọn thử vì chạy cục bộ trên máy hiện có, giấy phép mô hình rõ và nhận đầu vào âm vị. Đây là quyết định vận hành sau thử nghiệm, không phải kết luận Kokoro đứng đầu chất lượng. Nguồn chính: [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS), [CosyVoice](https://github.com/QwenAudio/CosyVoice), [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh).

Không lấy audio của HearMandarin theo giấy phép dataset từ vựng: trang nguồn loại audio khỏi giấy phép đó. Dữ liệu giọng người của audio-cmn có ích để đối chiếu nhưng không phủ đầy đủ mọi mục và cách đọc hiện hành. [HearMandarin datasets](https://hearmandarin.com/datasets/), [audio-cmn](https://github.com/hugolpz/audio-cmn).

## Thử nghiệm thực tế và quyết định

1. TTS đọc trực tiếp từ ngắn có các mẫu bị máy nghe thành thêm âm đầu. Đã dừng sinh và chuyển tệp thử vào `.cache/quarantine/`.
2. Thử nhiều giọng và Transformers 5/4: đổi phiên bản phụ thuộc không giải quyết lỗi trên mẫu. Chốt 4.51.3 để giữ môi trường tái tạo rõ ràng.
3. Dùng câu dẫn trước từ cải thiện nhóm thử nhưng còn dấu hiệu âm thừa cuối. Dùng câu dẫn ở cả hai phía và cắt trong khoảng nghỉ cải thiện tiếp.
4. Thử 40 mục gồm 12 mục phát hiện vấn đề và 28 mục lấy bằng seed 20261026, với hai giọng. SenseVoice khớp chuỗi âm tiết chưa xét thanh ở 78/80 đoạn sau khi tách. Hai ứng viên bất đồng là 糊 và 条约 ở giọng nữ; phép đổi chữ ASR sang pinyin cũng có thể chọn sai cách đọc của chữ đa âm.
5. Tỷ lệ trên là kiểm tra phát triển, không phải bộ kiểm định độc lập sau mọi lần điều chỉnh, cũng không phải tỷ lệ phát âm đúng của 10.969 mục. Các file JSON lưu từng đầu vào, phiên bản bộ nhận dạng và kết quả để đọc lại được.

Whisper Small và SenseVoice là công cụ kiểm tra ngoài ứng dụng. SenseVoice được chạy cục bộ qua sherpa-onnx, không đưa trọng số vào PWA. Giữ tên tác giả/mô hình và [giấy phép FunASR](https://github.com/modelscope/FunASR/blob/main/MODEL_LICENSE). [Tài liệu mô hình ONNX](https://k2-fsa.github.io/sherpa/onnx/sense-voice/pretrained.html).

## Ranh giới phát hành

Kiểm tra tự động bắt buộc: ID và liên kết audio ổn định, nghĩa không trống, pinyin đúng cấu trúc, file thật và giải mã được, nguồn/checksum nhất quán, nâng cấp cache không làm mất tiến độ. Đây là phần có thể chứng minh bằng máy.

Chất lượng giáo dục còn cần đọc và nghe duyệt: đúng nghĩa đang dạy, đúng sắc thái khẩu ngữ/văn viết, tiếng Việt tự nhiên, thanh nhẹ/biến điệu, chữ đa âm và âm uốn lưỡi. Mẫu phải có cả lựa chọn ngẫu nhiên phân tầng và nhóm rủi ro; báo cáo mẫu số, ghi rõ ai đã duyệt và sửa ở đâu. Không tự điền tên người duyệt hoặc đổi trạng thái thành được giáo viên xác nhận.

Quy trình mã và dữ liệu thực hiện nguyên tắc pstack đã ghi trong `DATA-DELIVERY-2026-10-26.md`. Các kết quả được tự kiểm tra; chưa có người biên tập ngôn ngữ độc lập duyệt toàn bộ kho. Không có subagent nào được sử dụng.
