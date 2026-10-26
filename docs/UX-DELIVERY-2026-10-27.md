# Bàn giao UX/UI và luyện nói — 27/10/2026

Đã hoàn thành các thay đổi tại `E:\Sach\Sua\NekoTiengTrung` và cập nhật trang xem trước `http://127.0.0.1:8931/`. Chưa commit, push hoặc triển khai lên website công khai. Toàn bộ công việc do một agent thực hiện trực tiếp.

## Thay đổi nhìn thấy

- Bỏ nền, viền thanh điệu và hiệu ứng nổi ở mọi nút pinyin. Vẫn có tương tác mở cách đọc, vùng chạm và focus bàn phím.
- Ô đọc và ô tra từ có cùng ngôn ngữ thiết kế; không hiện khung kết quả rỗng; giải thích dài thu vào “Cách dùng”. Chuỗi HTML nhập vào chỉ hiện như văn bản, không thực thi.
- Biểu tượng “Chọn cách học” dùng lightbulb đã có trong bộ SVG. Kiểm tra mọi biểu tượng trên trang chủ, cập nhật shell cache để trang cũ nhận đúng bản mới.
- Sao chép nguyên bộ logo Neko từ `hoc-tu-vung` theo yêu cầu; áp dụng favicon, touch icon, maskable icon và metadata chia sẻ/tìm kiếm. Nguồn và hash của sáu tệp được lưu lại.
- Luyện nói hiển thị sóng âm thực, thời gian và trạng thái thu; có dừng, ghi lại, nghe mẫu, nghe mình và nghe nối tiếp. Âm thanh dừng đúng khi đổi từ, đổi thao tác, mở Cài đặt hoặc rời trang.
- Mô hình V6 vẫn là hỗ trợ nhận dạng tùy chọn. Bỏ điểm 0–100 và điểm thanh điệu F0; các trường hợp thiếu hỗ trợ hoặc thiếu độ chắc chắn không bị quy thành “sai”. Không biến luyện nói thành đánh giá thuộc từ hay thay lịch ôn.

## Kiểm chứng đã chạy

| Phép kiểm tra | Kết quả |
|---|---|
| JavaScript unit tests | 77 kiểm tra qua, gồm 9 trường hợp semantics phản hồi mới |
| E2E toàn ứng dụng | 40 kiểm tra qua trên Chromium và WebKit; không có lỗi console trong bộ kiểm tra |
| Accessibility toàn ứng dụng | Không có lỗi tự động WCAG 2 A/AA trên 10 màn/trạng thái mỗi trình duyệt |
| UX bổ sung | 360, 390, 768, 1280 px × sáng/tối × 2 trình duyệt; không tràn ngang; reader an toàn, pinyin phẳng, đủ biểu tượng; không có lỗi axe trong các trạng thái kiểm tra, gồm WCAG 2.1/2.2 AA |
| Thu âm thực qua Web Audio, tín hiệu giả lập | Chromium: 3 lần liên tiếp, im lặng, từ chối quyền, hủy trước cấp quyền, cấp quyền muộn, đổi từ/rời trang/mở Cài đặt, nhánh ScriptProcessor dự phòng đều qua |
| Worker và nghe lại | Worker lỗi trả về; phản hồi mô hình xuất hiện; xóa/tải lại được; hủy chuỗi nghe nối tiếp không phát lại giọng cũ |
| Mô hình Python–WASM | 3 fixture × Chromium/WebKit, cùng top syllable/tone tham chiếu; load 7,6/10,8 giây trong lượt đo; inference khoảng 0,55–1,42 giây/từ trong bộ fixture nhỏ |
| PWA upgrade/offline | Cài bản lỗi giữ worker cũ; bản tốt thay cache; giữ tiến độ và cache ứng dụng khác; đủ module ghi âm và icon offline |
| PWA metadata/identity | Không lỗi manifest/installability trong Chromium; định danh cũ/mới giống nhau tại `/` và `/hoc-tieng-trung/` |
| Sinh core | Khớp đầu vào tiếng Anh đã pin và `tools/make-core.py` |
| Dữ liệu | 12.387/12.387 thẻ có nghĩa Việt; 24.774 MP3 khớp hash; 4.304 chữ có dữ liệu nét. Không sửa corpus trong lượt UX này |

Kết quả máy đọc được: [UX và micro](audits/learner-ux-2026-10-27.json), [PWA](audits/pwa-metadata-2026-10-27.json), [nguồn logo](audits/logo-source-2026-10-27.json). Các kiểm tra mới được thêm vào CI. Kiểm tra hash audio ở lượt này không giải mã lại toàn bộ MP3; việc giải mã toàn bộ đã hoàn thành ở lượt dữ liệu trước và audio không thay đổi.

## Giới hạn thực tế

WebKit Playwright trên Windows ở máy này không có AudioContext/capture. Đã kiểm tra giao diện, trạng thái không hỗ trợ và mô hình WASM của WebKit; chưa kiểm chứng microphone vật lý trên iPhone. Các thử nghiệm microphone sử dụng dữ liệu thử, không mở microphone thật của người dùng.

Chưa có tập đánh giá người Việt học tiếng Trung do giáo viên gán nhãn. Vì vậy chưa thể chứng nhận model là bộ chấm phát âm chính xác hoặc SOTA. Ngưỡng abstention là chính sách thận trọng, không phải độ chính xác đã hiệu chuẩn. Lựa chọn hiện tại ưu tiên nghe và tự đối chiếu, cho phép máy không kết luận; lịch sử cũ được bảo toàn.

Logo/metadata đã chuẩn bị nhưng không bảo đảm tăng thứ hạng tìm kiếm. Website công khai vẫn cần một lần phát hành riêng. Mọi cấp HSK, lựa chọn cách học và lịch ôn hiện có được giữ nguyên.

Nghiên cứu, so sánh mô hình, nguồn chính và căn cứ UX: [LEARNER-UX-SPEECH-2026-10-27.md](LEARNER-UX-SPEECH-2026-10-27.md).
