# ROUND 27 — KIỂM CỰC KỸ + BỐ CỤC THEO CHUẨN TRANG LỚN (2026-11-27)

User 27/11 20:35: "xem cực kỹ cho tôi nào"; 20:37–20:40: thêm
lệnh sắp xếp giao diện/game theo các trang lớn, nhìn vào giao
diện THẬT của họ. Nghiên cứu bố cục: UI_LAYOUT_NOTES.md.

## Kiểm cực kỹ trên bản Round 26 (trước đợt này)

- Hồi quy: local-test 802–804 (biến thiên điều kiện đã biết),
  laser-check 21/21, discrim PASS, deep-drive 629–630/0.
- rig-local-all: 25/25 game vào chế độ tại chỗ, FLAGGED 0, đồng
  bộ kết quả ván tự kết thúc đạt.
- Kiểm toán đóng băng đủ 25 (hồ sơ yếu): 23/25 game 0 long task,
  0 khựng, 60 fps. Ngoại lệ: day-ra + giai-ma-chung mỗi game 1
  khung >34ms (không có long task); NGƯỜI QUE tệ nhất: 2 long
  task (tổng 132ms, lớn nhất 71ms) + 3 khung khựng.
- Quét yếu đủ 25: tất cả 59–61 fps, dựng lại ~0.
- Link thật: tạo phòng 890399, hostJoin + quickStart Ma Sói vào
  countdown/playing, 0 lỗi.

## Sửa Người Que (và Đền Lửa & Nước)

Nhánh vá vị trí của Người Que ghi opacity/textContent/màu vào
DOM MỖI khung hình bất kể thay đổi (kiểu cũ, trước kỷ luật
value-cache của Round 20.2), cộng thêm ghi text ở nhánh Đền.
Nay dùng setOp/setT (chỉ ghi khi đổi) + cache màu sát thương và
class nhân vật Đền. Đo lại: Người Que 0 long task, 0 khựng,
60 fps — đủ 25/25 game sạch.

## Bố cục theo chuẩn trang lớn (UI_LAYOUT_NOTES.md)

1. Hàng "⭐ Hay nhất" lên đầu danh mục (6 game chủ lực: Né Laze,
   Xe Tăng, Đặt Bom, Cướp Sao, Đá Bóng, Đố Vui) — chuẩn Poki/
   CrazyGames: game hay nhất nằm trong khung hình đầu, các game
   này vẫn xuất hiện lại ở mục của chúng như portal vẫn làm.
2. Thẻ game chuẩn một khuôn (chuẩn Bloop): tên → dòng số người
   NGAY dưới tên → 1 dòng luật → dòng phím điều khiển → dòng
   điểm/trạng thái GHIM ĐÁY thẻ; thẻ rộng tối thiểu 240–250px,
   khe 16px; mọi thẻ cùng hàng cao bằng nhau, chân thẳng hàng.
3. Mã phòng to hơn: ô số 62×76/42px → 74×92/54px.
4. Kết quả từng game: PODIUM top 3 ở giữa (2–1–3, số 1 có vương
   miện, tên + điểm dưới mỗi khối — chuẩn Kahoot), hạng 4+ là
   danh sách gọn bên dưới, một hàng nút hành động duy nhất.
   Trước đây là một bảng phẳng cho tất cả.
Chưa làm (ghi rõ): sảnh 3 vùng kiểu Jackbox (cột ghế bên phải)
và badge trạng thái góc thẻ — đợt này giữ cấu trúc sảnh hiện
tại, chỉ chuẩn hoá danh mục + kết quả.

## Kiểm chứng đợt này

- Hồi quy sau sửa: local-test 802, laser 21/21, discrim PASS,
  deep-drive 629/0.
- rig-ui-shot: 31 thẻ (25 + 6 hay nhất), 31/31 có dòng điều
  khiển; ảnh sảnh kiểm bằng mắt: hàng Hay nhất + thẻ đều chiều
  cao, chân thẳng hàng.
- rig-results-shot: ván Kéo Co thật chạy tới kết quả — podium
  3 khối hiện đúng, hạng 4 xuống danh sách, ảnh kiểm bằng mắt.
