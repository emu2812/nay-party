# ROUND 36 — "biến mất rồi xuất hiện" + kiểm nút bấm thật (2026-11-28)

Build 11ccb08a99, deployment 786d0ddbaacc4eb9a3a2854d99abd807, live sha256 ada9caa0… (byte-identical với rig).

## 1) Vụ "đẩy ra / ăn cái gì đó thì biến mất rồi xuất hiện"

Đo bằng rig mới `rig-vanish.mjs` / `rig-vanish2.mjs` / `rig-vanish3.mjs` (ghi từng khung hình + dòng thời gian phase/DOM) trên cả 3 mặt:

- Tại chỗ (bot đấu nhau): DOM đủ cả 7 nhân vật suốt ván, qua mọi lần loại; chỉ rỗng khi sang màn kết quả (đúng).
- Đường máy chủ (có người chơi từ xa, local tắt): tương tự, đủ suốt ván.
- Nhân vật của chính người chơi tự lái bằng bàn phím giữa đám xô đẩy (`rig-shove.mjs`): lệch hình/so với mô phỏng tối đa 3,1u đúng 1 khung tại khoảnh khắc hồi sinh; không mất, không văng khỏi sân.

Kết luận: KHÔNG có vật nào tự mất giữa ván trong bản hiện tại. Cái người chơi thấy là hai sự kiện của game hiện lên quá đột ngột như lỗi: (a) bị đẩy ra khỏi vòng → nhân vật biến mất ở mép sân rồi hiện ngay ở giữa (hồi sinh dịch chuyển tức thời, không một dấu hiệu); (b) sao trong Cướp Sao bị người khác ăn → biến mất không một phản hồi tại điểm ăn (tia lửa khi nộp sao đã bị luật tắt hiệu ứng thừa tắt trong lúc chơi).

Sửa (đúng luật tắt hiệu ứng: chỉ class có sẵn, không tạo node mới khi đang chơi):

- `fxPop(node)` trong src/page.mjs: mọi dịch chuyển tức thời (cả hai nhánh teleport của moveEl — nhánh neo >3u và nhánh dự đoán >2,5u) nay cho nhân vật HÌNH THÀNH dần tại chỗ mới bằng animation spawnPop (vốn được giữ chạy trong perf mode đúng cho việc này), throttle 400ms/node.
- arenaFX (Cướp Sao): sao rời sân = đã bị ăn → `fxFlash` chớp sáng người ăn (ghế gần vị trí sao nhất trong 2,2u) — kênh class duy nhất được phép trong lúc chơi.
- Đo lại bằng `rig-fxprobe.mjs` (đếm lời gọi): Đẩy Ra 35s → pop 25 lần, flash 11; Cướp Sao 35s → flash ăn sao 47 lần, pop 17.

## 2) Kiểm nút điều khiển "thực sự hoạt động chưa"

- `rig-phone-audit.mjs` (nhãn/cụm nút/padState/sân mini/panel): 21/21 OK, failures 0.
- Rig mới `rig-buttons-fx.mjs`: bấm nút THẬT trên trang điện thoại rồi đọc trạng thái ENGINE qua API — 16 game pad/chạm: giữ đĩa → nhân vật di chuyển +2,0..3,6u; Xe Tăng/Thủ Thành bấm A → đạn xuất hiện; Đặt Bom A → bom xuất hiện; Căn Góc A → đạn bay; Đua Máy Bay giữ A → boost tụt còn 76; Chèo Thuyền chạm → ghi nhận; các nút nhảy đo Δy thật.

Lần chạy đầu: 4 lỗi — 3 lỗi do rig đọc sai chỗ chứa (Né Laze nhảy là cờ `air` chứ y không đổi; Đền Lửa & Nước nhân vật ở `g.chars`; Chung Một Thân di chuyển ở `g.shared`). Nhưng lỗi thứ 4 (Ếch Ộp) dẫn tới một LỖI THẬT ở engine, chứng minh bằng probe tầng engine (`/tmp/edge-probe.mjs`, đồng hồ giả):

**Bấm nút nhanh (nhấn–nhả trọn trong một tick 62,5ms) bị nuốt hoàn toàn.** Ý định nhảy đọc cạnh lên của pad so với padPrev; nếu nhấn và nhả đều nằm giữa hai tick, tick sau chỉ thấy pad đã nhả → cạnh lên không tồn tại. Số đo trước sửa: temple/dodge/frog bấm nhanh = 0,00 so với bấm giữ = 3,15 / 10 tick / 3,15. Trên đường máy chủ (tin WebSocket xử lý giữa hai tick alarm) và cả tại chỗ, cú chạm nhanh của người thật đều có thể rơi trọn vào khe này — bấm mà như không bấm.

Sửa (src/engine2.mjs): CHỐT CẠNH (edge latch) — handler pad ghi `g.padPhys` (trạng thái vật lý mới nhất) và chốt mọi cạnh lên của u/a/b/x/y vào `g.padEdge`; `advance()` gọi `padEdgeApply` trước mỗi step (nâng lại bit đã chốt nếu nút đã nhả) và `padEdgeConsume` sau step chạy được đầu tiên (trả bit về trạng thái vật lý, xoá chốt). step() chỉ được gọi từ advance() nên đây là điểm chặn duy nhất, áp dụng cho cả máy chủ lẫn engine trong trang (chế độ tại chỗ). Sau sửa, probe: bấm nhanh = bấm giữ ở cả 3 game (3,15 / 10 / 3,15). Discrim giữ nguyên (vật lý không đổi — temple run 5,200 PASS).

Chạy lại buttons-fx sau sửa + sửa rig: **16/16 OK, fails=0** (nhảy: Né Laze air ✓, Đền Δy 0,84, Ếch Δy 0,84, Người Que 1,04, Đá Bóng 0,93; Chung Một Thân +1,52u theo trục ghế 1 sở hữu).

## Hồi quy

local-test 699, deep-drive 504/0, discrim PASS, laser 21/21, chess 21/21, hostile 105/0, rig-local-all FLAGGED 0, script trong trang trích ra `node --check` OK. Probe trực tiếp trên link thật: phòng 420224, quickStart xe-tank → playing/countdown ✓.

## Còn chờ

Cảm giác trên máy của người dùng vẫn là phán quyết cuối — đặc biệt: hồi sinh ở Đẩy Ra giờ có đọc như sự kiện game thay vì lỗi không, và các cú chạm nhanh (nhảy/đặt bom/bắn) có còn bị mất nhịp nào không.
