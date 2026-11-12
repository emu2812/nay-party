# Nảy Party — Gói triển khai Cloudflare Workers

Gói đóng gói sẵn của game tiệc **Nảy Party** để đưa lên Cloudflare Workers, lấy link công khai cho bạn bè tự vào chơi bằng điện thoại của họ. Đây là bản chạy độc lập (không phụ thuộc vào bản Space nội bộ): toàn bộ game nằm trong **một file Worker duy nhất**, không cần npm, không cần build.

Mô hình chơi (giống các game tiệc trên TV): màn hình lớn (TV/máy tính) mở trang web để tạo phòng → hiện **mã phòng 6 số**. Điện thoại mở cùng trang đó, chọn "Điện thoại (tay cầm)", nhập mã + tên (không cần tài khoản) là vào phòng. Phòng có 4 ghế P1–P4; host thêm được **Máy (bot)** vào ghế trống P2–P4 với 3 mức Dễ/Vừa/Khó. Bắt đầu game cần ≥ 1 người thật và ≥ 2 ghế có người. Máy chủ là nơi tính điểm và giữ nhịp thời gian (mốc thời gian phía server); các máy khách thăm dò trạng thái ~1 giây/lần (nhanh hơn ở game phản xạ và arena).

## Các file trong gói

| File | Vai trò |
| --- | --- |
| `worker.mjs` | Toàn bộ Worker: trang game (HTML/CSS/JS nhúng sẵn) + API phòng chơi (JSON) + luật 6 game + bot. Không có phụ thuộc ngoài. |
| `wrangler.toml` | Cấu hình Worker: tên `nay-party`, `workers_dev = true`, binding KV `ROOMS` (id đang là placeholder, xem mục triển khai). |
| `tests/local-test.mjs` | Test chạy bằng node trên máy cá nhân: giả lập KV trong bộ nhớ + đồng hồ giả, chơi trọn một trận 7 game và kiểm chứng điểm số. |
| `README.md` | Tài liệu này. |

## 6 game (nội dung tự soạn)

1. **Nhanh Tay** — 5 vòng: đợi màu xanh rồi bấm; bấm sớm −100; hiện khoảng cách mili-giây giữa các người chơi.
2. **Đố Vui Tốc Độ** — 8 câu từ ngân hàng 30 câu tự soạn; đúng = 100 + tối đa 100 điểm tốc độ + **điểm chuỗi** khi đúng liên tiếp (chuỗi 2 trở lên: +25 × (chuỗi − 1)); đáp án đúng không bao giờ lộ ở phía điện thoại trước khi trả lời.
3. **Đoán Số Chuẩn** — 5 câu ước lượng từ ngân hàng 15 câu; công bố kết quả từ lệch nhiều nhất → ít nhất kèm đếm số cho kịch tính; xếp hạng theo độ lệch, hoà thì theo thứ tự ghế.
4. **Đua Bấm Nút** — 3 vòng, mỗi vòng 10 giây bấm càng nhiều càng tốt.
5. **Nhớ Màu** — TV nháy dãy màu dài dần (3→7), điện thoại bấm lại bằng 4 nút màu; đúng hết được 100 + 40 × độ dài dãy.
6. **Đẩy Ra Khỏi Sàn** — game arena theo nhịp tick 500ms với **tay cầm gamepad** (D-pad + nút A/B, gửi trạng thái đang giữ): blob di chuyển trên sàn tròn thu hẹp dần, A = đẩy đối thủ, B = lướt nhanh; rơi khỏi sàn mất 1 mạng (mỗi người 3 mạng); người trụ lại cuối cùng (hoặc nhiều mạng nhất khi hết 90 giây) thắng. Điểm hạng nhất/nhì/ba/tư: 300/200/100/50.

Luật điểm chung: điểm hạng theo vòng 300/200/100/50 (trừ game có công thức riêng ở trên); điểm cộng dồn qua các game trong cùng phòng; **vòng cuối của mỗi game nhân đôi điểm ("Vòng quyết định ×2")** để luôn còn cơ hội lội ngược dòng (riêng Đẩy Ra Khỏi Sàn là một trận liên tục nên điểm hạng trao một lần đúng 300/200/100/50). Sau mỗi game có màn kết quả và bục vinh quang; host bấm **"Chơi lại ngay"** để chơi lại game vừa rồi. Bảng điểm giữa trận luôn hiện khoảng cách giữa người dẫn đầu và người thứ hai. Bot có "tính cách": biểu cảm blob thay đổi theo tình thế (reo khi dẫn đầu, ngạc nhiên/buồn khi bị vượt) và thỉnh thoảng bật bong bóng thoại trêu chọc trên TV. Điện thoại rung khi trả lời đúng/thắng vòng; có âm thanh tổng hợp WebAudio (bấm, đúng, sai, thắng, tích tắc 3 giây cuối) và nút tắt tiếng.

