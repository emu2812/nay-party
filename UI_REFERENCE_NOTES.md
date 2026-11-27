# Ghi chú tham khảo UI — Nảy Party học gì từ các game party lớn

Nghiên cứu 27/11/2026. Mục tiêu: dễ nhìn, hợp lý trên màn hình lớn dùng chung,
giữ đồ họa phẳng, không hiệu ứng, ưu tiên hiệu năng. Mọi số liệu đều có nguồn
ở cuối; số nào là *suy ra* (áp dụng quy tắc nguồn vào cỡ màn hình 1080p của
Nảy Party) sẽ ghi rõ.

---

## 1. Các nguồn tham khảo làm gì

### Bloop Party (bloopparty.com) — đối thủ trực tiếp, cùng mô hình TV + điện thoại
- Chỉ **4 màu người chơi**: blue, pink, green, purple — ít màu nhưng không bao
  giờ nhầm. Nhân vật là blob tròn một màu đặc, mắt đơn giản.
- Thẻ game ở sảnh: **ảnh chụp gameplay thật + tên + số người chơi + 1 dòng luật
  + ghi rõ phím điều khiển** của game đó (ví dụ "D-PAD: đi · B BUTTON: đặt bom").
  Người chơi biết cách chơi ngay từ thẻ, chưa cần vào game.
- Ván ngắn, rematch nhanh, có bảng xếp hạng xuyên suốt buổi chơi ("party").

### Kahoot — chuẩn mực về nhận diện bằng màu + hình
- 4 đáp án = **4 cặp màu + hình không bao giờ đổi**: đỏ–tam giác `#E21B3C`,
  xanh dương–thoi `#1368CE`, vàng–tròn `#D89E00`, xanh lá–vuông `#26890C`.
  Màu luôn đi kèm hình dạng → người mù màu vẫn chơi được (nguồn học thuật và
  tài liệu hỗ trợ Kahoot đều nhấn mạnh điểm này).
- Ô đáp án khổng lồ: 4 ô chiếm khoảng **50% chiều cao màn hình**. Câu hỏi chỉ
  ở màn hình lớn; điện thoại chỉ hiện 4 nút hình — mắt người chơi chỉ việc
  đối chiếu hình/màu, không đọc chữ nhỏ.
- Chữ trắng đậm trên nền màu bão hòa; cuối buổi có podium top 3.

### Agar.io — arena đông người, nhận diện ở tốc độ cao
- Tên người chơi viết **chữ trắng đậm, nằm giữa avatar**, số điểm/khối lượng
  ngay dưới tên. Avatar là hình tròn màu đặc có viền.
- **Leaderboard top 10 cố định góc phải trên; điểm của mình ở góc trái dưới.**
  HUD không bao giờ đè lên vùng chơi chính.
- Nền là **lưới rất nhạt** trên nền sáng (hoặc theme tối): nền chỉ làm mốc
  vị trí, mọi vật thể chơi được đều bão hòa và nổi hơn nền rõ rệt.
- Game còn có sẵn tùy chọn tắt tên/tắt màu — bằng chứng là nhãn và màu là
  hai kênh nhận diện độc lập.

### Slither.io — arena nền tối
- Nền tối xám + họa tiết hexagon **rất mờ**; rắn màu bão hòa sáng nổi bật.
  Đôi mắt googly trên đầu rắn = chỉ hướng di chuyển mà không tốn chữ.
- Leaderboard góc phải trên, thông số của mình (độ dài, hạng) chữ nhỏ góc
  trái dưới. Avatar của mình luôn ở trung tâm khung hình.

### Jackbox Party Packs — màn hình lớn là trung tâm
- Mọi thông tin quan trọng (câu hỏi, đáp án, điểm, mã phòng) nằm trên màn
  hình lớn với chữ rất to, đậm; điện thoại chỉ là tay cầm "câm".
- Hình ảnh sáng, tương phản mạnh nhưng không rối; hướng dẫn chơi hiện ngay
  trên màn hình lớn, không bắt người chơi tự tìm.

### skribbl.io & Gartic Phone — bố cục 3 vùng không đổi
- skribbl.io: giao diện "không bừa bộn" gồm đúng 3 khối — danh sách người
  chơi (avatar + điểm) bên trái, sân vẽ ở giữa, chat bên phải; thanh thời
  gian ở mép trên.
