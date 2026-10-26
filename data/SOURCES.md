# Nguồn dữ liệu và ghi công

Giấy phép MIT của mã nguồn không thay thế giấy phép riêng của dữ liệu. Khi phân phối lại, giữ tên nguồn, liên kết giấy phép và ghi nhận những phần đã hiệu chỉnh.

| Thành phần | Nguồn và tác giả | Giấy phép / phạm vi |
|---|---|---|
| Chữ, danh sách HSK 3.0 năm 2021 | [complete-hsk-vocabulary, drkameleon](https://github.com/drkameleon/complete-hsk-vocabulary), bản nguồn `7ac65bf` theo metadata của repo nền | MIT; bản giấy phép kèm tại `LICENSE-complete-hsk-vocabulary.txt` |
| Chỉ mục đề cương HSK 2025/2026 | [Chinese Testing International](https://www.chinesetest.cn/syllabus), PDF 406 trang, SHA-256 `ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941` | Chỉ trích bảng sự kiện gồm từ, cách đọc, từ loại, số dòng/trang tại `sources/cti-syllabus-2025.json`; không phân phối lại PDF/giáo trình hoặc gán giấy phép MIT cho tài liệu CTI |
| 1.418 thẻ bổ sung và 11.000 liên kết dòng đề cương | `sources/cti-lexical-2026-10-26.json`, `cti-joins-2026-10-26.json`, `cti-vietnamese-2026-10-26.tsv`, `cti-editorial.json` | Nghĩa và ghi chú do dự án biên soạn có hỗ trợ AI, đối chiếu CC-CEDICT, CC BY-SA 4.0; chưa có duyệt độc lập của giáo viên song ngữ |
| Nghĩa và cách đọc dùng đối chiếu | [CC-CEDICT / MDBG và cộng đồng đóng góp](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); bản trích và SHA-256 tại `sources/cedict-reference-2026-10-26.json` |
| Nghĩa Việt kế thừa | [CVDICT, Phong Phan](https://github.com/ph0ngp/CVDICT) | CC BY-SA 4.0 theo nguồn của bản nền. URL tải trực tiếp trả 404 trong lần khảo sát; không tuyên bố đã tái tải hoặc khớp toàn bộ upstream hiện tại |
| Nghĩa và ghi chú sửa ngày 26-10-2026 | `sources/corrections.json`, biên soạn có hỗ trợ AI cho dự án, đối chiếu mục từ được ghi ở `basis` | CC BY-SA 4.0; có thay đổi so với nguồn, chưa được giáo viên song ngữ duyệt độc lập |
| Hán Việt, bộ thủ và ghi chú chữ | Kai Hanzi; Unicode Unihan | Kai Hanzi CC BY 4.0, xem `sources/kaihanzi-LICENSE.txt`; [Unicode Terms of Use](https://www.unicode.org/copyright.html) |
| Nét chữ | [Make Me a Hanzi](https://github.com/skishore/makemeahanzi), Hanzi Writer data | Giữ điều kiện Arphic Public License / LGPL của dữ liệu nguồn theo hồ sơ dự án |
| 195 chữ bổ sung | Make Me a Hanzi commit `bddc96d41bef78427ed0e034e9f7e31d71fd1b92`; Hanzi Writer Data 2.0.1; Kai Hanzi ở các mục có sẵn | SHA nguồn, integrity gói và SHA từng chữ trong `sources/character-extensions-2026-10-26.json`. Nét: Arphic Public License; từ điển: LGPL; phần tiếng Việt Kai Hanzi: CC BY 4.0 |
| Audio cũ | Microsoft neural voices, các file đã có ở commit nền | Giữ xuất xứ riêng; không suy diễn giấy phép mã nguồn thành giấy phép dịch vụ tạo tiếng nói |
| Audio mới | [Kokoro v1.1-zh / hexgrad](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh), model revision và các giọng có checksum | Model được công bố Apache-2.0; không đóng gói trọng số vào ứng dụng. Nguồn và cấu hình từng file được lưu trong `sources/audio-assets.jsonl` |

Các bản thu không rõ quyền tái sử dụng không được nhập. Đặc biệt, giấy phép dataset từ vựng HearMandarin không bao gồm audio của họ. SenseVoice và Whisper chỉ dùng chẩn đoán ở môi trường phát triển; trọng số không được phân phối cùng PWA.

Nghĩa đã được rút gọn và bản địa hóa để học; các biến thể, nghĩa cổ và khác biệt cách đọc cần xem ghi chú. Số trường hoặc số file đầy đủ không phải chứng nhận mọi nghĩa và mọi thanh điệu đều chính xác.

Các chuỗi Hán Việt ghép từ âm từng chữ được đánh dấu `hvq:1`, chỉ hỗ trợ liên hệ chữ, không được trình bày như một từ Hán Việt đã được từ điển xác nhận. Một phần giải thích thành phần chữ vẫn bằng tiếng Anh; độ phủ nghĩa Việt của **thẻ từ** không đồng nghĩa đã dịch toàn bộ metadata chữ.