Đồ họa: nền kem, thẻ trắng bo tròn lớn, chữ nâu đậm, font Baloo 2 + Quicksand (Google Fonts), mascot blob vẽ bằng SVG với 5 biểu cảm (cười, reo, ngạc nhiên, buồn, ngủ) màu hồng/xanh dương/xanh lá/tím/cam, confetti nhiều lớp ở bục vinh quang, vương miện cho người thắng, mỗi game một nền gradient riêng, nút bấm có bóng nhiều lớp kiểu 3D.

## Chạy test ở máy cá nhân

Yêu cầu: node 18+ (không cần cài thêm gì).

```bash
node --check worker.mjs     # kiểm tra cú pháp
node tests/local-test.mjs   # chạy test trọn trận
```

Test sẽ: tạo phòng, thêm/xoá/đổi mức bot, kiểm tra điều kiện bắt đầu, cho người chơi vào bằng mã, chơi hết 6 game (Đua Bấm Nút chơi 2 lần nhờ nút "Chơi lại ngay"), và đối chiếu tổng điểm tích luỹ với tổng điểm từng game. Các con số được kiểm chứng chính xác gồm: Đố Vui = **2675** điểm cho người trả lời đúng hết và tức thì (đã gồm điểm chuỗi và ×2 vòng cuối), Đoán Số = **1800**, Nhớ Màu = **1880**, Đẩy Ra Khỏi Sàn = đúng bộ điểm **300/200/100**.

## Cách triển khai lên Cloudflare (làm sau, chưa làm trong gói này)

1. Tạo một repo GitHub mới (ví dụ `nay-party`) và đẩy 3 file `worker.mjs`, `wrangler.toml`, `README.md` lên nhánh `main` (thư mục `tests/` để ở repo cũng được, Worker không dùng tới).
2. Trong Cloudflare Dashboard → Workers & Pages → Create → kết nối repo GitHub đó (Workers Builds): mỗi lần đẩy lên `main`, Worker tự triển khai lại — giống cách đã làm với web đọc sách.
3. Tạo KV namespace: Dashboard → Storage & Databases → KV → Create namespace (đặt tên tuỳ ý, ví dụ `nay-party-rooms`).
4. Mở `wrangler.toml`, thay hai giá trị placeholder `00000000000000000000000000000000` (`id` và `preview_id`) bằng id của namespace vừa tạo. **Tên binding bắt buộc là `ROOMS`** — code trong `worker.mjs` đọc `env.ROOMS`.
5. Đẩy lại lên `main` để Workers Builds triển khai kèm binding; mở địa chỉ `https://nay-party.<subdomain>.workers.dev` kiểm tra: màn hình lớn tạo phòng được, điện thoại nhập mã vào được.

## Ghi chú kỹ thuật / giới hạn đã biết

- Trạng thái phòng lưu trong KV dạng JSON, cập nhật kiểu đọc → sửa → ghi mỗi khi có yêu cầu; pha game tiến triển "lười" theo yêu cầu thăm dò (không dùng WebSocket). Đủ mượt cho quy mô tiệc bạn bè; nếu hai yêu cầu ghi đè cùng khoảnh khắc, lần ghi sau thắng.
- Phòng tự hết hạn sau 6 giờ (TTL của KV).
- Game phản xạ và arena phụ thuộc nhịp thăm dò: trang tự thăm dò nhanh hơn (~220ms) trong hai game đó, và TV vẽ blob arena bằng phần tử cố định có chuyển động CSS nên hình vẫn mượt giữa các lần cập nhật.
- Bot ở 5 game đầu đánh theo "kế hoạch" tính sẵn khi bắt đầu mỗi vòng (độ khó quyết định tốc độ/độ chính xác); bot ở game arena thì lái theo từng tick với nhịp phản ứng theo độ khó.