- Gartic Phone (sảnh): panel người chơi bên trái ghi rõ "PLAYERS 1/14" kèm
  ô trống cho từng ghế; thẻ chế độ chơi dạng lưới (icon + tên), thẻ đang
  chọn có **viền màu dày**; hai nút INVITE và START rất lớn ở dưới.

### Poki & CrazyGames — chuẩn trình bày sảnh chọn game
- Poki: thumbnail tỉ lệ **1:1**, tối thiểu chữ, phải cho thấy gameplay thật;
  người chơi quyết định trong vài giây đầu nên thẻ phải tự nói lên game.
- Bài học từ Cyber Gomoku (CrazyGames): thumbnail tốt = **tên game đọc được
  ở cỡ thẻ nhỏ + nhìn phát hiểu thể loại + thấy được điểm khác biệt**,
  không cần hào nhoáng.
- CrazyGames (quality guidelines): onboarding ưu tiên hình ảnh, hạn chế chữ,
  hiện cách điều khiển bằng hình phủ lên game, nút bấm ghi nhãn rõ ràng.

### Chuẩn 10-foot UI (tvOS / Android TV / tài liệu signage)
- Chữ thân (body) tối thiểu **29pt trên tvOS**; thực hành ở 1080p: chữ chính
  **≥ 34–36px**, chữ phụ **≥ 28–30px**, tiêu đề **≥ 48px**.
- Quy tắc signage: **1 inch chiều cao chữ cho mỗi 10 feet (~3 m)** khoảng
  cách xem — ở 12 feet trên TV 1080p 55" nghĩa là ~65–70px cho chữ quan trọng
  nhất.
- Tương phản chữ/nền **≥ 4.5:1** (chữ thường), **≥ 3:1** (chữ lớn) theo WCAG AA.
- **Vùng an toàn 5%** mỗi cạnh (overscan TV); tránh font nét mảnh và viền
  hairline — tối thiểu weight medium/semibold; nội dung sáng trên nền tối
  dễ đọc hơn trên TV.

### Telegraph — cảnh báo nguy hiểm (design pattern đã chuẩn hóa)
- Đòn đánh phải có "tell" trước khi trúng: cửa sổ phản ứng tối thiểu
  **~0.45 giây** cho đòn thường; đòn nặng **1–1.5 giây** (quá 2 giây người
  chơi chuyển sang đếm nhịp thay vì phản xạ).
- Vùng nguy hiểm vẽ trên mặt đất phải **khớp đúng vùng trúng đòn** (chuẩn
  FFXIV: vùng cam sáng trên sàn), và độ sáng của tín hiệu nguy hiểm chỉ
  thua avatar — là thứ nổi bật thứ hai trên màn hình.
- **Không dùng màu làm kênh duy nhất**: thêm hình dạng, hoa văn, chuyển
  động/nhấp nháy; đòn lớn dùng ≥ 2 kênh (hình + tiếng).

### Nhận diện người chơi bằng màu (nghiên cứu mù màu)
- Nguyên tắc vàng: **màu + hình/ký hiệu, luôn luôn**; kênh phụ có thể là
  nhãn tên, số ghế, hoa văn viền (đặc / đứt / chấm).
- **Độ sáng (light/dark) là kênh phân biệt an toàn nhất** — sống sót qua
  mọi dạng mù màu. Cặp dễ sụp nhất: đỏ–xanh lá, xanh lá–nâu, xanh
  dương–tím, vàng–xanh lá nhạt *khi cùng độ sáng*.
- Thực tế chỉ có khoảng **8 màu phân biệt tin cậy bằng màu đơn thuần**;
  quá 8 người thì kênh phụ (số/tên/hình) là bắt buộc, không phải tùy chọn.

---

## 2. Quy tắc áp dụng cho Nảy Party (xếp theo ưu tiên)

### P0 — Nhận diện người chơi trong sân (8–12 người)
1. **Avatar giữ đường kính ≥ 5% chiều cao màn hình** (~54px ở 1080p), game
   hành động nên ở mức 6–8% (~65–80px). Đây là *suy ra* từ tỉ lệ avatar/sân
   của Bloop và Slither cộng quy tắc chữ 10-foot. Avatar nhỏ hơn ngưỡng này
   là mất hút khi 12 người cùng chạy.
2. **Mỗi người chơi có 3 kênh nhận diện cùng lúc**: (a) màu đặc riêng,
   (b) nhãn tên ngay dưới avatar — chữ trắng đậm trên chip nền tối đặc
   (không bóng, không trong suốt mờ), (c) số ghế hoặc chữ cái đầu tên in
   trên avatar như cách Agar.io để tên giữa cell. Chỉ màu là không đủ
   ở 12 người.
