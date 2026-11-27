# Ghi chú tham khảo BỐ CỤC (layout) — Nảy Party học gì từ các trang game lớn

Nghiên cứu 27/11/2026 — phần 2, bổ sung cho UI_REFERENCE_NOTES.md (phần 1 lo
"đọc được", phần này lo "SẮP XẾP": lưới danh mục, sảnh chờ, màn hình kết quả).
Ràng buộc giữ nguyên: phẳng, nhẹ, không gradient/bóng/glow/chuyển động;
một màn hình lớn dùng chung; host thao tác bằng chuột/phím từ ghế sofa;
25 game, 2 nhóm (đấu / hợp tác), phòng tối đa 12 người.

---

## 1. Các nguồn tham khảo SẮP XẾP như thế nào

### Poki (poki.com) — lưới ô vuông, một dòng chảy duy nhất
- Ô game **vuông 1:1** (chuẩn nhà phát triển của chính Poki: thumbnail
  1080×1080, tỉ lệ 1:1) — mọi ô bằng nhau, mắt quét theo vị trí chứ
  không đọc từng ô.
- Trang chủ là **một lưới feed liên tục**, phía trên cùng là khu
  "Popular this week" (đang thịnh hành) rồi mới tới lưới lớn; có cả
  danh sách "Top 5 trending" theo số liệu chơi thật.
- Danh mục (2 Player, Car, Shooting, Multiplayer, .io, Puzzle…) nằm
  thành các mục riêng phía dưới; nghiên cứu UX của chính Poki kết
  luận phải **chia feed thành các section có tên + icon**, vì để danh
  mục chìm dưới fold là lỗi khám phá số một của họ.
- Thanh tìm kiếm cố định ở đầu trang (cần cho 1.500 game; catalog nhỏ
  thì không cần — xem mục 2).
- Nguồn: https://www.poki.com · https://developers.poki.com/guide/your-game-page
  · https://www.christiangravemaker.com/poki

### CrazyGames (crazygames.com) — thanh điều hướng trái + hàng theo chủ đề
- Bố cục hai cột cố định: **thanh bên trái chạy suốt chiều cao** chứa
  danh sách danh mục (Action, Driving, Puzzle, .io, 2 Player…), đầu
  trang là thanh ngang mỏng có ô tìm kiếm; phần lớn diện tích còn lại
  dành cho lưới hình game.
- Trang chủ xếp theo **hàng có tiêu đề**: Featured (nổi bật), New
  (mới), Trending (thịnh hành), Popular (chơi nhiều) và một hàng
  "Recently played" (vừa chơi) cá nhân hóa. Mỗi game = hình ngang +
  tên ngay dưới hình, không nhồi chữ lên thẻ.
- Nguồn: https://www.crazygames.com · https://busyplayer.com/browser-games/free-online-games-on-crazygames-play-now
  · http://paulkinlan.github.io/state-of-the-web/sites/0785-www_crazygames_com.html

### Bloop Party (bloopparty.com) — thẻ game có cấu trúc cố định từng dòng
- Danh mục 81 game là **một lưới thẻ đồng nhất**, thứ tự nội dung
  trong MỌI thẻ không đổi:
  1) hình chụp gameplay, 2) tên game, 3) dòng meta
  "2–4 players · co-op", 4) MỘT dòng luật kèm điều kiện thắng,
  5) danh sách phím điều khiển (D-PAD…, B BUTTON…).
