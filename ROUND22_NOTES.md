# ROUND 22 — SINGLE CLOCK: gộp vòng lặp tại chỗ về một nhịp

User 25/11 19:22–19:24 (Asia/Bangkok): sau Round 21 FLAT đã lên link thật,
vẫn "giật lắm nhé", màn hình hiện "TẠI CHỖ — không qua mạng" mà vẫn giật.
Bệnh nằm ngay trong vòng lặp tại chỗ trên máy họ, không phải mạng.
Main agent 19:24 hứa ba việc; kiểm lúc 19:36 cho thấy chưa có gì được làm
(/api/version vẫn b1873ed9ea, HEAD vẫn 52771c4). Đợt này làm đúng ba việc đó.

## Vấn đề (đo/kiểm trong mã nguồn thật, src/page.mjs)

1. Hai đồng hồ đánh nhau: `L.timer = setInterval(localTick, 31)` — localTick
   advance engine + localApply (render + patchPositions), trong khi rafLoop
   chạy riêng theo requestAnimationFrame và nội suy vị trí theo đồng hồ vẽ.
   Máy bận là hai nhịp lệch/dồn cục → hình giật dù fps trung bình vẫn 60.
2. Chế độ nhẹ tự bật/tắt giữa ván: rafLoop, cửa sổ 50 khung — trung bình
   >23ms hoặc ≥8 khung chậm hoặc một block >120ms thì thêm class body.lite,
   hồi sau 3 cửa sổ tốt thì gỡ ra. Mỗi lần bật/tắt trình duyệt tính lại toàn
   bộ giao diện, tự gây một cú khựng. Hình phẳng Round 21 đã gỡ lớp nặng ở
   mọi nơi nên cơ chế này thừa.
3. Việc nền vẫn chạy trong lúc chơi tại chỗ: poll 800ms, tick 150ms
   (watchdog/wsWatchdog/engLoad/versionCheck), bơm tick qua WebSocket 30ms,
   và khoảng 120ms gọi poll() khi socket cũ. Bơm 30ms kiểm tra
   `S.view.phase === 'playing'`, mà S.view là view máy chủ vẫn ở trạng thái
   playing trong ván tại chỗ, nên nó vẫn đẩy vòng lặp máy chủ trong khi chơi
   tại chỗ.

Đã loại trừ: localApply KHÔNG xoá S.sig (bản sửa Round 20.3 vẫn còn nguyên).

## Đã làm (chỉ src/page.mjs, KHÔNG đụng luật chơi/vị trí/kích thước/tick/điểm)

1. Một nhịp duy nhất: bỏ timer 31ms (chỉ giữ lại làm fallback cho trình
   duyệt không có requestAnimationFrame). `localTick()` giờ được gọi từ
   rafLoop, một lần mỗi khung hình. An toàn vì `advance()` là time-based
   (tick chỉ nổ khi tới `nextTickAt`, có catch-up tối đa 8 tick rồi resync)
   nên step theo khung hình không đổi tốc độ game. Tab ẩn thì rAF dừng và
   ván dừng theo — khi quay lại advance catch-up thay vì hỏng trạng thái.
2. Bỏ hẳn cơ chế tự bật/tắt body.lite giữa ván. Cửa sổ 50 khung giờ chỉ
   còn nuôi fps trung bình (đồng hồ) và log khựng (S._hitch, dòng "khựng N"
   trên đồng hồ). CSS body.lite giữ nguyên, không dùng nữa. Hậu tố "· LITE"
   gỡ khỏi đồng hồ.
3. Chặn việc nền khi `S.localActive`: poll() return ngay; tick() bỏ qua
   watchdog/wsWatchdog/engLoad/versionCheck, cứu stall bằng ws 'tick' và
   ping — đồng hồ, đếm ngược, thanh thời gian vẫn chạy (UI tại chỗ, người
   dùng đang đọc); bơm tick 30ms return ngay (khoảng 120ms gọi poll() thành
   no-op nhờ chốt poll()).
   - Bẫy đã tránh: watchdog reload trang khi `S.lastOkAt` cũ >8s, mà khi
     chặn poll thì không còn ai gọi noteOk() nữa. localTick giờ tự đóng dấu
     `S.lastOkAt = Date.now()` mỗi khung — engine tại chỗ chạy tức trang
     còn sống, watchdog không được reload giữa ván tại chỗ khi mạng chết.

## Kiểm chứng (25/11, local)

- node build.mjs OK (engine hash 349988a5ab — engine không đổi, đúng như
  thiết kế); node --check worker.mjs OK. PAGE_V mới: 0c8958f00d (cũ b1873ed9ea).
- tests/local-test.mjs: ALL TESTS PASSED — 803 assertions.
- tests/deep-drive.mjs: 630 checks, 0 failures.
- tests/discrim-check.mjs: PASS.
- Rig khựng cục bộ mới (/tmp/round22-rig.mjs, dùng đúng engine bundle trong
  worker.mjs, ván day-ra thật 95s, RNG gieo hạt giống): so sánh 3 nhịp gọi
  advance() — timer 31ms cũ, rAF 16,7ms đều, rAF + block 200–300ms mỗi
  ~2,5s. Kết quả: kết quả cuối ván GIỐNG HỆT nhau cả 3 nhịp; giữa ván
  |Δtick| ≤ 1, |ΔendsAt| ≤ 1ms, vị trí blob lệch ≤ 1 bước — trừ đúng 1 giây
  (t=23s) nhân vật đứng yên ở mép sân rơi khỏi sàn lệch nhau 1 tick (lives
  3 so với 2 tại đúng thời điểm chụp, sau đó hội tụ về cùng kết quả cuối).
  Lệch này có giới hạn, không tích lũy, và timer 31ms cũ trong trình duyệt
  thật vốn đã jitter hơn thế — đây là phương sai vốn có của game, không
  phải lỗi do gộp nhịp.
- Thay đổi: src/page.mjs + worker.mjs + ROUND22_NOTES.md.

## Còn lại (cho delivery / main agent — CHƯA xong hẳn)

1. Deploy lên link thật, đối chiếu /api/version = 0c8958f00d.
2. Đo fps + đếm khung đứng hình trên hồ sơ máy yếu (SwiftShader + throttle
   4×) + rig khựng cục bộ TRÊN TRÌNH DUYỆT THẬT cho 25 game — rig node ở
   trên chỉ chứng minh luật chơi không đổi theo nhịp gọi, không đo được
   hình vẽ thật. KHÔNG báo người dùng là hết lag cho tới khi số đo này giữ
   vững; chốt cuối vẫn là cảm giác chơi trên máy họ.
3. Tab đang mở từ trước tự tải lại bản mới giữa hai ván (versionCheck có sẵn).