3. **Bảng 12 màu phải xen kẽ bậc sáng tối** (sáng–tối–sáng–tối…) thay vì
   12 màu cùng độ sáng khác hue; tránh đặt cạnh nhau các cặp đỏ/xanh lá,
   xanh dương/tím, vàng/xanh lá nhạt cùng độ sáng. Trục xanh dương–cam
   là trục an toàn nhất cho hai phe đối đầu.
4. Avatar có **viền đặc dày 3–4px** màu đối nghịch nền (trắng hoặc đen tùy
   nền sân) — viền là thứ giữ avatar tách khỏi nền khi đang chạy nhanh,
   rẻ hơn mọi hiệu ứng phát sáng.

### P0 — Chữ trên màn hình lớn
5. Cỡ chữ tối thiểu khi đang chơi (ở 1080p): **điểm số/timer ≥ 34px, nhãn
   phụ ≥ 28px, thông báo lớn (tên game, đếm ngược, "BẮN!") ≥ 48px**.
   Không có chữ nào trong lúc chơi nhỏ hơn 24px.
6. Font sans **đậm (weight ≥ 700), bo tròn** kiểu Montserrat Bold / Baloo 2
   (Baloo 2 hỗ trợ đầy đủ dấu tiếng Việt); cấm weight mảnh và chữ có chân
   cho HUD. Tương phản chữ/nền ≥ 4.5:1.
7. Mọi nội dung quan trọng nằm trong **vùng an toàn 5%** tính từ mép màn hình.

### P1 — HUD & sân đấu
8. Bố cục HUD cố định mọi game, học Agar.io/Slither.io: **bảng điểm góc
   phải trên, trạng thái của người đang cầm tay cầm/góc nhìn chính ở trái
   dưới, timer ở mép trên giữa**. Người chơi học một lần, dùng cho cả 25 game.
9. **Nền sân phẳng một màu, độ bão hòa và độ sáng cách xa mọi màu người
   chơi.** Nếu cần mốc vị trí thì dùng lưới/hoa văn phẳng tương phản rất
   thấp (kiểu lưới Agar.io, hexagon Slither) — chỉ là mốc, không phải trang
   trí. Ranh giới sân = **viền đặc dày ≥ 4px** màu tương phản cao, không
   phát sáng.
10. Vật thể nguy hiểm và vật phẩm phải là những thứ **sáng/bão hòa nhất
    trên sân sau avatar**; không có chi tiết nền nào được nổi hơn chúng.

### P1 — Cảnh báo nguy hiểm (Né Laze, Đặt Bom, Đại Bác…)
11. Mọi nguy hiểm đều báo trước: **tối thiểu 0.45 giây**, đòn diện rộng/
    chí mạng **0.75–1.5 giây** (khớp nhịp laze hiện tại: warn 12 tick
    ≈ 0.75s là đúng chuẩn).
12. Vùng báo trước phải **khớp đúng vùng trúng đòn** và phân biệt loại
    nguy hiểm bằng **hình dạng/mẫu** (đặc, sọc, nhấp nháy) chứ không chỉ
    màu — đúng bài học Kahoot (màu + hình) áp dụng cho telegraph.
13. Đòn lớn thêm **một tiếng cue riêng** lúc bắt đầu báo trước (kênh thứ
    hai, không tốn hiệu năng hình ảnh).

### P2 — Sảnh & chọn game
14. Thẻ game theo mẫu Bloop + Poki: **hình sân chơi thật (vẽ phẳng) + tên
    game cỡ đọc được khi thẻ nhỏ + 1 dòng luật + số người chơi + phím
    điều khiển chính**. Không dùng ảnh trang trí không liên quan gameplay.
15. Danh sách người chơi trong sảnh theo mẫu Gartic: panel riêng ghi
    "NGƯỜI CHƠI x/12", mỗi ghế một ô có màu + tên; ghế trống hiện ô trống
    rõ ràng. Nút chính (Vào chơi/Bắt đầu) là phần tử to nhất màn hình.
16. Game đố vui (Đố Vui): ô đáp án phải **to và ít chữ** như Kahoot — đáp
    án chiếm phần lớn chiều cao vùng chơi, chữ đáp án ≥ 34px, mỗi đáp án
    gắn cặp màu + hình cố định không đổi giữa các câu.

---