- Không chia section theo thể loại trên trang danh mục — thể loại chỉ
  là một chữ trong dòng meta ("· co-op"). Điểm nhấn xuyên suốt buổi
  chơi là **bảng xếp hạng tổng** ("play a party of several games…
  climb the leaderboard") chứ không phải từng ván rời rạc.
- Nguồn: https://bloopparty.com (trang "All 81 Bloop Party games")

### Jackbox Party Packs — menu console 2 cột + sảnh mã phòng cực lớn
- Menu chọn game trong pack (ảnh chụp Party Pack 8): **lưới 2 cột ×
  nhiều hàng**, mỗi ô là hình bìa lớn + logo game, góc phải trên của
  ô có icon trái tim đánh dấu yêu thích. Ít game (5–8) nên ô rất to —
  chọn bằng tay cầm từ xa vẫn trúng.
- Sảnh chờ (You Don't Know Jack): dòng hướng dẫn "go to Jackbox.tv
  to join" ở **trên cùng**; **mã phòng là phần tử lớn nhất màn hình**,
  đặt giữa; **danh sách người chơi ở cột phải** đánh số 1–8 — ghế đã
  có người hiện tên, ghế trống vẫn hiện số thứ tự của nó; chỉ dẫn bắt
  đầu ("PRESS Everybody's In to Start") ở góc phải trên, nút Back ở
  góc trái trên. Mọi thứ khác trên màn hình đều phụ.
- Nguồn: https://www.jackboxgames.com/how-to-play
  · https://www.instagram.com/p/DdbpFpfFD3I/ (menu 2 cột)
  · ảnh sảnh YDKJ: https://www.facebook.com/kelsey.cupples/posts/pfbid0DhHNr2th9PgkiV5MY1LkG6UjH8PXc4NtvRmpy8fxJWDitXksLcCqm3Y8pMWr3KEal

### Kahoot — PIN trên cùng, podium chỉ top 3, còn lại là danh sách phụ
- Sảnh: **Game PIN khổng lồ ở mép trên giữa** kèm hướng dẫn vào
  phòng; tên người chơi hiện thành các chip trong vùng giữa khi họ
  vào; nút Start của host ở góc phải trên. Giữa các câu hỏi chỉ hiện
  **bảng điểm top 5**.
- Màn hình kết quả: **podium 3 khối ở chính giữa** (số 1 ở giữa, cao
  nhất; số 2 bên trái; số 3 bên phải), tên + điểm ngay dưới mỗi
  avatar; hạng 4–5 chỉ là dòng chữ nhỏ "Runners-up" phía dưới;
  bảng đầy đủ nằm ở màn hình/báo cáo riêng, không chen vào podium.
  Nhóm nút hành động tiếp theo (Play again / Find a new kahoot /
  Podium / Session summary) gom thành **một menu riêng ở cạnh**,
  không rải quanh podium.
- Nguồn: https://www.literacymn.org/kahoot
  · https://www.facebook.com/chemisuca.toura/posts/pfbid027bzbXi282s85TheUkSrjWYJeszQGFJaHZmxMa5wDtHuBdZc3DomUs8jxzARgE3Upl (podium + runners-up)

### Steam — bìa chuẩn một tỉ lệ, hàng ngang theo chủ đề, góc chừa cho badge
- Mọi bìa game theo đúng một tỉ lệ cho từng vị trí: bìa chính
  616×353 (~16:9), bìa thư viện dạng lưới 600×900 (2:3). Trang chủ =
  carousel nổi bật trên cùng, dưới là các **hàng ngang có tiêu đề**
  (Special Offers, New & Trending, Top Sellers…).
- Góc phải dưới của bìa là **vùng cấm nội dung** — để trống cho badge
  giá/giảm giá phủ lên. Bài học: một góc cố định của thẻ dành cho
  nhãn trạng thái (ở Nảy Party: "Thiếu người", "Đã chọn liên hoàn").
- Nguồn: https://gameimageeditor.com/blog/steam-capsule-image-size
  · https://www.steampageanalyzer.com/tools/capsule-validator

### Chuẩn thẻ/lưới (nguồn thiết kế UI tổng quát)
- Thẻ có media: **rộng tối thiểu ~280px**; tiêu đề tối đa **2 dòng**
  rồi cắt; **một hành động chính duy nhất** mỗi thẻ; thứ tự vùng
  trong thẻ: hình → meta nhỏ (12–14px) → tiêu đề → dữ kiện → hành
  động; chân thẻ (footer) phải **thẳng hàng ngang** giữa các thẻ
  cùng hàng dù tiêu đề dài ngắn khác nhau.
- Lưới chảy theo bề ngang có sẵn (auto-fill minmax), khe (gutter)
  **không dưới 12px, chuẩn 16px**; lưới duyệt xem ở desktop 4–6 cột,
  lưới ra quyết định 3–4 cột.
- Nguồn: https://www.setproduct.com/blog/card-ui-design
  · https://design.abizvo.com/library/card-layout
  · https://www.alfdesigngroup.com/post/best-practices-to-design-ui-cards-for-your-website

---

## 2. Đặc tả bố cục áp dụng cho Nảy Party

### A. Lưới danh mục (màn hình chọn game trong sảnh)
- **Thứ tự section** (học Poki/CrazyGames: cái hay nhất lên trước,
  không để người chơi cuộn mới thấy):
  1. Hàng **"⭐ Hay nhất"**: 6 game chủ lực, thẻ lớn hơn (3 cột ×
     2 hàng). Đây là những game nhóm nào cũng chơi được ngay.
  2. **"🏆 Đấu với nhau"** — 18 game.
  3. **"🤝 Hợp tác"** — 7 game.
  Trong từng section, thứ tự game do mình biên tập (game nhanh, dễ
  hiểu lên đầu), không xếp theo mã id hay bảng chữ cái.
- **Lưới**: cột chảy theo bề ngang, thẻ rộng tối thiểu 300px, khe
  16px; ở 1920px (trừ lề trang 2×32px) ra **5 cột** cho lưới thường,
  hàng Hay nhất dùng thẻ rộng gấp ~1,6 lần (3 cột). Lề trang 32px,
  khoảng cách giữa các section 32px, tiêu đề section cách lưới
  16px — toàn bộ theo thang 8/16/24/32, không số lẻ.
- **Anatomy thẻ — mọi thẻ giống hệt nhau, đúng thứ tự này**:
  1. Hình sân chơi vẽ phẳng, tỉ lệ **16:9** cố định (khớp tỉ lệ sân
     thật 32×18 — hình trên thẻ chính là sân thu nhỏ).
  2. Tên game: 1 dòng, tối đa 2 dòng rồi cắt (…), cỡ 24px.
  3. Dòng meta ngay dưới tên: "2–8 người · 1 trận" (học Bloop:
     số người luôn dính với tên, không nằm ở chân thẻ).
  4. Một dòng luật (tối đa 2 dòng, cắt …).
  5. Dòng phím điều khiển **ghim ở đáy thẻ** (margin-top:auto) —
     mọi thẻ cùng hàng có dòng phím thẳng hàng nhau.
  6. Nhãn trạng thái (Thiếu X người / Đã chọn #n) luôn ở **góc
     phải trên** của thẻ — một vị trí duy nhất cho mọi trạng thái
     (học vùng badge của Steam).
  Chiều cao thẻ trong cùng một hàng phải BẰNG nhau; nội dung thừa
  thì cắt chữ, không để thẻ cao thấp lộn xộn.
- Không cần ô tìm kiếm (25 game — tìm kiếm là cho catalog nghìn
  game); thay bằng 3 chip neo nhảy section ở đầu lưới khi cuộn dài.
- Màn hình 1080p phải thấy trọn hàng Hay nhất + tiêu đề section
  Đấu ngay trong khung đầu (above the fold), không cuộn.

### B. Sảnh chờ (lobby)
- Bố cục 3 vùng cố định (học Jackbox + Kahoot):
  - **Dải trên cùng (toàn bề ngang)**: bên trái là khối MÃ PHÒNG —
    nhãn "Mã phòng" nhỏ phía trên, mã 6 số là chữ lớn nhất toàn
    màn hình (≥72px), ngay dưới là MỘT dòng hướng dẫn vào phòng.
    Bên phải dải: nút hành động chính của host + nút cài đặt phụ.
  - **Cột phải (~360px, chạy suốt chiều cao)**: danh sách ghế
    "NGƯỜI CHƠI x/12" — 12 hàng cố định, ghế có người = chip màu +
    tên + loại (Điện thoại/Phím/Máy); ghế trống vẫn hiện hàng của
    nó dạng viền đứt + chữ "Trống" + hai nút nhỏ "+ Máy" "+ Phím"
    ngay trong hàng. Người chơi nhìn một cột là biết phòng đầy
    chưa, thiếu ai — không phải đếm ô.
  - **Vùng chính (phần còn lại, ~70%)**: lưới chọn game ở mục A.
- Nút chính (bắt đầu khi đủ điều kiện / chế độ liên hoàn) nằm ở
  cuối cột phải hoặc góc phải dưới vùng chính — luôn CÙNG một chỗ
  ở mọi trạng thái phòng, là phần tử to thứ hai sau mã phòng.

### C. Màn hình trong game (giữ nguyên neo HUD đã chốt ở phần 1)
- Sân chiếm ≥ 78% chiều cao khung hình; điểm góc phải trên, timer
  mép trên giữa, hướng dẫn mép dưới giữa, tên game góc trái trên —
  đã đúng chuẩn Agar.io/Jackbox, không đổi vị trí nữa.

### D. Màn hình kết quả
- **Podium ở chính giữa, chiếm ~55% chiều cao**: 3 khối phẳng màu
  người chơi theo thứ tự thị giác 2 – 1 – 3 (số 1 giữa, cao nhất
  ~200px; số 2 ~150px; số 3 ~110px), số hạng khắc trên khối, tên +
  điểm của ván ngay dưới mỗi khối.
- Hạng 4–12: danh sách gọn **2 cột** ngay dưới podium (mỗi dòng:
  số hạng · chip màu · tên · điểm ván · tổng buổi), không dùng
  podium phụ, không bảng cuộn dài một cột.
- **Một hàng nút duy nhất ở đáy giữa**: [▶ Chơi lại] [🎲 Đổi game]
  [🏠 Về sảnh] — nút hành động chính to nhất, ba nút cùng hàng,
  cùng chỗ ở mọi game (học menu hành động gom một chỗ của Kahoot).
- Bảng tổng buổi chơi (leaderboard xuyên suốt như Bloop) là một
  khối riêng BÊN DƯỚI hàng nút hoặc tab riêng — không chen vào
  podium của ván.

### E. Hệ khoảng cách (áp cho mọi màn hình)
- Thang duy nhất: 8 / 16 / 24 / 32px. Padding trong thẻ 16px;
  padding trang 32px; khe lưới 16px; khoảng cách section 32px;
  tiêu đề section → nội dung 16px. Không dùng các số ngoài thang
  (10px, 14px, 20px…) — đó là nguồn gốc của cảm giác "lộn xộn"
  khi đặt cạnh nhau.

---

## 3. Những điểm bố cục hiện tại của Nảy Party RẤT CÓ THỂ đang sai chuẩn

(Đoán từ đối chiếu chuẩn ở mục 1 — cần kiểm chứng trên trang thật.)

1. **Không có hàng "hay nhất" lên đầu**: 25 game đang nằm phẳng
   trong 2 section Đấu/Hợp tác, thứ tự theo danh sách nội bộ —
   người chơi phải cuộn và tự mò, trong khi mọi portal đều đưa
   Popular/Featured lên khung hình đầu tiên.
2. **Thẻ game chiều cao không đều**: dòng luật và dòng phím dài
   ngắn khác nhau làm thẻ cao thấp lệch nhau theo từng hàng, chân
   thẻ (dòng số người/điểm) không thẳng hàng — vi phạm quy tắc
   thẻ đồng nhất + footer thẳng hàng của mọi hệ thẻ chuẩn.
3. **Dòng meta "số người" nằm ở chân thẻ** chung với dòng điểm
   (kiểu "2–8 người · 1 trận sống còn · 300/200/100/50"), trong
   khi chuẩn Bloop đặt số người ngay dưới tên — mắt phải đi hết
   thẻ mới biết game có hợp số người trong phòng không.
4. **Nhãn trạng thái của thẻ không có vị trí cố định**: dòng
   "Thiếu X người — chạm để thêm Máy" là một dòng chữ ở đáy thẻ,
   thẻ khóa lại là dòng khác — thay vì một badge duy nhất ở góc
   phải trên như Steam/Jackbox.
5. **Sảnh chờ: mã phòng không phải phần tử lớn nhất**, và danh
   sách ghế dạng lưới ô (P1…P12) nằm TRÊN lưới game, đẩy lưới
   game xuống dưới fold — Jackbox/Kahoot đều để mã phòng áp đảo
   ở dải trên và người chơi thành một cột riêng, game chiếm vùng
   chính.
6. **Hộp "Chủ phòng cũng chơi" chèn giữa sảnh** làm thêm một khối
   chen giữa ghế và lưới game — phá vỡ cấu trúc 3 vùng cố định;
   theo chuẩn, nó thuộc về cột người chơi (ghế của host nằm trong
   danh sách ghế như mọi ghế khác).
7. **Màn hình kết quả dạng danh sách phẳng**: nếu kết quả ván chỉ
   là bảng xếp hạng đầy đủ một cột thì thiếu hẳn podium top 3 ở
   giữa và hàng nút hành động gom một chỗ theo chuẩn Kahoot —
   khoảnh khắc ăn mừng nhất buổi chơi đang bị trình bày như một
   bảng dữ liệu.
8. **Khoảng cách chưa theo một thang**: các khối sảnh/thẻ dùng
   nhiều cỡ đệm khác nhau (10/12/14/18px…) nên tổng thể trông
   "chưa chuẩn" dù từng khối riêng lẻ không sai — các trang lớn
   đều khóa một thang 8px duy nhất.

---

## 4. Nguồn (chỉ các URL đã mở/tìm thấy trong đợt này)

- Poki — https://www.poki.com
- Poki, chuẩn thumbnail 1:1 cho nhà phát triển — https://developers.poki.com/guide/your-game-page
- Poki, nghiên cứu UX danh mục/section — https://www.christiangravemaker.com/poki
- CrazyGames — https://www.crazygames.com
- CrazyGames, tổng quan bố cục/hàng mục — https://busyplayer.com/browser-games/free-online-games-on-crazygames-play-now
- CrazyGames, kiểm toán chrome điều hướng — http://paulkinlan.github.io/state-of-the-web/sites/0785-www_crazygames_com.html
- Bloop Party, danh mục 81 game — https://bloopparty.com
- Jackbox, cách chơi/sảnh — https://www.jackboxgames.com/how-to-play
- Jackbox, menu chọn game 2 cột — https://www.instagram.com/p/DdbpFpfFD3I/
- Jackbox, sảnh YDKJ (mã giữa, người chơi cột phải) — https://www.facebook.com/kelsey.cupples/posts/pfbid0DhHNr2th9PgkiV5MY1LkG6UjH8PXc4NtvRmpy8fxJWDitXksLcCqm3Y8pMWr3KEal
- Kahoot, PIN + podium + top 5 — https://www.literacymn.org/kahoot
- Kahoot, podium + runners-up — https://www.facebook.com/chemisuca.toura/posts/pfbid027bzbXi282s85TheUkSrjWYJeszQGFJaHZmxMa5wDtHuBdZc3DomUs8jxzARgE3Upl
- Steam, kích thước bìa theo vị trí — https://gameimageeditor.com/blog/steam-capsule-image-size
- Steam, bảng kích thước bìa — https://www.steampageanalyzer.com/tools/capsule-validator
- Chuẩn thẻ UI (280px, 2 dòng, 1 hành động) — https://www.setproduct.com/blog/card-ui-design
- Chuẩn lưới thẻ (auto-fill, footer thẳng hàng) — https://design.abizvo.com/library/card-layout
- Chuẩn lưới/gutter 12–16px, số cột theo breakpoint — https://www.alfdesigngroup.com/post/best-practices-to-design-ui-cards-for-your-website
