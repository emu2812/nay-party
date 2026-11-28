# ROUND 37 — đẩy nhẹ một phát là biến mất rồi quay lại, cảm giác khực (2026-11-28)

Build 36cc83b770, deployment 58a3b641f8844e1394247e6fbac02558, live sha256 a9b8b76b… (byte-identical với rig).

## Người dùng báo lại sau Round 36

"cứ bị kiểu đẩy nhẹ 1 phát là biến mất xong lại quay lại làm sao đừng có cảm giác khực như thế" — không phải hồi sinh (đẩy NHẸ, chưa ra khỏi vòng) mà là cú hất thường: nạn nhân biến mất rồi hiện lại, kèm một cái khực.

## Đo ở tầng engine (probe đồng hồ giả, bot Khó đấu nhau)

Một cú hất làm nạn nhân dịch 2,5–6,2u trong MỘT tick và đến nơi VẪN ĐANG BAY (|v| > 0,5u/tick):
- Đẩy Ra, 1 ván: 99 lần nhảy vị trí >2,5u/tick — 89 lần là hất (nóng), chỉ 10 lần là hồi sinh thật (đến nơi đứng yên, |v| = 0, nhảy 2,9–7,4u).
- Cướp Sao, 1 ván: 56 lần nhảy lớn — 56/56 là hất, tầm 3,2–6,2u.

Ngưỡng snap cũ của moveEl là phẳng 3u (nhánh neo) và 2,5u (nhánh dự đoán) → gần như MỌI cú hất đều bị coi là "dịch chuyển tức thời": renderer bỏ nội suy, đặt nhân vật ngay sang điểm mới (và từ Round 36 còn kèm animation hiện hình mờ dần — càng giống "biến mất"). Đó chính là biến mất + quay lại + khực, ở ngay cú đẩy nhẹ.

Đo ở tầng vẽ (rig-glitch, bản Round 36, 30s): Cướp Sao 6 lần hình nhảy >4u trong một khung hình (game này không có hồi sinh nhân vật — toàn bộ là snap oan); Đẩy Ra 3 lần, max 8,2u.

## Sửa (src/page.mjs, chỉ tầng vẽ)

`isTeleportJump(jump, vx, vy)`: một cú nhảy lớn chỉ là dịch chuyển thật khi (a) đến nơi ĐỨNG YÊN (|v| ≤ 0,5u/tick — hồi sinh, đặt lại bóng sau bàn thắng), hoặc (b) nhảy >8u (ngoài tầm mọi cú hất). Áp cho cả hai nhánh snap của moveEl. Nạn nhân bị hất còn đang bay thì rơi xuống nhánh corr như chuyển động thường: trượt theo đoạn neo mới + lò xo 85ms hấp thụ phần lệch — bay liên tục, không mất hình, không khực. fxPop (hiện hình dần) từ nay chỉ còn chạy cho dịch chuyển thật.

## Đo lại sau sửa

- rig-glitch: Cướp Sao teleports **0** (trước: 6, max 6,5u). Đẩy Ra còn 2 lần max 5,8u — khớp tầm nhảy hồi sinh lạnh đã đo ở engine (2,9–7,4u), tức snap đúng chỗ.
- rig-fxprobe: Đẩy Ra pop 25 → **10** lần/35s (chỉ còn hồi sinh); Cướp Sao pop 17 → **0** (game không có hồi sinh nhân vật), flash ăn sao vẫn 65 lần.
- rig-shove (nhân vật của chính người chơi tự lái giữa đám xô đẩy, 3604 khung): lệch tối đa so với mô phỏng 3,10u → **1,75u**, 0 đoạn mất/mờ/văng — đường dự đoán cũng bám sát hơn vì lò xo hấp thụ cú hất thay vì snap quá đà.
- Hồi quy: local-test 700, deep-drive 505/0, discrim PASS, hostile 105/0, script trong trang trích ra node --check OK. Probe link thật: phòng 837805 quickStart xe-tank → playing/countdown ✓.

## Còn chờ

Cảm giác trên máy của người dùng là phán quyết cuối: cú đẩy giờ phải thấy nhân vật BAY đi liên tục thay vì mất–hiện–khực.