## 3. KHÔNG sao chép — đẹp nhưng tốn hiệu năng / hại độ rõ

- **Gradient nền** (Kahoot dùng nền tím gradient tỏa tròn, Gartic nền xanh
  gradient): tốn repaint, giảm tương phản chữ. Nảy Party giữ nền đặc.
- **Phát sáng (glow)**: tia boost của Slither phát sáng, pellet phát sáng,
  hiệu ứng neon của Jackbox — glow = blur = kẻ thù của máy yếu. Thay bằng
  viền đặc và độ tương phản.
- **Bóng đổ & đổ bóng chữ**: toàn bộ các trang tham khảo đều dùng; Nảy Party
  đã loại — giữ nguyên quyết định đó, dùng chip nền đặc thay cho bóng chữ.
- **Thumbnail động/video hover** ở sảnh (Poki bắt buộc với đối tác): nặng
  máy và vô nghĩa trên TV không có chuột. Dùng hình tĩnh vẽ phẳng.
- **Skin/ảnh tùy biến trên avatar** (Agar.io cho gắn ảnh, quốc kỳ): phá vỡ
  hệ màu nhận diện và tốn tải/vẽ. Avatar giữ màu đặc + nhãn.
- **Hiệu ứng ăn mừng dày đặc** (confetti, pháo giấy của Kahoot/Jackbox,
  parallax của tvOS): chỉ nên dùng ở màn hình kết quả nếu có, và ở mức
  tối thiểu; tuyệt đối không trong lúc chơi.
- **Nền sân nhiều chi tiết** (sân chủ đề, họa tiết dày): nền càng bận,
  avatar càng chìm. Nền phẳng + hoa văn mốc vị trí tương phản thấp là đủ.

---

## 4. Nguồn

- Bloop Party — https://bloopparty.com
- Chuẩn 10-foot UI (số cỡ chữ, safe area, focus) — https://www.uiuxatlas.com/lessons/responsive/tv-and-10-foot-ui-design/
- tvOS design guidelines (body ≥ 29pt, tương phản WCAG) — https://lobehub.com/skills/dirnbauer-webconsulting-skills-tvos-design
- Quy tắc 1 inch / 10 feet cho màn hình xa — https://www.signstream.net/post/font-size-for-tv-menus
- Smart TV UI (đọc được ở 3–3.5 m, chữ tối thiểu) — https://www.purrweb.com/blog/how-to-design-an-app-for-smart-tvs/
- Poki, trang game & thumbnail — https://developers.poki.com/guide/your-game-page
- CrazyGames, quality guidelines — https://docs.crazygames.com/requirements/quality/
- Cyber Gomoku, bài học thumbnail trên CrazyGames — https://www.cybergomoku.com/en/articles/crazygames-metrics-improvements
- Good practices for web games (Poki) — https://defold.com/2026/11/03/Good-practices-for-web-games-on-Poki/
- Kahoot, màu + hình các nút đáp án — https://logs.emma-live.com/post/kahoot-j3tcks0z4
- Kahoot, mã màu đáp án (#E21B3C / #1368CE / #D89E00 / #26890C) — https://github.com/dshahrasebi/romeu_quiz/blob/HEAD/SPEC_KIT_PROMPTS.md
- Slither.io, phân tích thiết kế hình ảnh — https://mechanicsofmagic.com/2022/04/24/visual-design-of-games-62/
- Agar.io, cách chơi (leaderboard, điểm, tên trên cell) — https://topic.alibabacloud.com/a/agario-how-to-play_8_8_31308962.html
- Agar.io, bố cục giao diện — https://ozgames.io/agario
- skribbl.io & Gartic Phone — https://ottersplay.com/drawing-party-games/
- Telegraphs, cửa sổ phản ứng ~0.45s — https://hayao.dev/docs/codex/system-telegraphs
- Telegraphed attacks (wind-up 1–1.5s, vùng nguy hiểm khớp vùng trúng) — https://aigamedev.ai/tutorials/telegraphed-attacks-in-games/
- Telegraph không phụ thuộc màu — https://allofalpha.com/static/downloads/alphalibrary/rnlmjiOb0mPaNf4cKjWTyA.pdf
- Màu người chơi & mù màu (màu + hình, độ sáng là kênh an toàn nhất) — https://hexy.studio/tools/color/
- Trạng thái không chỉ bằng màu — https://bugnet.io/blog/how-to-fix-color-only-status-indicators-unreadable-colorblind
