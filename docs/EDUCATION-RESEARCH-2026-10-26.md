# Căn cứ giáo dục, giáo trình và thiết kế dữ liệu

Phạm vi tìm hiểu: nguồn công bố đến **26-10-2026**. Đây là tổng hợp để quyết định thiết kế, không phải tổng quan hệ thống hay chứng nhận hiệu quả của ứng dụng. Không có thử nghiệm trên người học được thực hiện trong đợt này. Tài liệu nào chỉ đọc được tóm tắt, mô tả hoặc mục lục được ghi rõ; không tuyên bố đã đọc trọn bộ giáo trình thương mại.

## Kết luận dùng để xây dựng sản phẩm

1. Mở mọi cấp, cho chọn danh mục và nội dung đọc. Danh sách thi là một cách phân nhóm từ, không đủ để quyết định người học phải học gì trước.
2. Giữ ôn cách quãng và tự nhớ lại như công cụ tùy chọn. Chỉ thao tác ôn theo lịch cập nhật FSRS; tra từ, đọc, nghe, viết và gắn sao không tự làm tăng mức nhớ.
3. Tách việc nhận ra một từ khỏi khả năng dùng từ trong câu, nghe hiểu và giao tiếp. Không suy ra trình độ HSK từ số thẻ hay điểm thanh điệu.
4. Tách chữ, cách đọc, nghĩa dạy và phiên bản danh mục. Cùng chữ nhưng khác cách đọc không được nhập chung chỉ để giảm số dòng.
5. Biên tập nghĩa Việt theo ngữ cảnh và từ loại. Âm Hán Việt chỉ hỗ trợ liên hệ chữ; không phải bản dịch tự động của từ tiếng Trung.
6. Giữ kiến trúc PWA hiện tại: dữ liệu tĩnh có phiên bản, kiểm tra tái tạo, checksum, cập nhật cache đầy đủ. Chưa có bằng chứng nhu cầu cho backend phân tán, vector database hay một LLM chấm năng lực trong luồng học.

Các quyết định trên là suy luận thiết kế có giới hạn từ các nguồn dưới đây. Không gọi chúng là “SOTA đã chứng minh cho người Việt học tiếng Trung”.

## Phiên bản HSK và mốc thời gian

[Trang đề cương của Chinese Testing International](https://www.chinesetest.cn/syllabus) dẫn tới [PDF đề cương mới](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf). Bìa ghi công bố tháng 11-2025, thực hiện tháng 7-2026. Bảng từ ở trang 80–354 có 11.000 dòng. SHA-256 PDF được chốt trong nguồn dữ liệu; bản trích giữ số dòng, trang, pinyin, từ loại và chữ gốc.

[Thông báo CTI về triển khai kỳ thi](https://admin.chinesetest.cn/gonewcontent.do?flag=kdnew&id=51336883) và [thông tin của cơ quan giáo dục Thượng Hải ngày 15-09-2026](https://edu.sh.gov.cn/study_en_news/20260915/f7034aa15cad4a92a6183abeea104895.html) đề cập ngày 13-12-2026. Mốc triển khai kỳ thi khác mốc ghi trên bìa đề cương. Tại ngày nghiên cứu, không mô tả kỳ thi tháng 12 như việc đã xảy ra.

Danh sách tiêu chuẩn 2021 có 10.969 thẻ trong dự án; đề cương mới có 11.000 dòng nhưng sau khi xử lý trùng và các cách đọc thay thế là 10.960 thẻ riêng. Phần giao nhau dùng chung ID khi cách đọc tương thích; tổng hai bộ là 12.387 thẻ. HSK 7–9 vẫn là một nhóm chung theo bảng nguồn, không tự chia ra ba cấp bằng suy đoán.

Bốn điểm pinyin cần đối chiếu — 大都, 脚踏实地, 任性, 温差 — được giữ nguyên ở bản trích và hiệu chỉnh có căn cứ ở `cti-editorial.json`. Đây là quyết định biên tập của dự án, không phải thông báo đính chính chính thức của CTI. Đối chiếu thêm [từ điển thành ngữ của Bộ Giáo dục Đài Loan](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=377&la=0&webMd=2), [mục 任性](https://dict.revised.moe.edu.tw/dictView.jsp?ID=136205) và [mục 溫差](https://pedia.cloud.edu.tw/Entry/Detail/?search=%E6%BA%AB%E5%B7%AE&title=%E6%BA%AB%E5%B7%AE), bên cạnh snapshot CC-CEDICT đã chốt.

## Giáo trình và trường đại học

| Nguồn đã đọc | Nội dung có thể dùng | Giới hạn |
|---|---|---|
| [Đại học Bắc Kinh giới thiệu Boya Chinese](https://hanyu.pku.edu.cn/xzky/kycg/366311.htm) | Có các nhánh tổng hợp, nghe–nói, đọc–viết và khả năng sử dụng theo nhu cầu. Gợi ý tách hoạt động thay vì bắt mọi người đi cùng một chuỗi. | Mô tả của đơn vị biên soạn, không phải thử nghiệm đối chứng; không đọc toàn bộ sách. |
| [BLCUP: New Practical Chinese Reader, bản 3](https://www.blcup.com/CW110/channel/index/1006?ccid=1096) | Kết hợp cấu trúc, chức năng, văn hóa, nhiệm vụ giao tiếp và tự đánh giá. Gợi ý cho phép đọc/nghe trong ngữ cảnh bên cạnh thẻ từ. | Đọc phần giới thiệu của nhà xuất bản; không nhập bài khóa, tranh hoặc audio của sách. |
| [BLCUP: Hanyu Jiaocheng, bản 3](https://www.blcup.com/SeriesBook/index/1631) | Chú trọng sử dụng, đối chiếu từ và chuyển từ hiểu sang vận dụng. Nghĩa ngắn cần có ghi chú khi dễ nhầm cách dùng. | Mô tả bộ sáu sách, không chứng minh một thứ tự cố định tối ưu cho mọi người. |
| [BLCUP: HSK Standard Course](https://www.blcup.com/SeriesBook/index/8) | Tham khảo cách phối hợp chủ đề và hoạt động cho mục tiêu thi. | Bộ sáu cấp cũ; không gán máy móc sang đề cương 2025/2026. |
| [BLCUP: Chinese Paradise, thẻ từ bản tiếng Việt](https://www.blcup.com/PInfo/index/1593) | Mô tả thẻ kết hợp chữ, pinyin, hình ảnh và tiếng Việt cho trẻ em. | Chỉ đọc mô tả; không suy rộng phương pháp cho người trưởng thành hoặc sao chép bộ thẻ. |
| [ULIS–VNU và Đại học Bắc Kinh hợp tác xây dựng giáo trình, 2026](https://ulis.vnu.edu.vn/ky-ket-hop-tac-xay-dung-giao-trinh-tieng-han-voi-dai-hoc-bac-kinh-trung-quoc/) | Quá trình xây bản đồ sách, lấy ý kiến chuyên gia và kế hoạch thí điểm cho thấy vai trò của biên tập và kiểm nghiệm với đối tượng thực tế. | Tin hợp tác và kế hoạch không đồng nghĩa toàn bộ giáo trình đã xuất bản hoặc đã có kết quả hiệu quả. |
| [Thư viện Đại học Công nghiệp Hà Nội](https://lic.haui.edu.vn/vn/html/bo-suu-tap/831) | Xác nhận sự hiện diện của các bộ Boya, Hán ngữ, HSK, Developing Chinese trong nguồn tham khảo tại Việt Nam. | Danh mục thư viện không phải xếp hạng chất lượng hay bằng chứng hiệu quả. |

Không tìm được một bộ ví dụ Trung–Việt lớn vừa rõ quyền phân phối lại vừa đã được thẩm định phù hợp toàn kho. Không lấy sách scan, chương trả phí hay từ điển trên diễn đàn làm dữ liệu phát hành. Bản hiện tại **chưa có bộ câu ví dụ song ngữ phủ toàn kho**; công cụ đọc cho phép người học tự chọn đoạn văn và tra từ tại chỗ.

## Bằng chứng trực tiếp liên quan đến người Việt

[Nguyễn Đình Hiền, ULIS, 2023](https://jfs.ulis.vnu.edu.vn/index.php/fs/article/download/5104/4426/11638): đã đọc phương pháp, kết quả và phần phân tích trong PDF. Nghiên cứu khảo sát 208 bài thi nói của sinh viên học tiếng Hán 1–3 năm; ghi nhận 1.104 lỗi ngữ pháp, trong đó 33,70% thuộc nhóm quan hệ trạng ngữ–trung tâm ngữ. Tác giả lưu ý tần suất lỗi thấp có thể do người học tránh dùng cấu trúc khó. Đây là nghiên cứu mô tả trong một nhóm, không phải thử nghiệm ứng dụng hay ước lượng tỷ lệ lỗi cho mọi người Việt. Ứng dụng: không xem “biết nghĩa” là “dùng đúng”; ưu tiên giải thích từ loại, kết hợp từ và ngữ cảnh. Không biến toàn bộ câu chỉnh trong bài báo thành quy tắc tuyệt đối ngoài ngữ cảnh.

[Lưu Hớn Vũ, *汉越趋向补语对比习得研究*, 2020, SSAP](https://xianxiao.ssap.com.cn/catalog/4936926.html): chỉ đọc tóm tắt và mục lục/preview công khai. Công trình đối chiếu bổ ngữ xu hướng Trung–Việt cho thấy không thể dịch mọi cấu trúc bằng cách thay từng từ. Không nhập corpus hay chương sách; không tuyên bố đã đọc phần trả phí. Ứng dụng: giữ chỗ cho nghĩa theo cách dùng và các đối chiếu, không coi một bản gloss là mọi nghĩa có thể có.

[Nghiên cứu về tự chủ học tập tại VNU, 2019](https://js.vnu.edu.vn/FS/article/view/4378): phần tóm tắt mô tả bảng hỏi 63 sinh viên, phỏng vấn ba người và quan sát; đối tượng học tiếng Anh. Dùng để lưu ý sự khác biệt giữa điều kiện trong/ngoài lớp, không dùng làm bằng chứng nhân quả cho tính năng tự chọn của ứng dụng tiếng Trung.

## Ôn cách quãng, tự nhớ và nghiên cứu mới

| Nguồn | Mức đã đọc và kết quả liên quan | Áp dụng có giới hạn |
|---|---|---|
| [Kim & Webb, 2022, meta-analysis](https://doi.org/10.1111/lang.12479) | Tóm tắt: 48 thí nghiệm, 3.411 người; nhìn chung có lợi cho học cách quãng, lịch đều và lịch giãn dần không khác biệt có ý nghĩa tổng thể. | Giữ công cụ ôn; không suy ra định mức từ/ngày hoặc một lịch luôn tốt nhất. |
| [Rogers, Nakata & Chiu, 2025](https://doi.org/10.1017/S0272263124000706) | Tóm tắt nghiên cứu tái lập: kết quả phụ thuộc bối cảnh; hiệu suất tuyệt đối thấp hơn nghiên cứu gốc. | Có bằng chứng ủng hộ spacing nhưng vẫn cần đo trên người dùng và nhiệm vụ thật. |
| [Suzuki, Nakata & He, 2024](https://doi.org/10.1017/S095834402400020X) | Tóm tắt: 118 sinh viên Nhật học từ tiếng Anh, 20 từ, hai buổi; khác biệt người học có liên quan hiệu suất. | Không quy đổi thành lịch tiếng Trung mặc định cho người Việt. |
| [Maie và cộng sự, 2025](https://doi.org/10.1002/tesq.3391) | Tóm tắt: hai lớp 44 người, 100 từ trong học kỳ. | Bối cảnh lớp học và nhóm không tương đương thử nghiệm trên ứng dụng này. |
| [Huang và cộng sự, 2025](https://www.mdpi.com/2076-328X/15/11/1540) | Đọc tóm tắt và phương pháp: 108 người Trung Quốc, cặp từ Swahili–Trung, 3/4 vòng, kiểm tra sau khoảng 30 phút. Ngày xuất bản 12-11-2025. | Không ép bốn vòng; không lấy kết quả ngắn hạn làm chứng cứ thông thạo tiếng Trung dài hạn. |
| [Miao & Wu, 2026](https://www.tandfonline.com/doi/full/10.1080/09588221.2026.2710623) | Chỉ tóm tắt; công bố trực tuyến 01-08-2026. 60 học sinh Trung Quốc học tiếng Anh, ba lịch cách quãng; nhận biết và sản sinh từ có thể khác nhau. | Không dùng một điểm nhớ chung thay cho mọi kỹ năng. Không tuyên bố đã đọc phương pháp đầy đủ. |
| [Soderstrom, 2026](https://www.mdpi.com/2076-328X/16/9/1705) | Đọc phương pháp, kết quả và thảo luận; công bố 21-09-2026. Hai thí nghiệm 92/88 sinh viên nói tiếng Anh, 24 cặp Lithuania–Anh, đổi chiều luyện tập, kiểm tra 10 phút/24 giờ. Phân nhóm theo chu kỳ cố định, không ngẫu nhiên. | Lợi ích đổi chiều rõ hơn ở chiều khó và bài kiểm tra trì hoãn; còn nhiễu do độ khó và tương đồng giữa luyện/kiểm tra. Giữ thẻ đảo chiều tùy chọn, không bắt tất cả người học luyện hai chiều. |

Không nghiên cứu nào ở đây xác nhận trực tiếp hiệu quả tổng thể của Neko với người Việt học tiếng Trung. Chưa có cơ sở đổi FSRS sang một hệ điều phối “AI” phức tạp hơn. Lịch ôn là dự đoán về nhớ thẻ, không phải chẩn đoán năng lực ngôn ngữ.

## Phát âm và cách diễn đạt tiếng Việt

[Ting Yi Ting, University of Kansas, bài 4](https://opentext.ku.edu/tingyiting/chapter/lesson4/) phân biệt b/p, d/t theo bật hơi; [tài liệu pinyin của MIT OCW](https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/01af9a25b804b7d58a26fa580691df4f_MITRES_21G_003S11_pinyin.pdf) và [UCSD, Mandarin Pronunciation](https://pages.ucsd.edu/~dkjordan/chin/chin/pinyin2.html) cung cấp mô tả cấu âm. Phần hướng dẫn trong app được diễn đạt lại bằng tiếng Việt, bỏ phép đồng nhất p với “ph”, hoặc thanh 2/4 với dấu sắc/nặng. Không lấy các ví von dành cho người nói tiếng Anh rồi coi là tương đương cho tiếng Việt.

Đường thanh 3 đọc riêng không được trình bày như đường bắt buộc trong mọi câu. Điểm máy, audio tổng hợp và ASR đều có giới hạn với thanh nhẹ, đa âm, biến điệu và âm tiết ngắn. Nghe duyệt người bản ngữ và đánh giá của giáo viên vẫn chưa được thực hiện đầy đủ.

## GitHub và kỹ thuật đã tham khảo

| Dự án | Điều đã học | Quyền sử dụng / phần được dùng |
|---|---|---|
| [Lute](https://github.com/LuteOrg/lute-v3), [manual](https://luteorg.github.io/lute-manual/) | Người học chọn văn bản, tra từ/cụm và quản lý từ theo nhu cầu. | MIT; tham khảo ý tưởng, không chép mã. |
| [LinguaCafe](https://github.com/simjanos-dev/LinguaCafe) | Kết nối đọc với tra cứu và ôn sau. | GPL-3.0; không nhập mã vào dự án MIT. |
| [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) | Thuật toán lịch ôn có triển khai và kiểm tra riêng; lịch tách khỏi UI và nội dung. | Giữ `ts-fsrs` 5.4.2 hiện có; không đổi thuật toán chỉ vì một repo nổi bật. |
| [Hanzi Writer](https://github.com/chanind/hanzi-writer) | Dữ liệu nét theo chữ và cơ chế viết kiểm tra. | Mã MIT khác giấy phép dữ liệu. Bổ sung từ Hanzi Writer Data 2.0.1 có integrity, giữ Arphic PL. |
| [Anki-xiehanzi](https://github.com/krmanik/Anki-xiehanzi) | So sánh cách đóng gói deck, danh sách mới và tình trạng thiếu audio. | Giấy phép trong bundle khác nhau: code, danh sách và từng nguồn audio phải xét riêng. Không nhập bundle theo giả định toàn bộ MIT. |

Đã đọc README, tài liệu/giấy phép liên quan; không tuyên bố review toàn bộ mã các dự án này. Độ nổi tiếng hoặc số sao không được dùng làm bằng chứng giáo dục.

Theo các nguyên tắc pstack đã ghi trong `DATA-DELIVERY-2026-10-26.md`: mô hình hóa đúng miền dữ liệu; xây công cụ tái sử dụng; chạy lại an toàn; kiểm chứng kết quả thực. Cụ thể là membership độc lập ID, pipeline có nguồn chốt, kiểm tra sai đa âm/thiếu dòng, journal audio, hash, giải mã toàn bộ, browser regression và giữ tiến độ khi nâng cấp. Không triển khai hệ phân tán khi dữ liệu tĩnh và công cụ hiện tại đã đủ.

## Những việc nghiên cứu chưa thể xác nhận thay cho thực tế

Nghĩa Việt đã có ở mọi thẻ, nhưng chưa phải từ điển bao quát mọi nghĩa và sắc thái. Có thể kiểm tra nguồn và duyệt lại qua TSV; cột giáo viên/ngày duyệt vẫn trống. Tất cả audio từ có file, nhưng ASR không chứng nhận thanh điệu hay độ tự nhiên. Câu ví dụ song ngữ chưa phủ toàn kho. Kiểm thử WebKit trên Windows không chứng minh hành vi trên iPhone thật. Chưa có nghiên cứu với người dùng, dữ liệu retention dài hạn hoặc đánh giá giao tiếp của ứng dụng.

Đợt đánh giá giáo dục sau này nên có sự đồng ý của người tham gia, mục tiêu do họ chọn, phép đo nhận biết/sản sinh từ và sử dụng trong ngữ cảnh, bài kiểm tra trì hoãn, thời gian/khối lượng học thực tế, cùng theo dõi bỏ học và cảm giác bị áp lực. Đây là thiết kế đánh giá đề xuất, chưa phải kết quả đã có; không thu thêm dữ liệu người học trong thay đổi này.
