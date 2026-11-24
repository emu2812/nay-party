const PAGE = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Nảy Party — Game tiệc trên TV, điện thoại làm tay cầm</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; padding: 0; overscroll-behavior: none; }
body { font-family: 'Quicksand', sans-serif; background: #FFF6E9; color: #4A3226; min-height: 100vh;
  background-image: radial-gradient(circle at 12% 18%, rgba(247,127,176,.14) 0 90px, transparent 91px),
    radial-gradient(circle at 88% 12%, rgba(79,168,232,.14) 0 110px, transparent 111px),
    radial-gradient(circle at 82% 88%, rgba(88,196,114,.13) 0 100px, transparent 101px),
    radial-gradient(circle at 8% 86%, rgba(255,179,92,.15) 0 80px, transparent 81px); }
h1, h2, h3, .baloo { font-family: 'Baloo 2', cursive; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 18px 16px 40px; }
.card { background: #fff; border-radius: 28px; border: 3px solid #fff; box-shadow: 0 12px 30px rgba(140,90,30,.13); padding: 22px; }
.center { text-align: center; }
.btn { display: inline-block; border: none; cursor: pointer; font-family: 'Baloo 2', cursive; font-weight: 800;
  font-size: 20px; color: #fff; padding: 13px 28px; border-radius: 999px; background: #B08968;
  box-shadow: 0 6px 0 rgba(0,0,0,.18), 0 14px 22px rgba(120,72,20,.18); transition: transform .06s, box-shadow .06s; }
.btn:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.18), 0 6px 12px rgba(120,72,20,.18); }
.btn.blue { background: linear-gradient(180deg, #6DB6F2, #4FA8E8); box-shadow: 0 6px 0 #2F7FBF, 0 14px 22px rgba(47,127,191,.3); }
.btn.pink { background: linear-gradient(180deg, #FF9CC4, #F77FB0); box-shadow: 0 6px 0 #D6538A, 0 14px 22px rgba(214,83,138,.3); }
.btn.green { background: linear-gradient(180deg, #7ED98F, #58C472); box-shadow: 0 6px 0 #379A54, 0 14px 22px rgba(55,154,84,.3); }
.btn.purple { background: linear-gradient(180deg, #BFA8FF, #A78BFA); box-shadow: 0 6px 0 #7E63D8, 0 14px 22px rgba(126,99,216,.3); }
.btn.orange { background: linear-gradient(180deg, #FFC37E, #FFB35C); box-shadow: 0 6px 0 #E08A2E, 0 14px 22px rgba(224,138,46,.3); }
.btn.small { font-size: 15px; padding: 8px 16px; }
.btn.ghost { background: #FFF1DE; color: #8A5A33; box-shadow: 0 4px 0 #E4C9A2; }
.btn.off { opacity: .45; pointer-events: none; }
.logo { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
.logo .word { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 58px; color: #4A3226; letter-spacing: 1px; }
.logo .party span { display: inline-block; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 34px; color: #fff;
  padding: 2px 10px; border-radius: 12px; margin: 0 2px; box-shadow: 0 4px 0 rgba(0,0,0,.15); transform: rotate(-3deg); }
.tagline { font-size: 19px; font-weight: 700; color: #7C4F27; margin-top: 6px; }
.codeboxes { display: flex; gap: 10px; justify-content: center; margin: 10px 0; }
.codebox { width: 62px; height: 76px; background: #fff; border-radius: 16px; font-family: 'Baloo 2', cursive; font-weight: 800;
  font-size: 42px; color: #4A3226; display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 -6px 0 rgba(140,90,30,.15), 0 8px 18px rgba(140,90,30,.15); border: 3px solid #FFE3B3; }
.seats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-top: 14px; }
.seat { background: #FFFDF8; border-radius: 24px; padding: 14px 10px; text-align: center; border: 3px dashed #EBD9BE; position: relative; }
.seat.filled { border: 3px solid #FFE3B3; background: #fff; box-shadow: 0 8px 18px rgba(140,90,30,.1); }
.seat .nm { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; margin-top: 4px; }
.seat .sc { font-weight: 700; color: #9C744C; }
.bubble { position: absolute; top: -14px; left: 50%; transform: translateX(-50%) rotate(-2deg); background: #fff; border: 3px solid #FFD98E;
  color: #4A3226; font-weight: 700; font-size: 14px; padding: 6px 12px; border-radius: 16px; white-space: nowrap; z-index: 3;
  box-shadow: 0 6px 14px rgba(140,90,30,.18); }
.blobbob { display: inline-block; animation: bob 2.6s ease-in-out infinite; }
@keyframes bob { 0%,100% { transform: translateY(0) scale(1,1); } 30% { transform: translateY(-8px) scale(.97,1.03); } 55% { transform: translateY(0) scale(1.04,.94); } }
.chip { display: inline-block; background: #FFF1DE; color: #8A5A33; font-weight: 700; font-size: 14px; padding: 4px 12px; border-radius: 999px; margin: 2px; }
.chip.hot { background: #FFE1EC; color: #C2437E; }
.chip.cool { background: #E1F0FF; color: #2F6FBF; }
.games { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-top: 14px; }
.gamecard { border-radius: 24px; padding: 18px; color: #fff; cursor: pointer; text-align: left; border: none; font-family: inherit;
  box-shadow: 0 8px 0 rgba(0,0,0,.15), 0 16px 26px rgba(120,72,20,.18); transition: transform .08s; }
.gamecard:active { transform: translateY(4px); }
.gamecard h3 { margin: 0 0 4px; font-size: 24px; }
.gamecard p { margin: 0; font-weight: 700; opacity: .92; }
.stage { border-radius: 32px; padding: 12px 10px; color: #fff; min-height: 400px; box-shadow: inset 0 -10px 0 rgba(0,0,0,.12), 0 18px 34px rgba(120,72,20,.2); position: relative; overflow: hidden; }
.pstage { touch-action: none; overscroll-behavior: none; }
.stage h2 { margin: 0 0 4px; font-size: 24px; text-shadow: 0 3px 0 rgba(0,0,0,.15); }
.g-do-vui { background: linear-gradient(160deg, #6BCBFF, #4F7BE8); }
.g-ma-soi { background: linear-gradient(160deg, #1E1B4B, #6D28A8); }
.g-ca-ngua { background: linear-gradient(160deg, #78350F, #D97706); }
.g-tien-len { background: linear-gradient(160deg, #134E4A, #0F766E); }
.tlchips { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin: 8px 0; }
.tlcard2 { display: inline-block; background: #FFFDF5; color: #26314A; border-radius: 9px; padding: 7px 10px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; line-height: 1.1; box-shadow: 0 3px 0 rgba(0,0,0,.25); }
.tlcard2.red { color: #D81F3C; }
.tlcard2.sm { font-size: 15px; padding: 4px 7px; border-radius: 7px; }
.tltable { background: rgba(0,0,0,.22); border: 2px dashed rgba(255,255,255,.35); border-radius: 20px; padding: 12px 10px; margin: 8px auto; max-width: 860px; }
.tlhand { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 10px 0; }
button.tlcard { background: #FFFDF5; color: #26314A; border: none; border-radius: 9px; min-width: 50px; padding: 10px 4px 8px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; line-height: 1.05; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,.3); transition: transform .07s; }
button.tlcard.red { color: #D81F3C; }
button.tlcard.sel { transform: translateY(-11px); outline: 3px solid #FFC93D; box-shadow: 0 8px 0 rgba(0,0,0,.3); background: #FFF3C4; }
.tlp { display: inline-block; padding: 1px 5px; margin: 1px 1px; border-radius: 6px; background: rgba(255,255,255,.1); font-weight: 700; }
.tlp.red { color: #FF9DB0; }
.tlp.sel { background: #FFC93D; color: #26314A; }
.tlp.sel.red { color: #B3122F; }
.tlp.cur { outline: 2px solid #7BE0B8; }
.wolfgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 12px; }
.wolfcard { background: rgba(255,255,255,.92); color: #4A3226; border-radius: 18px; padding: 10px 6px; text-align: center; font-weight: 700; }
.wolfcard.dead { opacity: .62; filter: grayscale(.8); }
.wolfcard .rolechip { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 999px; background: #312E81; color: #fff; font-size: 13px; }
.ngrow { display: flex; gap: 14px; align-items: stretch; margin-top: 6px; }
.ngrow .ngmid { flex: 0 0 auto; min-width: 0; width: calc(100vh - 215px); width: calc(100dvh - 215px); max-width: 46%; margin: 0 auto; }
.ngside { flex: 1 1 0; min-width: 0; background: rgba(255,255,255,.14); border-radius: 16px; padding: 10px 12px; overflow: hidden; }
.ngside h3 { margin: 0 0 8px; font-size: 17px; }
.ngside .rrow { margin: 5px 0; padding: 6px 10px; font-size: 14.5px; }
.ngside .chatrow { font-size: 14px; }
.ngside .progbar { height: 9px; background: rgba(0,0,0,.3); border-radius: 99px; overflow: hidden; margin-top: 4px; }
.ngside .progbar i { display: block; height: 100%; border-radius: 99px; }
@media (max-width: 1100px) { .ngrow { flex-direction: column; } .ngside { width: 100%; } .ngrow .ngmid { width: 100%; max-width: 560px; } }
.ngboard { position: relative; width: 100%; padding-top: 100%; margin: 6px auto; background: #FDF6E3; border-radius: 18px; box-shadow: inset 0 0 0 3px rgba(0,0,0,.15); }
.ngcell { position: absolute; box-sizing: border-box; border: 1px solid rgba(0,0,0,.18); border-radius: 4px; background: #fff; }
.ngcell.safe { background: #FFE9A8; }
.ngcell.quad { border: none; border-radius: 14px; }
.ngstable { position: absolute; box-sizing: border-box; border: 2px dashed rgba(0,0,0,.25); border-radius: 50%; background: rgba(255,255,255,.85); }
.nghorse { position: absolute; box-sizing: border-box; border-radius: 50%; border: 2px solid rgba(0,0,0,.35); color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; text-shadow: 0 1px 2px rgba(0,0,0,.5); z-index: 3; }
.nghorse.turn { box-shadow: 0 0 0 3px #FFC93D, 0 0 14px #FFC93D; }
.diceface { display: inline-flex; align-items: center; justify-content: center; width: 74px; height: 74px; border-radius: 16px; background: #fff; color: #312E81; font-size: 44px; box-shadow: 0 6px 0 rgba(0,0,0,.2); }
.bigcircle { width: 250px; height: 250px; border-radius: 50%; margin: 16px auto; display: flex; align-items: center; justify-content: center;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 34px; text-align: center; padding: 20px;
  box-shadow: inset 0 -12px 0 rgba(0,0,0,.15), 0 16px 30px rgba(0,0,0,.2); }
.bigcircle.wait { background: #E84F4F; color: #fff; }
.bigcircle.go { background: #3ED97E; color: #fff; animation: pop .3s ease; }
@keyframes pop { 0% { transform: scale(.6); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
.optgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.opt { border: none; border-radius: 20px; padding: 18px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; cursor: pointer;
  background: rgba(255,255,255,.92); color: #4A3226; box-shadow: 0 6px 0 rgba(0,0,0,.18); text-align: left; }
.opt:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,.18); }
.opt.right { background: #3ED97E; color: #fff; }
.opt.dim { opacity: .55; }
.tbar { height: 12px; background: rgba(0,0,0,.22); border-radius: 999px; overflow: hidden; margin: 10px 0; }
.tbar i { display: block; height: 100%; background: #fff; border-radius: 999px; }
.scorebar { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
.scorechip { display: flex; align-items: center; gap: 7px; background: #fff; color: #4A3226; border-radius: 999px; padding: 4px 14px 4px 5px;
  font-weight: 700; box-shadow: 0 4px 10px rgba(140,90,30,.15); font-size: 16px; }
.gapline { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; color: #8A5A33; }
.pads { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; max-width: 430px; margin: 16px auto; }
.pad { height: 120px; border-radius: 26px; border: none; cursor: pointer; opacity: .45; box-shadow: inset 0 -8px 0 rgba(0,0,0,.2); }
.pad.on { opacity: 1; filter: brightness(1.25); }
.pad:active { opacity: 1; }
.racebar { background: rgba(255,255,255,.25); border-radius: 999px; height: 30px; margin: 8px 0; position: relative; overflow: hidden; }
.racebar i { display: block; height: 100%; border-radius: 999px; }
.racebar b { position: absolute; left: 12px; top: 3px; color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.25); }
.tapbtn { display: block; width: min(78vw, 340px); height: min(78vw, 340px); margin: 18px auto; border-radius: 50%; border: none; cursor: pointer;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 36px; color: #fff; padding: 24px;
  box-shadow: inset 0 -14px 0 rgba(0,0,0,.18), 0 18px 34px rgba(120,72,20,.3); }
.tapbtn:active { transform: scale(.96); }
.tapbtn.wait { background: #E84F4F; }
.tapbtn.go { background: #3ED97E; animation: pop .3s ease; }
.tapbtn.race { background: linear-gradient(180deg, #FF9DE2, #B45FE8); }
.keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 330px; margin: 12px auto; }
.key { border: none; border-radius: 18px; padding: 16px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 24px;
  background: #fff; color: #4A3226; box-shadow: 0 5px 0 rgba(140,90,30,.3); cursor: pointer; }
.key:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(140,90,30,.3); }
.tapbtn, .opt, .key, .pad, .symbtn, .abtn, .disc, .btn[data-cmd="choose"], .btn[data-cmd="guessSubmit"] { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.pressed { transform: scale(.93) !important; filter: brightness(1.25) saturate(1.15); box-shadow: 0 0 0 3px rgba(255,255,255,.8), 0 0 26px rgba(255,255,255,.6) !important; }
.guessbox { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 44px; background: #fff; border-radius: 20px;
  padding: 8px 20px; min-height: 74px; box-shadow: inset 0 -5px 0 rgba(140,90,30,.15); }
.podium { display: flex; align-items: flex-end; justify-content: center; gap: 14px; margin-top: 26px; }
.pod { text-align: center; width: 150px; }
.pod .col { border-radius: 18px 18px 0 0; color: #fff; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 30px;
  display: flex; align-items: flex-start; justify-content: center; padding-top: 8px; box-shadow: inset 0 -8px 0 rgba(0,0,0,.15); }
.rows { margin-top: 12px; }
.rrow { display: flex; align-items: center; gap: 10px; background: #FFFDF8; color: #4A3226; border-radius: 16px; padding: 9px 14px; margin: 7px 0; font-weight: 700; }
.rrow .pts { margin-left: auto; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; }
.cdwrap { text-align: center; padding: 30px 0; }
.cdnum { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 150px; line-height: 1; color: #fff; text-shadow: 0 8px 0 rgba(0,0,0,.18); animation: pop .45s ease; }
.cdnum.punch { animation: cdPunch .45s ease; }
@keyframes cdPunch { 0% { transform: scale(1.6); } 55% { transform: scale(.93); } 100% { transform: scale(1); } }
.g-cuop-sao { background-color: #171003; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,190,50,.3), transparent 62%), linear-gradient(rgba(255,210,110,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,210,110,.05) 1px, transparent 1px), linear-gradient(165deg, #241A04, #2E2005 58%, #140E02); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(22,16,2,.5); }
.g-giu-vuong-mien { background-color: #12061F; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(190,120,255,.3), transparent 62%), linear-gradient(rgba(200,150,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(200,150,255,.05) 1px, transparent 1px), linear-gradient(165deg, #1E0A38, #2A1052 58%, #0E0618); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(16,4,30,.5); }
.g-son-san { background-color: #03181C; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(50,220,200,.24), transparent 62%), linear-gradient(rgba(120,255,235,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,235,.045) 1px, transparent 1px), linear-gradient(165deg, #052A30, #04303A 58%, #02141A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,18,22,.5); }
.g-cao-boi { background-color: #170B04; background-image: radial-gradient(ellipse 70% 60% at 50% 30%, rgba(255,176,66,.32), transparent 65%), linear-gradient(rgba(255,190,110,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,110,.04) 1px, transparent 1px), linear-gradient(165deg, #2A1503, #3A1C05 58%, #180B02); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(22,10,2,.5); }
.g-chung-mot-than { background-color: #0D0620; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(167,139,250,.3), transparent 62%), linear-gradient(rgba(180,160,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(180,160,255,.05) 1px, transparent 1px), linear-gradient(165deg, #1E1040, #2A1458 58%, #0C0518); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(14,4,30,.5); }
.g-day-hop { background-color: #160D02; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,170,60,.26), transparent 62%), linear-gradient(rgba(255,190,100,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,100,.045) 1px, transparent 1px), linear-gradient(165deg, #241503, #331D04 58%, #120A01); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(20,12,2,.5); }
.g-xe-tank { background-color: #0A1410; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(80,255,170,.24), transparent 62%), linear-gradient(rgba(120,255,190,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,190,.045) 1px, transparent 1px), linear-gradient(165deg, #0B2018, #0E2A1E 58%, #060F0B); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,16,10,.5); }
.g-dat-bom { background-color: #160A04; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,120,60,.26), transparent 62%), linear-gradient(rgba(255,160,110,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,160,110,.045) 1px, transparent 1px), linear-gradient(165deg, #241006, #301605 58%, #120702); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(18,8,2,.5); }
.g-ke-gia-mao { background-color: #12081C; background-image: radial-gradient(ellipse 70% 60% at 50% 30%, rgba(190,90,255,.22), transparent 65%), linear-gradient(rgba(200,150,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(200,150,255,.04) 1px, transparent 1px), linear-gradient(165deg, #1E0A38, #2A0E44 58%, #0C0516); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(12,4,24,.5); }
.g-thu-thanh { background-color: #03141C; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(80,220,255,.26), transparent 62%), linear-gradient(rgba(140,230,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(140,230,255,.045) 1px, transparent 1px), linear-gradient(165deg, #06222E, #08303F 58%, #02101A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,14,20,.5); }
.g-giai-ma-chung { background-color: #0C0A1E; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(130,120,255,.28), transparent 62%), linear-gradient(rgba(160,150,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(160,150,255,.05) 1px, transparent 1px), linear-gradient(165deg, #191238, #120E30 58%, #08061A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(6,4,20,.5); }
.g-nguoi-que { background-color: #14060C; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,80,110,.28), transparent 62%), linear-gradient(rgba(255,140,160,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,140,160,.05) 1px, transparent 1px), linear-gradient(165deg, #2A0A16, #1E0812 58%, #0D0309); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(18,2,8,.5); }
.g-den-lua-nuoc { background-color: #120A04; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,170,60,.2), transparent 62%), repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 3px, transparent 3px 26px), repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 3px, transparent 3px 44px), linear-gradient(165deg, #241305, #1A0E04 58%, #0A0501); background-size: auto, auto, auto, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.66), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(12,6,1,.5); }
.fplat { position: absolute; z-index: 1; pointer-events: none; border-radius: 7px; background: linear-gradient(160deg, #4A2438, #2A1220); border: 2px solid rgba(255,120,160,.55); box-shadow: 0 4px 10px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.14), 0 0 14px rgba(255,80,120,.22); }
.fplat.oneway { background: linear-gradient(160deg, rgba(90,50,80,.85), rgba(46,22,44,.85)); border-color: rgba(200,160,255,.5); box-shadow: 0 3px 8px rgba(0,0,0,.45), 0 0 10px rgba(170,120,255,.2); }
.admg { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 15px; line-height: 1; text-shadow: 0 2px 0 rgba(0,0,0,.5); min-height: 16px; }
.tbrick { position: absolute; z-index: 1; pointer-events: none; border-radius: 4px; background: linear-gradient(150deg, #6B4A2F, #4A2F1B); border: 2px solid rgba(255,196,110,.4); box-shadow: inset 0 0 0 2px rgba(0,0,0,.28), inset 0 -6px 0 rgba(0,0,0,.22), 0 3px 7px rgba(0,0,0,.5); }
.tpool { position: absolute; z-index: 1; pointer-events: none; border-radius: 8px 8px 4px 4px; overflow: hidden; animation: poolGlow 1.1s ease-in-out infinite alternate; }
.tpool::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 55%; pointer-events: none;
  background: linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,.45), rgba(255,255,255,0));
  transform: translateX(-140%) skewX(-14deg); opacity: 0; animation: poolShine 3.4s ease-in-out infinite; }
@keyframes poolShine { 0%, 52% { transform: translateX(-140%) skewX(-14deg); opacity: 0; } 62% { opacity: 1; } 88%, 100% { transform: translateX(260%) skewX(-14deg); opacity: 0; } }
.tpool.red { background: radial-gradient(ellipse at 50% 0%, #FFB199, #FF5A3C 55%, #C22E12); box-shadow: 0 0 18px rgba(255,90,60,.8), inset 0 3px 6px rgba(255,255,255,.35); }
.tpool.blue { background: radial-gradient(ellipse at 50% 0%, #BDEFFF, #3FA9F5 55%, #1663B8); box-shadow: 0 0 18px rgba(80,170,255,.8), inset 0 3px 6px rgba(255,255,255,.35); }
.tpool.green { background: radial-gradient(ellipse at 50% 0%, #E4FFB0, #8CE03A 55%, #4E9A16); box-shadow: 0 0 18px rgba(150,230,70,.8), inset 0 3px 6px rgba(255,255,255,.35); }
@keyframes poolGlow { from { filter: brightness(1); } to { filter: brightness(1.35); } }
.tgem { position: absolute; width: 15px; height: 15px; margin: -7.5px 0 0 -7.5px; z-index: 2; pointer-events: none; }
.tgem i { display: block; width: 100%; height: 100%; transform: rotate(45deg); animation: gemBob 1.5s ease-in-out infinite alternate; }
.tgem.lua i { background: linear-gradient(140deg, #FFD7C2, #FF5A3C 60%, #B81F08); box-shadow: 0 0 12px rgba(255,90,60,.95); }
.tgem.nuoc i { background: linear-gradient(140deg, #D8F4FF, #3FA9F5 60%, #0F4E9E); box-shadow: 0 0 12px rgba(80,170,255,.95); }
.tgem.taken { display: none; }
@keyframes gemBob { from { transform: rotate(45deg) translate(0, 0) scale(1); } to { transform: rotate(45deg) translate(-2.4px, -2.4px) scale(1.18); } }
.tgate { position: absolute; z-index: 2; pointer-events: none; border-radius: 4px; background: repeating-linear-gradient(90deg, #8A93A6 0 5px, #454E61 5px 10px); border: 2px solid rgba(220,230,255,.5); box-shadow: 0 4px 9px rgba(0,0,0,.55), inset 0 0 0 2px rgba(0,0,0,.3); transition: opacity .18s linear; }
.tgate.open { opacity: 0; }
.tbtn { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: linear-gradient(180deg, #FFE9A8, #E8A812); border: 2px solid rgba(255,240,190,.8); box-shadow: 0 0 12px rgba(255,200,60,.55); }
.tdoor { position: absolute; z-index: 1; pointer-events: none; border-radius: 9px 9px 3px 3px; border: 3px solid; }
.tdoor.lua { border-color: #FF7A50; background: radial-gradient(ellipse at 50% 100%, rgba(255,110,60,.5), rgba(80,16,4,.25) 70%); box-shadow: 0 0 20px rgba(255,100,55,.65), inset 0 0 16px rgba(255,100,55,.4); }
.tdoor.nuoc { border-color: #5FC2FF; background: radial-gradient(ellipse at 50% 100%, rgba(90,180,255,.5), rgba(4,26,80,.25) 70%); box-shadow: 0 0 20px rgba(90,180,255,.65), inset 0 0 16px rgba(90,180,255,.4); }
.achar { position: absolute; transform: translate(-50%, -50%); transition: left .18s linear, top .18s linear; text-align: center; z-index: 3; pointer-events: none; }
.achar svg { display: block; margin: 0 auto; }
.achar.home { filter: brightness(1.5); }
/* --- Wave 5 stages ---------------------------------------------------------
   da-bong plays in a 32 x 18 space on the wide 16:9 field; can-goc in a
   24 x 16 space on the 3:2 field; ech-op reuses the square temple field. */
.afield.wide { aspect-ratio: 95 / 48; width: min(100%, max(340px, calc((100vh - 150px) * 95 / 48))); width: min(100%, max(340px, calc((100dvh - 150px) * 95 / 48))); }
.afield.art { aspect-ratio: 16 / 9; width: min(100%, max(340px, calc((100vh - 190px) * 16 / 9))); width: min(100%, max(340px, calc((100dvh - 190px) * 16 / 9))); }
.g-da-bong { background-color: #061A0C; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(74,222,128,.25), transparent 62%), linear-gradient(rgba(134,239,172,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(134,239,172,.05) 1px, transparent 1px), linear-gradient(165deg, #0B3D1E, #07290F 58%, #04150A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,20,8,.5); }
.g-ech-op { background-color: #170E04; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,190,80,.22), transparent 62%), repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 3px, transparent 3px 26px), repeating-linear-gradient(90deg, rgba(0,0,0,.12) 0 3px, transparent 3px 44px), linear-gradient(165deg, #2E1C07, #201204 58%, #0D0701); background-size: auto, auto, auto, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.64), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(14,8,1,.5); }
.g-can-goc { background-color: #0A1420; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(125,211,252,.22), transparent 62%), linear-gradient(rgba(147,197,253,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,.05) 1px, transparent 1px), linear-gradient(165deg, #0E2233, #0A1826 58%, #050C14); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,10,18,.5); }
.spitch { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: linear-gradient(150deg, #1E7A3C, #14532D); border: 2px solid rgba(160,255,190,.35); box-shadow: inset 0 0 0 2px rgba(0,0,0,.22), 0 3px 7px rgba(0,0,0,.5); }
.spitch.wall { background: linear-gradient(150deg, #7A4A21, #4A2C10); border-color: rgba(255,205,130,.4); }
.sgoalbox { position: absolute; z-index: 0; pointer-events: none; border: 3px dashed rgba(255,255,255,.65); border-radius: 8px; background: rgba(255,255,255,.08); }
.sball { position: absolute; width: 3.4%; aspect-ratio: 1; border-radius: 50%; z-index: 3; pointer-events: none; transform: translate(-50%, -50%); transition: left .18s linear, top .18s linear; background: radial-gradient(circle at 35% 32%, #FFFFFF, #E8EDF5 45%, #9AA7C2); box-shadow: 0 0 10px rgba(255,255,255,.65), 0 3px 6px rgba(0,0,0,.45); }
.goalbanner { position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%); z-index: 6; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: clamp(30px, 6.2vw, 64px); color: #FFE066; text-shadow: 0 0 22px rgba(255,190,40,.9), 0 4px 0 rgba(120,53,15,.85); animation: pop .45s ease; pointer-events: none; white-space: nowrap; }
.fspike { position: absolute; z-index: 1; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='14'%3E%3Cpath d='M0 14 L9 0 L18 14 Z' fill='%232E2A33'/%3E%3Cpath d='M0 14 L9 0 L18 14 Z' fill='none' stroke='%23B9B3C7' stroke-width='1.4'/%3E%3C/svg%3E"); background-repeat: repeat-x; background-position: bottom left; background-size: 18px 100%; filter: drop-shadow(0 0 5px rgba(0,0,0,.6)); }
.fdoor { position: absolute; z-index: 1; pointer-events: none; border-radius: 9px 9px 3px 3px; border: 3px solid #3ED97E; background: radial-gradient(ellipse at 50% 100%, rgba(62,217,126,.5), rgba(3,40,20,.3) 70%); box-shadow: 0 0 20px rgba(62,217,126,.6), inset 0 0 16px rgba(62,217,126,.4); }
.ffly { position: absolute; width: 15px; height: 15px; margin: -7.5px 0 0 -7.5px; border-radius: 50%; z-index: 2; pointer-events: none; transition: left .18s linear, top .18s linear; background: radial-gradient(circle at 40% 35%, #4A4A55, #14141C 70%); box-shadow: 0 0 0 3px rgba(255,255,255,.28), 0 0 9px rgba(255,255,255,.35); animation: starBob 1.3s ease-in-out infinite; }
.ffly.taken { opacity: 0; }
.afrog { position: absolute; transform: translate(-50%, -50%); transition: left .18s linear, top .18s linear; text-align: center; z-index: 3; pointer-events: none; }
.afrog svg { display: block; margin: 0 auto; }
.afrog.carry svg { filter: drop-shadow(0 0 10px rgba(255,220,120,.85)); }
.fcrate { position: absolute; width: 3.75%; aspect-ratio: 1; transform: translate(-50%, -50%); z-index: 2; pointer-events: none; transition: left .18s linear, top .18s linear; display: flex; align-items: center; justify-content: center; font-size: 22px; background: linear-gradient(150deg, #B97B34, #8A5518); border: 3px solid #E8B96A; border-radius: 8px; box-shadow: 0 0 14px rgba(255,180,80,.4), 0 5px 10px rgba(0,0,0,.45), inset 0 0 0 3px rgba(0,0,0,.18); }
.artwrap { position: absolute; inset: 0; }
.artwrap svg { width: 100%; height: 100%; display: block; }
.boomflash { position: absolute; border-radius: 50%; z-index: 5; pointer-events: none; transform: translate(-50%, -50%); background: radial-gradient(circle, rgba(255,246,200,.95), rgba(255,150,50,.75) 55%, rgba(255,80,20,.12)); animation: boomPop .5s ease-out; }
@keyframes boomPop { from { width: 4%; padding-top: 4%; opacity: 1; } to { width: 19%; padding-top: 19%; opacity: 0; } }
.aframe { position: absolute; border: 3px solid rgba(120,220,255,.85); border-radius: 14px; box-shadow: 0 0 24px rgba(80,200,255,.4), inset 0 0 40px rgba(80,200,255,.14); pointer-events: none; }
.ablock { position: absolute; z-index: 1; pointer-events: none; border-radius: 6px; background: linear-gradient(150deg, #3E5A4C, #22392E); border: 2px solid rgba(140,255,200,.5); box-shadow: 0 3px 8px rgba(0,0,0,.5), inset 0 0 0 2px rgba(0,0,0,.25); }
.orbwrap { position: relative; display: inline-block; }
.abarrel { position: absolute; left: 50%; top: 50%; width: 42px; height: 11px; margin-top: -5.5px; transform-origin: 0 50%; border-radius: 4px; background: linear-gradient(90deg, rgba(255,255,255,.15), #FFC93D); box-shadow: 0 0 8px rgba(255,201,61,.8); pointer-events: none; }
.ashell { position: absolute; width: 17px; height: 17px; margin: -8.5px 0 0 -8.5px; border-radius: 50%; z-index: 3; pointer-events: none; transition: left .18s linear, top .18s linear; background: radial-gradient(circle at 40% 38%, #FFF6D8, #FFC93D 55%, #FF7A1A); box-shadow: 0 0 12px rgba(255,190,60,.95), 0 0 26px rgba(255,140,30,.55); }
.bhard { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: linear-gradient(150deg, #6B7280, #374151); border: 2px solid rgba(220,230,255,.4); box-shadow: inset 0 0 0 2px rgba(0,0,0,.3), 0 3px 7px rgba(0,0,0,.5); }
.bsoft { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px; background: linear-gradient(150deg, #C98A4B, #96622A); border: 2px solid rgba(255,214,150,.55); box-shadow: inset 0 0 0 2px rgba(0,0,0,.22), 0 3px 7px rgba(0,0,0,.45); }
.abomb { position: absolute; z-index: 2; transform: translate(-50%, -50%); pointer-events: none; font-size: 30px; line-height: 1; filter: drop-shadow(0 0 10px rgba(255,90,40,.75)); animation: bombPulse .5s ease-in-out infinite alternate; }
@keyframes bombPulse { from { scale: 1; } to { scale: 1.22; } }
.ablast { position: absolute; z-index: 2; pointer-events: none; border-radius: 6px; background: radial-gradient(circle, rgba(255,240,190,.95), rgba(255,140,40,.75) 60%, rgba(255,80,20,.25)); box-shadow: 0 0 18px rgba(255,150,50,.8); }
.aslime { position: absolute; width: 38px; height: 38px; margin: -19px 0 0 -19px; border-radius: 50% 50% 46% 46%; z-index: 1; pointer-events: none; transition: left .18s linear, top .18s linear; background: radial-gradient(circle at 36% 30%, #C6FF9E, #58C472 55%, #1E7A46); box-shadow: 0 0 14px rgba(90,230,140,.75), 0 4px 7px rgba(0,0,0,.4); }
.aslime.big { width: 58px; height: 58px; margin: -29px 0 0 -29px; }
.aslime i { position: absolute; top: 32%; width: 5px; height: 7px; border-radius: 50%; background: #10331C; }
.aslime i:first-child { left: 30%; } .aslime i:last-child { right: 30%; }
.acrystal { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1; text-align: center; pointer-events: none; font-size: 44px; line-height: 1; filter: drop-shadow(0 0 16px rgba(120,230,255,.9)); }
.acrystal .chp { font-size: 13px; letter-spacing: 1px; }
.pips { display: flex; gap: 9px; justify-content: center; margin: 16px 0; }
.pip { width: 30px; height: 30px; border-radius: 50%; border: 3px solid rgba(255,255,255,.5); background: rgba(255,255,255,.08); }
.pip.done { background: #FFC93D; border-color: #FFE9A8; box-shadow: 0 0 16px rgba(255,201,61,.85); }
.pip.now { border-color: #FFC93D; animation: ringPulse .6s ease-in-out infinite alternate; }
.symbtn { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; border: none; border-radius: 16px; padding: 16px 0; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.45); box-shadow: 0 5px 0 rgba(0,0,0,.3); }
.symgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
.impq { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
.impq .qcard { background: rgba(255,255,255,.1); border: 2px solid rgba(255,255,255,.25); border-radius: 16px; padding: 14px; }
.mystep { display: inline-block; background: rgba(255,255,255,.13); border-radius: 12px; padding: 7px 13px; margin: 4px; font-weight: 800; }
.g-cheo-thuyen { background-color: #02141F; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(56,189,248,.3), transparent 62%), linear-gradient(rgba(125,211,252,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,.05) 1px, transparent 1px), linear-gradient(165deg, #062A3F, #083A56 58%, #02101A); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,16,26,.5); }
.g-day-ra { background-color: #170A18; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,92,60,.34), transparent 62%), linear-gradient(rgba(255,130,90,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,130,90,.055) 1px, transparent 1px), linear-gradient(165deg, #1D0B20, #2B0A18 58%, #140A24); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(20,4,16,.45); }
.g-ne-dan { background-color: #0C0618; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(190,90,255,.3), transparent 62%), linear-gradient(rgba(170,120,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(170,120,255,.05) 1px, transparent 1px), linear-gradient(165deg, #150826, #200A33 58%, #0A0618); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.62), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(14,4,28,.5); }
.g-keo-co { background-color: #04140F; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(45,230,190,.22), transparent 62%), linear-gradient(rgba(120,255,220,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,220,.045) 1px, transparent 1px), linear-gradient(165deg, #06231B, #052A1E 58%, #03130E); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(2,20,14,.5); }
.g-chia-cuop { background-color: #0D0A22; background-image: radial-gradient(ellipse 90% 55% at 50% -8%, rgba(130,110,255,.28), transparent 62%), linear-gradient(rgba(150,140,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(150,140,255,.05) 1px, transparent 1px), linear-gradient(165deg, #171038, #120A2E 58%, #0A0618); background-size: auto, 34px 34px, 34px 34px, auto; box-shadow: inset 0 0 130px rgba(0,0,0,.6), inset 0 -10px 0 rgba(0,0,0,.25), 0 18px 34px rgba(8,4,24,.5); }
.stage.neon-stage h2 { text-shadow: 0 0 18px rgba(130,190,255,.35), 0 3px 0 rgba(0,0,0,.35); }
.aball { position: absolute; width: 34px; height: 34px; border-radius: 50%; z-index: 1;
  background: radial-gradient(circle at 35% 32%, #FFE3B3, #FF8C42 55%, #D63C14); transform: translate(-50%, -50%);
  transition: left .18s linear, top .18s linear; box-shadow: 0 0 16px rgba(255,140,50,.9), 0 0 34px rgba(255,90,30,.45), 0 4px 8px rgba(0,0,0,.35); }
.rope { position: relative; height: 40px; border-radius: 999px; margin: 16px 0;
  background: linear-gradient(90deg, #4FA8E8 0 50%, #F77FB0 50% 100%); box-shadow: inset 0 -6px 0 rgba(0,0,0,.18), 0 0 22px rgba(90,160,255,.28); }
.rope .mid { position: absolute; left: 50%; top: -6px; bottom: -6px; width: 4px; background: #fff; transform: translateX(-50%); border-radius: 2px; }
.rope .knot { position: absolute; top: 50%; width: 34px; height: 34px; border-radius: 50%; background: #FFC93D;
  border: 4px solid #fff; transform: translate(-50%, -50%); box-shadow: 0 0 18px rgba(255,201,61,.85), 0 6px 12px rgba(0,0,0,.3); transition: left .3s; }
.chatrow { display: flex; gap: 8px; align-items: center; background: rgba(255,255,255,.22); border-radius: 14px; padding: 7px 12px; margin: 6px 0; font-weight: 700; text-align: left; }
.afield { position: relative; width: min(100%, max(340px, calc((100vh - 190px) * 16 / 9))); width: min(100%, max(340px, calc((100dvh - 190px) * 16 / 9))); aspect-ratio: 16 / 9; margin: 6px auto; border-radius: 18px;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(255,255,255,.15), rgba(0,0,0,.30) 82%),
    repeating-linear-gradient(0deg, rgba(255,255,255,.09) 0 1px, transparent 1px 45px),
    repeating-linear-gradient(90deg, rgba(255,255,255,.09) 0 1px, transparent 1px 45px);
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.18), inset 0 0 52px rgba(0,0,0,.36); }
.aring { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border-radius: 50%;
  background: radial-gradient(circle, rgba(140,200,255,.15), rgba(140,200,255,.03) 62%, rgba(255,120,80,.06));
  border: 3px solid rgba(120,220,255,.9);
  box-shadow: 0 0 26px rgba(80,200,255,.45), inset 0 0 44px rgba(80,200,255,.22), inset 0 0 120px rgba(0,0,0,.35); }
/* The day-ra / ne-dan ring is resized by patchPositions via transform
   scale on a fixed full-field basis (compositor work) instead of
   width/height (a full repaint of this giant bordered circle on every
   patch). The old width/height transition is gone with it: the 125ms
   patch cadence steps the shrink, which reads fine at ring speed. */
.aring.dynring { width: 100%; height: 100%; transition: transform .13s linear; }
/* Mini live field on the PHONE player page: until now a phone
   player in an arena game saw only a D-pad and a hint to watch the
   TV — anyone playing from another room or house played blind and
   (rightly) called it lag. The same patchPositions/rafLoop
   machinery drives this field; movers shrink to phone scale. */
.afield.pfield { width: 100%; margin: 0 auto 8px; }
.afield.pfield.wide { width: 100%; }
.pfield .ablob svg { width: 28px; height: 28px; }
.pfield .afrog svg { width: 30px; height: 30px; }
.pfield .achar svg { width: 26px; height: 26px; }
.pfield .aname { font-size: 9px; padding: 0 5px; }
.pfield .alives { font-size: 8px; }
.pfield .aball { width: 15px; height: 15px; margin: -7.5px 0 0 -7.5px; }
.pfield .ashell { width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; }
.pfield .aslime { width: 17px; height: 17px; margin: -8.5px 0 0 -8.5px; }
.pfield .aslime.big { width: 26px; height: 26px; margin: -13px 0 0 -13px; }
.pfield .abarrel { width: 19px; height: 5px; margin-top: -2.5px; }
.pfield .abomb { font-size: 15px; }
.pfield .astar { font-size: 15px; }
.pfield .astar.gold { font-size: 22px; }
.pfield .acrown svg { width: 27px; height: 27px; }
.pfield .tgem { font-size: 13px; }
.aring.danger { border-color: #FF4757; box-shadow: 0 0 34px rgba(255,71,87,.75), inset 0 0 50px rgba(255,71,87,.35); animation: ringPulse .5s ease-in-out infinite alternate; }
@keyframes ringPulse { from { filter: brightness(1); } to { filter: brightness(1.7); } }
.ablob { position: absolute; transform: translate(-50%, -50%); transition: left .18s linear, top .18s linear; text-align: center; z-index: 2; }
.ablob svg { filter: drop-shadow(0 0 9px currentColor); display: block; margin: 0 auto; }
.ablob.holder svg { filter: drop-shadow(0 0 16px #FFC93D) drop-shadow(0 0 5px #FFC93D); }
.astar { position: absolute; transform: translate(-50%, -50%); z-index: 1; font-size: 34px; line-height: 1; color: #FFE066;
  text-shadow: 0 0 10px rgba(255,205,60,.95), 0 0 22px rgba(255,170,30,.55), 0 2px 3px rgba(0,0,0,.4); animation: starBob 1.6s ease-in-out infinite; pointer-events: none; }
.astar.gold { font-size: 50px; color: #FFC93D; text-shadow: 0 0 14px rgba(255,201,61,1), 0 0 34px rgba(255,160,20,.8), 0 2px 4px rgba(0,0,0,.45); }
@keyframes starBob { 0%,100% { translate: 0 0; scale: 1; } 50% { translate: 0 -4px; scale: 1.12; } }
.acrown { position: absolute; transform: translate(-50%, -135%); z-index: 3; pointer-events: none;
  transition: left .18s linear, top .18s linear; filter: drop-shadow(0 0 12px rgba(255,201,61,.9)); animation: starBob 2s ease-in-out infinite; }
.acrate { position: absolute; width: 10%; aspect-ratio: 1; transform: translate(-50%, -50%); z-index: 2; pointer-events: none;
  transition: left .18s linear, top .18s linear; display: flex; align-items: center; justify-content: center; font-size: 30px;
  background: linear-gradient(150deg, #B97B34, #8A5518); border: 3px solid #E8B96A; border-radius: 9px;
  box-shadow: 0 0 18px rgba(255,180,80,.5), 0 6px 12px rgba(0,0,0,.45), inset 0 0 0 3px rgba(0,0,0,.18); }
.agoal { position: absolute; z-index: 0; pointer-events: none; border: 3px dashed #3ED97E; border-radius: 10px;
  background: rgba(62,217,126,.14); box-shadow: 0 0 22px rgba(62,217,126,.5), inset 0 0 26px rgba(62,217,126,.28);
  display: flex; align-items: center; justify-content: center; color: #8FF5B8; font-family: 'Baloo 2', cursive; font-weight: 800; letter-spacing: 2px; animation: ringPulse 1.1s ease-in-out infinite alternate; }
.awallseg { position: absolute; z-index: 1; pointer-events: none; border-radius: 5px;
  background: linear-gradient(150deg, #5A4632, #3A2C1D); border: 2px solid rgba(232,185,106,.55); box-shadow: 0 3px 8px rgba(0,0,0,.5), inset 0 0 0 2px rgba(0,0,0,.25); }
.teambanner { background: linear-gradient(135deg, #FFD93D, #FF9F1C); color: #4A2503; border-radius: 18px; padding: 14px 18px; margin: 10px 0;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 23px; text-align: center; box-shadow: 0 0 26px rgba(255,190,60,.55), 0 8px 18px rgba(0,0,0,.25); }
.mydirs { display: flex; gap: 8px; justify-content: center; align-items: center; margin: 6px 0; font-weight: 800; }
.mydirs .dirarrow { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px;
  background: linear-gradient(180deg, #FFE066, #FFB03A); color: #4A2503; font-size: 28px; box-shadow: 0 0 16px rgba(255,190,60,.75), 0 4px 0 rgba(120,70,0,.55); }
.water { position: relative; height: 150px; border-radius: 18px; margin: 14px 0; overflow: hidden;
  background: linear-gradient(180deg, rgba(56,189,248,.16), rgba(2,80,130,.4) 55%, rgba(1,40,70,.55)); box-shadow: inset 0 0 44px rgba(0,0,0,.4); }
.aboat { position: absolute; bottom: 26px; font-size: 56px; line-height: 1; transform: translateX(-50%); transition: left .4s ease; filter: drop-shadow(0 6px 8px rgba(0,0,0,.45)); }
.buoy { position: absolute; right: 6px; bottom: 22px; font-size: 44px; line-height: 1; }
.beating { position: absolute; left: 50%; top: 44%; width: 118px; height: 118px; margin: -59px 0 0 -59px; border-radius: 50%; pointer-events: none;
  border: 5px solid rgba(255,224,102,.9); box-shadow: 0 0 22px rgba(255,210,80,.55), inset 0 0 18px rgba(255,210,80,.3); opacity: 0; }
.tapbtn.rowbtn { background: linear-gradient(180deg, #38BDF8, #0369A1); }
.tapbtn.rowbtn.now { background: linear-gradient(180deg, #FFE066, #FF9F1C); color: #4A2503; box-shadow: 0 0 34px rgba(255,200,60,.9); animation: pop .25s ease; }
.splatgrid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(18, 1fr); grid-template-rows: repeat(10, 1fr); gap: 2px; z-index: 0; }
.scell { border-radius: 3px; background: rgba(255,255,255,.07); }
.duel-bang { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 120px; line-height: 1.1; text-align: center; color: #FFC93D;
  text-shadow: 0 0 34px rgba(255,180,40,.75), 0 6px 0 #7C2D12, 0 12px 30px rgba(0,0,0,.55); animation: pop .3s ease; }
.gamecard.soon { cursor: default; opacity: .72; filter: saturate(.55); }
.cathead { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 26px; color: #7C4F27; margin: 20px 0 0; }
.ablob.hitflash svg { filter: brightness(2.6) saturate(.25) drop-shadow(0 0 16px #FF4757); }
.afield.slowmo .ablob, .afield.slowmo .aball { transition-duration: 1.15s; }
/* While the rAF interpolator is live it owns left/top on the movers:
   zero their CSS transitions so the two smoothing systems never stack
   (the loop itself applies the slow-mo time constant when .slowmo is
   on). Without rAF this rule never matches and transitions remain. */
.afield.raf-on .ablob, .afield.raf-on .aball, .afield.raf-on .ashell, .afield.raf-on .aslime,
.afield.raf-on .astar, .afield.raf-on .acrown, .afield.raf-on .acrate, .afield.raf-on .achar,
.afield.raf-on .tgem, .afield.raf-on .afrog, .afield.raf-on .sball, .afield.raf-on .fcrate,
.afield.raf-on .ffly { transition: none; }
/* Spawn pop for dynamically created field entities (shells, slimes,
   gems): the standalone scale property composes with the elements'
   own transform instead of overriding it. */
.pop { animation: spawnPop .3s ease-out; }
@keyframes spawnPop { 0% { scale: .2; opacity: 0; } 60% { scale: 1.22; opacity: 1; } 100% { scale: 1; opacity: 1; } }
/* Winner crown glow (podium + final screens). */
.crownglow { display: inline-block; filter: drop-shadow(0 0 14px rgba(255,201,61,.95)) drop-shadow(0 0 34px rgba(255,170,20,.55)); animation: crownPulse 1.5s ease-in-out infinite alternate; }
@keyframes crownPulse { from { transform: scale(1); } to { transform: scale(1.08); } }
/* Playlist builder: queue badges on game cards. */
.gamecard { position: relative; }
.plbadge { position: absolute; top: 8px; right: 8px; min-width: 30px; height: 30px; padding: 0 7px; border-radius: 999px; background: #fff; color: #333;
  font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 17px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,.35); }
.gamecard.plon { outline: 4px solid #fff; outline-offset: -4px; }
.gamecard.pllock { opacity: .62; }
.afield.pulse { animation: fieldPulse .22s ease; }
@keyframes fieldPulse { 0% { transform: scale(1); } 40% { transform: scale(1.012); } 100% { transform: scale(1); } }
.afield.shake { animation: shakeA .3s ease; }
.afield.shake-big { animation: shakeB .45s ease; }
@keyframes shakeA { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-4px,2px) rotate(-.4deg); } 55% { transform: translate(4px,-2px) rotate(.4deg); } 80% { transform: translate(-2px,-1px); } }
@keyframes shakeB { 0%,100% { transform: translate(0,0); } 18% { transform: translate(-9px,4px) rotate(-.8deg); } 42% { transform: translate(8px,-4px) rotate(.8deg); } 66% { transform: translate(-6px,-3px) rotate(-.5deg); } 85% { transform: translate(3px,2px); } }
.fx-spark { position: absolute; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; pointer-events: none; z-index: 4;
  transition: transform .6s ease-out, opacity .6s ease-out; box-shadow: 0 0 8px currentColor; }
.fx-ghost { position: absolute; transform: translate(-50%, -50%); opacity: .38; pointer-events: none; z-index: 1; transition: opacity .5s ease; }
.fx-trail { position: absolute; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px; border-radius: 50%; pointer-events: none; z-index: 1;
  background: radial-gradient(circle, rgba(255,190,90,.85), rgba(255,120,40,0) 70%); animation: trailFade .3s ease-out forwards; }
@keyframes trailFade { from { opacity: .85; transform: scale(1); } to { opacity: 0; transform: scale(.35); } }
.awarn { position: absolute; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%; pointer-events: none; z-index: 3;
  border: 3px solid #FF4757; box-shadow: 0 0 14px rgba(255,71,87,.8), inset 0 0 10px rgba(255,71,87,.5); animation: warnPulse .28s ease-in-out 2; }
@keyframes warnPulse { 0% { transform: scale(.6); opacity: .4; } 50% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(.9); opacity: .7; } }
.ko-banner { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%) scale(.4); opacity: 0; z-index: 6;
  text-align: center; pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
.ko-banner.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.ko-txt { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 86px; line-height: 1; color: #FF4757; letter-spacing: 2px;
  text-shadow: 0 0 26px rgba(255,71,87,.85), 0 5px 0 #5C0A12, 0 10px 26px rgba(0,0,0,.5); }
.ko-sub { display: inline-block; margin-top: 8px; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 21px; color: #fff;
  background: rgba(5,8,18,.6); padding: 3px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); }
.ko-big { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 66px; line-height: 1.05; color: #FF4757; letter-spacing: 2px;
  text-shadow: 0 0 24px rgba(255,71,87,.85), 0 5px 0 #5C0A12; animation: cdPunch .5s ease; }
.aname { display: inline-block; font-weight: 700; font-size: 15px; color: #fff; background: rgba(5,8,18,.55); padding: 1px 10px;
  border-radius: 999px; border: 1px solid rgba(255,255,255,.28); margin-top: 1px; }
.alives { font-size: 11px; color: #FFD7DE; letter-spacing: 1px; text-shadow: 0 1px 0 rgba(0,0,0,.35); min-height: 14px; }
.padwrap { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; }
.dpad { display: grid; grid-template-columns: repeat(3, 62px); grid-template-rows: repeat(3, 62px); gap: 4px; }
.dbtn { border: none; border-radius: 16px; background: rgba(255,255,255,.92); color: #4A3226; font-size: 24px;
  box-shadow: 0 5px 0 rgba(0,0,0,.25); touch-action: none; user-select: none; -webkit-user-select: none; }
.dbtn:active { background: #FFD98E; }
.abtns { display: flex; gap: 12px; align-items: center; }
.disc { position: relative; width: 190px; height: 190px; border-radius: 50%; flex: none;
  background: radial-gradient(circle at 50% 38%, #2A3852, #131A29 72%);
  border: 1px solid rgba(140,180,255,.4); box-shadow: 0 6px 0 rgba(0,0,0,.45), 0 0 16px rgba(90,150,255,.22), inset 0 0 22px rgba(0,0,0,.5);
  touch-action: none; user-select: none; -webkit-user-select: none; }
.disc svg { display: block; width: 100%; height: 100%; pointer-events: none; }
.disc .seg { fill: rgba(140,180,255,.10); }
.disc .segarr { fill: #8FB4E8; }
.disc .hub { fill: #1B2740; stroke: rgba(140,180,255,.45); stroke-width: 1.2; }
.disc[data-u="1"] .seg-u, .disc[data-d="1"] .seg-d, .disc[data-l="1"] .seg-l, .disc[data-r="1"] .seg-r { fill: rgba(120,190,255,.55); }
.disc[data-u="1"] .arr-u, .disc[data-d="1"] .arr-d, .disc[data-l="1"] .arr-l, .disc[data-r="1"] .arr-r { fill: #FFFFFF; }
.abtns.dia { display: grid; grid-template-columns: repeat(3, 58px); grid-template-rows: repeat(3, 58px); gap: 2px; }
.abtns.dia .abtn { width: 58px; height: 58px; font-size: 19px; }
.abtns.dia .abtn span { font-size: 8.5px; }
.xbtn { background: #7A4FD0; }
.ybtn { background: #D9A514; }
.stage .xbtn { background: linear-gradient(180deg, #A678FF, #6A32C8); box-shadow: 0 6px 0 rgba(0,0,0,.5), 0 0 20px rgba(150,100,255,.5); }
.stage .ybtn { background: linear-gradient(180deg, #FFC93D, #D9930D); box-shadow: 0 6px 0 rgba(0,0,0,.5), 0 0 20px rgba(255,190,60,.5); }
.abtn { width: 78px; height: 78px; border-radius: 50%; border: none; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 25px;
  color: #fff; box-shadow: 0 6px 0 rgba(0,0,0,.25); touch-action: none; user-select: none; -webkit-user-select: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; }
.abtn span { font-size: 11px; font-family: 'Quicksand', sans-serif; font-weight: 700; }
.abtnA { background: #E84F4F; }
.bbtn { background: #4FA8E8; width: 64px; height: 64px; font-size: 20px; }
.stage .dbtn { background: linear-gradient(180deg, #26314A, #131A29); color: #DCE6FF; border: 1px solid rgba(140,180,255,.4);
  box-shadow: 0 5px 0 rgba(0,0,0,.5), 0 0 12px rgba(90,150,255,.22); }
.stage .dbtn:active { background: linear-gradient(180deg, #37507E, #1D2C47); transform: scale(.93);
  box-shadow: 0 2px 0 rgba(0,0,0,.5), 0 0 22px rgba(120,190,255,.75); }
.stage .abtn { box-shadow: 0 6px 0 rgba(0,0,0,.5); }
.stage .abtnA { background: linear-gradient(180deg, #FF6B5E, #D81F3C); box-shadow: 0 6px 0 rgba(0,0,0,.5), 0 0 22px rgba(255,60,80,.55); }
.stage .abtn:active { transform: scale(.93); }
.stage .bbtn { background: linear-gradient(180deg, #57B6FF, #1D6FD1); box-shadow: 0 6px 0 rgba(0,0,0,.5), 0 0 20px rgba(80,160,255,.5); }
input[type=text], input[type=tel] { font-family: 'Quicksand', sans-serif; font-weight: 700; font-size: 19px; color: #4A3226;
  border: 3px solid #FFE3B3; border-radius: 16px; padding: 12px 16px; background: #FFFDF8; outline: none; }
.digits { display: flex; gap: 8px; justify-content: center; }
.digits input { width: 48px; height: 60px; text-align: center; font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 30px; padding: 4px; }
#toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); background: #4A3226; color: #FFF3DF; font-weight: 700;
  padding: 12px 22px; border-radius: 999px; box-shadow: 0 12px 24px rgba(0,0,0,.3); display: none; z-index: 50; max-width: 92vw; text-align: center; }
#recon { position: fixed; left: 50%; top: 16px; transform: translateX(-50%); background: #B3261E; color: #FFE9E6; font-weight: 700;
  padding: 9px 18px; border-radius: 999px; box-shadow: 0 10px 22px rgba(0,0,0,.35); display: none; z-index: 60; max-width: 92vw; text-align: center; }
#confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 40; }
#confetti .cf { position: absolute; top: -20px; width: 10px; height: 15px; border-radius: 2px; animation-name: fall; animation-timing-function: linear; animation-fill-mode: forwards; }
@keyframes fall { to { transform: translateY(108vh) rotate(680deg); } }
.rev { opacity: 0; transform: translateY(8px); transition: opacity .3s, transform .3s; }
.rev.shown { opacity: 1; transform: none; }
.topbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.topbar .sp { flex: 1; }
.small { font-size: 14px; } .muted { color: #9C744C; font-weight: 700; }
@media (max-width: 720px) { .seats { grid-template-columns: repeat(2, 1fr); } .logo .word { font-size: 42px; } .codebox { width: 46px; height: 58px; font-size: 32px; } .cdnum { font-size: 110px; } .bigcircle { width: 200px; height: 200px; font-size: 27px; } }
/* --- Fullscreen stage pass -------------------------------------------------
   While a game is on (a .stage is a direct child of #app, host OR phone),
   the page wrapper goes near-full-bleed and the in-game chrome collapses
   to one compact chip row, so the play field owns the screen. The square
   fields (.afield / .ngboard) are sized by the dvh-based formulas on their
   own rules above; everything here is presentation only — positions in
   the field stay %-based, so the rAF interpolator is unaffected. In
   browsers without :has() these rules simply never match and the classic
   layout remains. */
#app:has(> .stage) { max-width: none; padding: 8px 6px 12px; }
#app:has(> .stage) .topbar { margin-bottom: 4px; }
#app:has(> .stage) .topbar .btn.small { padding: 5px 12px; font-size: 13px; }
#app:has(> .stage) .scorebar { margin: 4px 0; gap: 6px; }
#app:has(> .stage) .scorechip { font-size: 13px; padding: 2px 10px 2px 4px; }
#app:has(> .stage) .scorechip svg { width: 20px; height: 20px; }
#app:has(> .stage) > .gapline { display: none; }
.stage p.center { font-size: 13.5px; margin: 6px 0 0; line-height: 1.35; }
.stage .chatrow { padding: 5px 10px; margin: 4px 0; font-size: 14px; }
.stage .tbar { margin: 6px 0; }
.stage .diceface { width: 48px; height: 48px; font-size: 29px; border-radius: 12px; }
/* Text/card stages (quiz, werewolf village, rope, rowing…) widen to a
   generous cap instead of stretching edge-to-edge on a TV; field stages
   are excluded — they take the whole bleed. */
.stage:not(:has(.afield)):not(:has(.ngboard)) { max-width: 1180px; margin-left: auto; margin-right: auto; }
@media (min-width: 721px) {
  /* On TV-sized host screens the brand + room chip leave the play HUD:
     only the functional buttons (sound / fullscreen / leave) stay. */
  #app:has(> .stage) .topbar .baloo, #app:has(> .stage) .topbar .chip { display: none; }
}
@media (min-width: 900px) {
  /* The host's "Đổi game ✕" escape floats on the score row instead of
     eating its own line above the stage. */
  #app:has(> .stage) { position: relative; }
  #app:has(> .stage) > p:has(> [data-cmd="quitGame"]) { position: absolute; top: 44px; right: 8px; margin: 0 !important; z-index: 7; }
  #app:has(> .stage) > .scorebar { padding-right: 138px; }
}
/* Big-screen lobby / chooser / podium: use the width a TV offers.
   Phone widths are untouched (these rules start at 1500px). */
@media (min-width: 1500px) {
  .wrap { max-width: 1760px; }
  .stage:not(:has(.afield)):not(:has(.ngboard)) { max-width: 1760px; }
  .rows { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; align-content: start; }
  .wolfgrid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
  .games { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
  .seats { grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); }
  .pod { width: 185px; }
}
/* --- 16:9 play HUD ---------------------------------------------------------
   render() stamps .playhud on #app while the host shows a field game:
   the title, timer bar, score chips and hint float OVER the stage so
   the field itself can span the TV (16:9, ~91% of a 1920px width). */
#app.playhud .stage { padding: 8px 10px; }
#app.playhud .stage > h2 { position: absolute; top: 12px; left: 18px; z-index: 8; margin: 0; pointer-events: none; font-size: 22px; }
@media (min-width: 1100px) { #app.playhud .stage:has(> #afield) > .baloo { position: absolute; top: 12px; left: 300px; right: 300px; z-index: 8; margin: 0; text-align: center; pointer-events: none; } }
#app.playhud .stage > .scorebar { position: absolute; top: 10px; right: 14px; z-index: 8; margin: 0; max-width: 62%; justify-content: flex-end; pointer-events: none; }
#app.playhud .stage > .tbar { position: absolute; top: 0; left: 0; right: 0; height: 6px; margin: 0; border-radius: 0; z-index: 9; }
#app.playhud .stage > p.center { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 8; margin: 0; max-width: 94%; padding: 5px 16px; border-radius: 999px; background: rgba(10,8,20,.55); pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#app.playhud .afield:not(.wide) { width: min(100%, calc((100vh - 104px) * 16 / 9)); width: min(100%, calc((100dvh - 104px) * 16 / 9)); margin: 0 auto; }
#app.playhud .topbar { margin-bottom: 2px; }
/* PERF MODE: while a field game is playing, render() stamps .perf on
   #app (both roles) and every decorative INFINITE animation freezes.
   An infinite animation on a full-screen stage forces the compositor
   to repaint forever — the filter ones (ringPulse brightness on the
   giant ring, poolGlow on temple pools) are the worst. One-shot
   feedback (spawnPop, boomPop, trailFade, shakes, pops) is untouched.
   Gameplay signals stay live below: a pulsing bomb is a fuse timer and
   the warning marker means incoming fire — information, not decor. */
#app.perf .blobbob, #app.perf .tpool, #app.perf .tpool::after, #app.perf .tgem i,
#app.perf .ffly, #app.perf .pip.now, #app.perf .aring.danger, #app.perf .astar,
#app.perf .acrown, #app.perf .agoal, #app.perf .crownglow { animation-play-state: paused; }
/* Spawned movers carry .pop (one-shot spawnPop from scale .2): the
   pause above must never freeze THAT animation, or a spawned star
   stays a ~7px dot for the whole match — exactly what happened in
   Cuop Sao, where a human player saw no stars while bots farmed
   them. One-shot pops always run. */
#app.perf .pop { animation-play-state: running; }
#app.perf .abomb, #app.perf .awarn { animation-play-state: running; }
/* PERF MODE also sheds the per-frame paint cost: a drop-shadow filter
   on a MOVING element re-rasterizes its blur every frame, and the
   player blobs wear one each. During field play the glow goes (the
   crown holder keeps a single cheaper shadow — one element only);
   everything returns when the game ends. */
#app.perf .ablob svg, #app.perf .afrog svg, #app.perf .afrog.carry svg { filter: none; }
#app.perf .ablob.holder svg { filter: drop-shadow(0 0 10px #FFC93D); }
/* Same logic for paint: a moving element's box-shadow forces the
   browser to repaint its blurred halo every frame, and Né Đạn
   fills the field with triple-shadowed balls plus trail ghosts.
   During field play the glow shadows go; the shapes keep their
   gradient bodies, so the field still reads at a glance. */
#app.perf .aball, #app.perf .ashell, #app.perf .fx-trail, #app.perf .aring { box-shadow: none; }
/* LITE MODE (adaptive, set by rafLoop when this device cannot hold
   ~45fps): shed shadows and blur filters page-wide until frames
   recover. A plain smooth game beats a pretty slideshow. */
body.lite .ablob svg, body.lite .afrog svg, body.lite .ablob.holder svg, body.lite .abomb, body.lite .acrystal, body.lite .astar, body.lite .aboat, body.lite .crownglow { filter: none !important; }
body.lite #afield, body.lite .card, body.lite .gamecard { box-shadow: none !important; }
body.lite .aball, body.lite .ashell, body.lite .aring, body.lite .ablob { box-shadow: none !important; }
/* Live device meter (fps / ping / push cadence) shown while playing. */
#netmeter { position: fixed; left: 10px; bottom: 10px; z-index: 9998; background: rgba(10,10,20,.72); color: #B7F0C0; font: 700 12px/1.5 system-ui, sans-serif; padding: 3px 9px; border-radius: 999px; cursor: pointer; user-select: none; }
/* Local keyboard players: per-seat overlay panels on the host screen.
   The container is created by JS and appended to <body> (never inside
   #app, whose innerHTML render() rebuilds); panels are display-only —
   pointer-events none — because input arrives via window keyboard
   handlers, and peek/cursor state lives in the LK object, not the DOM. */
#localpanels { position: fixed; inset: 0; pointer-events: none; z-index: 55; }
.lpanel { position: absolute; width: 302px; max-width: 44vw; background: rgba(17,12,30,.9); color: #FFF3DC; border: 2px solid rgba(255,255,255,.16); border-radius: 14px; padding: 9px 12px 10px; font-size: 14.5px; line-height: 1.35; box-shadow: 0 10px 26px rgba(0,0,0,.5); }
.lpanel.lp0 { left: 10px; bottom: 10px; }
.lpanel.lp1 { right: 10px; bottom: 10px; }
.lpanel.lp2 { left: 10px; top: 66px; }
.lpanel.lp3 { right: 10px; top: 66px; }
.lphead { display: flex; align-items: center; gap: 7px; font-family: 'Baloo 2', cursive; font-size: 16.5px; margin-bottom: 3px; }
.lpdot { flex: none; width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 -3px 0 rgba(0,0,0,.25), 0 0 0 2px rgba(255,255,255,.25); }
.lpscheme { margin-left: auto; font-size: 12px; opacity: .75; font-family: 'Quicksand', sans-serif; font-weight: 700; }
.lpline { margin: 2px 0; }
.lpsecret { background: rgba(255,201,61,.14); border: 1px dashed rgba(255,201,61,.55); border-radius: 9px; padding: 5px 8px; margin: 3px 0; }
.lplist { margin: 4px 0 2px; }
.lprow { padding: 3px 9px; border-radius: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lprow.cur { background: rgba(255,201,61,.3); outline: 1.5px solid #FFC93D; }
.lpfoot { font-size: 12px; opacity: .7; margin-top: 2px; }
/* Phone mode (hostSeat): the invite-link row in the lobby, the
   my-seat section under the stage on the host page, and the recent
   room chips on the home screen. */
.shareurl { width: min(88vw, 520px); text-align: center; font-size: 15px; font-weight: 700; padding: 9px 10px; border-radius: 12px; border: 2px solid #EBD9BE; background: #FFFDF8; color: #4A3226; }
#myseat { border: 3px solid #FFD98E; margin-top: 12px; }
#myseat.phonemode { border-color: #58C472; box-shadow: 0 14px 34px rgba(55,154,84,.28); }
button.recentchip { cursor: pointer; border: none; font-family: inherit; }
</style>
</head>
<body>
<div id="app" class="wrap"></div>
<div id="confetti"></div>
<div id="toast"></div>
<div id="recon">Đang kết nối lại…</div>
<script>
var COLORS = { blue: '#4FA8E8', pink: '#F77FB0', green: '#58C472', purple: '#A78BFA', orange: '#FFB35C', red: '#E84F4F', cyan: '#38C6D9', yellow: '#FFC93D', lime: '#9BC53D', brown: '#B07B4F', silver: '#B8C4CE', magenta: '#D63FD0' };
var LIGHT = { blue: '#9AD1F5', pink: '#FFB3D1', green: '#A9E8B2', purple: '#CDBFFD', orange: '#FFD29B', red: '#FF9D9D', cyan: '#9AE8F5', yellow: '#FFE28A', lime: '#D3EC9B', brown: '#D9B48F', silver: '#E4EBF0', magenta: '#F2A3EC' };
var SYMNAMES = ['ĐỎ', 'XANH', 'VÀNG', 'HỒNG'];
var SYMCOLORS = ['#FF4757', '#3FA9F5', '#FFC93D', '#F77FB0'];
var LETTERS = ['A', 'B', 'C', 'D'];
var WOLF_ROLE_NAMES = { soi: 'Sói 🐺', 'tien-tri': 'Tiên Tri 🔮', 'bao-ve': 'Bảo Vệ 🛡️', 'phu-thuy': 'Phù Thủy 🧙', dan: 'Dân Làng 🧑‍🌾' };
var DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
var TL_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
var TL_SUITS = ['♠', '♣', '♦', '♥'];
var TL_KIND_NAMES = { single: 'Đơn', pair: 'Đôi', triple: 'Ba con', quad: 'TỨ QUÝ', seq: 'Sảnh', dseq: 'ĐÔI THÔNG' };
var TL_IW_NAMES = { dragon: 'SẢNH RỒNG', sixpairs: 'SÁU ĐÔI', quad3: 'TỨ QUÝ 3', dseq4: 'BỐN ĐÔI THÔNG' };
function tlCardLabel(id) { return TL_RANKS[id % 13] + TL_SUITS[Math.floor(id / 13)]; }
function tlCardRed(id) { var s = Math.floor(id / 13); return s === 2 || s === 3; }
function tlChipsHTML(cards, sm) {
  var h = '';
  for (var i = 0; i < cards.length; i++) h += '<span class="tlcard2' + (sm ? ' sm' : '') + (tlCardRed(cards[i]) ? ' red' : '') + '">' + tlCardLabel(cards[i]) + '</span>';
  return h;
}
// Rendering is deliberately PLAIN (user's order after the A/B
// experiment builds): world movers dead-reckon from the newest
// anchor — no interpolation buffer, no smoothing spring — and
// decorative effects stay muted during play (see fxMuted).
var S = { role: null, code: null, token: null, seat: null, view: null, sig: '', serverOffset: 0,
  audio: null, muted: localStorage.getItem('np_muted') === '1', lastCd: -1, lastTickSec: -1,
  fxReveal: '', fxRound: '', fxConfetti: '', blobN: 0, fxP: null, _nb: null, _koT: 0, _smT: 0,
  plMode: false, plQueue: [], raf: {}, rafLast: 0,
  phoneMode: false, mySeatSig: '', myTlSel: [], myTlSig: '',
  lastOkAt: 0, lastWsAt: 0 };
function el(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;'); }
function fmt(n) { var s = String(Math.round(Math.abs(n))); var out = ''; while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); } return (n < 0 ? '-' : '') + s + out; }
function playerOf(v, seat) { for (var i = 0; i < v.players.length; i++) if (v.players[i].seat === seat) return v.players[i]; return null; }
function gameMeta(v, id) { if (!v || !v.games) return null; for (var i = 0; i < v.games.length; i++) if (v.games[i].id === id) return v.games[i]; return null; }
function seatLocked(gm, n) { return !!gm && ((gm.min && n < gm.min) || (gm.max && n > gm.max)); }
function toast(msg) { var t = el('toast'); t.textContent = msg; t.style.display = 'block'; setTimeout(function () { t.style.display = 'none'; }, 3200); }
function blobSVG(color, mood, size) {
  S.blobN += 1;
  var gid = 'bg' + S.blobN;
  var c = COLORS[color] || COLORS.blue; var l = LIGHT[color] || LIGHT.blue;
  var eyes = '', mouth = '';
  if (mood === 'reo') {
    eyes = '<path d="M28 50 Q35 41 42 50" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M58 50 Q65 41 72 50" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
    mouth = '<ellipse cx="50" cy="65" rx="9" ry="11" fill="#4A3226"/><ellipse cx="50" cy="69" rx="5.5" ry="4.5" fill="#F77FB0"/>';
  } else if (mood === 'ngacnhien') {
    eyes = '<circle cx="35" cy="48" r="6.5" fill="#4A3226"/><circle cx="65" cy="48" r="6.5" fill="#4A3226"/>';
    mouth = '<circle cx="50" cy="67" r="5.5" fill="#4A3226"/>';
  } else if (mood === 'buon') {
    eyes = '<circle cx="35" cy="50" r="5" fill="#4A3226"/><circle cx="65" cy="50" r="5" fill="#4A3226"/><path d="M27 40 L43 45 M73 40 L57 45" stroke="#4A3226" stroke-width="4" stroke-linecap="round"/>';
    mouth = '<path d="M36 72 Q50 61 64 72" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
  } else if (mood === 'ngu') {
    eyes = '<path d="M28 49 Q35 55 42 49" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M58 49 Q65 55 72 49" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
    mouth = '<path d="M44 66 Q50 69 56 66" stroke="#4A3226" stroke-width="4" fill="none" stroke-linecap="round"/>';
    mouth += '<text x="72" y="26" font-size="17" font-weight="bold" fill="#8A5A33">Z</text><text x="82" y="16" font-size="12" font-weight="bold" fill="#8A5A33">z</text>';
  } else {
    eyes = '<circle cx="35" cy="48" r="5" fill="#4A3226"/><circle cx="65" cy="48" r="5" fill="#4A3226"/>';
    mouth = '<path d="M34 61 Q50 75 66 61" stroke="#4A3226" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100">'
    + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + l + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs>'
    + '<path d="M50 4 C74 4 96 26 96 52 C96 79 75 96 50 96 C25 96 4 79 4 52 C4 26 26 4 50 4 Z" fill="url(#' + gid + ')"/>'
    + '<ellipse cx="34" cy="27" rx="16" ry="9" fill="#ffffff" opacity="0.38" transform="rotate(-18 34 27)"/>'
    + eyes + mouth + '</svg>';
}
function crownSVG(size) {
  return '<svg width="' + size + '" height="' + Math.round(size * 0.62) + '" viewBox="0 0 100 62"><path d="M6 56 L13 16 L35 36 L50 8 L65 36 L87 16 L94 56 Z" fill="#FFC93D" stroke="#E0A92E" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="44" r="5" fill="#F77FB0"/></svg>';
}
var DARK = { blue: '#1D5C8F', pink: '#B23A72', green: '#2E7D46', purple: '#5F43B8', orange: '#C77414', red: '#A52A2A', cyan: '#177E8C', yellow: '#B8860B', lime: '#5F7D1E', brown: '#7A4A21', silver: '#6E7B87', magenta: '#8F2A87' };
function orbSVG(color, size, ko) {
  S.blobN += 1;
  var gid = 'og' + S.blobN;
  var c = COLORS[color] || COLORS.blue; var l = LIGHT[color] || LIGHT.blue; var d = DARK[color] || DARK.blue;
  var visor;
  if (ko) {
    visor = '<path d="M29 41 L44 56 M44 41 L29 56 M56 41 L71 56 M71 41 L56 56" stroke="#0B1020" stroke-width="5.5" stroke-linecap="round" fill="none"/>'
      + '<path d="M50 63 L45 75 L53 81" stroke="rgba(11,16,32,.5)" stroke-width="3" fill="none" stroke-linecap="round"/>';
  } else {
    visor = '<path d="M15 39 L85 39 L78 58 Q50 67 22 58 Z" fill="#0B1020"/>'
      + '<path d="M15 39 L85 39 L82 48 L18 48 Z" fill="#1B2742"/>'
      + '<path d="M27 52.5 L50 58 L73 52.5" stroke="' + l + '" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="50" cy="44" r="2.4" fill="' + l + '"/>';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100">'
    + '<defs><radialGradient id="' + gid + '" cx="0.35" cy="0.3" r="0.95"><stop offset="0" stop-color="' + l + '"/><stop offset="0.45" stop-color="' + c + '"/><stop offset="1" stop-color="' + d + '"/></radialGradient></defs>'
    + '<circle cx="50" cy="50" r="46" fill="url(#' + gid + ')"/>'
    + '<path d="M19 65 Q50 87 81 65" stroke="' + l + '" stroke-width="3" fill="none" opacity="0.45" stroke-linecap="round"/>'
    + visor
    + '<ellipse cx="33" cy="23" rx="14" ry="7.5" fill="#ffffff" opacity="0.55" transform="rotate(-20 33 23)"/>'
    + '</svg>';
}
// Neon stick fighter for Người Que Đại Chiến: round head + line limbs,
// the pose follows live state (idle / run / air / atk arm swing / hit),
// and the punching arm points the fighter's facing way.
function stickSVG(colorName, pose, face) {
  var c = COLORS[colorName] || '#fff';
  var f = face < 0 ? -1 : 1;
  var arms, legs;
  if (pose === 'run') { arms = [[13, 15], [35, 24]]; legs = [[13, 37], [34, 40]]; }
  else if (pose === 'air') { arms = [[13, 12], [35, 12]]; legs = [[16, 39], [33, 36]]; }
  else if (pose === 'atk') { arms = f > 0 ? [[42, 17], [16, 27]] : [[6, 17], [32, 27]]; legs = [[15, 39], [33, 40]]; }
  else if (pose === 'atkh') { arms = f > 0 ? [[47, 14], [10, 30]] : [[1, 14], [38, 30]]; legs = [[13, 40], [35, 41]]; }
  else if (pose === 'hit') { arms = [[12, 10], [36, 10]]; legs = [[14, 40], [34, 40]]; }
  else { arms = [[15, 26], [33, 26]]; legs = [[17, 41], [31, 41]]; }
  var s = '<svg width="64" height="64" viewBox="0 0 48 48">';
  s += '<circle cx="24" cy="9" r="6.5" fill="' + c + '" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/>';
  s += '<g stroke="' + c + '" stroke-width="4" stroke-linecap="round">';
  s += '<line x1="24" y1="15" x2="24" y2="29"/>';
  s += '<line x1="24" y1="19" x2="' + arms[0][0] + '" y2="' + arms[0][1] + '"/>';
  s += '<line x1="24" y1="19" x2="' + arms[1][0] + '" y2="' + arms[1][1] + '"/>';
  s += '<line x1="24" y1="29" x2="' + legs[0][0] + '" y2="' + legs[0][1] + '"/>';
  s += '<line x1="24" y1="29" x2="' + legs[1][0] + '" y2="' + legs[1][1] + '"/>';
  s += '</g>';
  // Heavy swing: the punching arm is redrawn twice as thick so the
  // big wind-up reads at TV distance.
  if (pose === 'atkh') s += '<line x1="24" y1="19" x2="' + arms[0][0] + '" y2="' + arms[0][1] + '" stroke="' + c + '" stroke-width="7.5" stroke-linecap="round" opacity="0.85"/>';
  return s + '</svg>';
}
// Temple characters for Đền Lửa & Nước: a neon flame (Lửa) or droplet
// (Nước), trimmed with the player's own seat colour.
function charSVG(el, colorName) {
  var trim = COLORS[colorName] || '#fff';
  if (el === 'lua') {
    return '<svg width="52" height="57" viewBox="0 0 40 44">'
      + '<path d="M20 2 C24.5 10 30 14.5 30 24 a10 11 0 1 1 -20 0 C10 14.5 15.5 10 20 2 Z" fill="#FF5A3C" stroke="' + trim + '" stroke-width="2.6"/>'
      + '<path d="M20 16 C22.5 20.5 25 22.8 25 27.5 a5 5.5 0 1 1 -10 0 C15 22.8 17.5 20.5 20 16 Z" fill="#FFC93D"/>'
      + '<circle cx="16.5" cy="27" r="1.7" fill="#5B1503"/><circle cx="23.5" cy="27" r="1.7" fill="#5B1503"/></svg>';
  }
  return '<svg width="52" height="57" viewBox="0 0 40 44">'
    + '<path d="M20 3 C25 12 30 18 30 26 a10 10.5 0 1 1 -20 0 C10 18 15 12 20 3 Z" fill="#3FA9F5" stroke="' + trim + '" stroke-width="2.6"/>'
    + '<ellipse cx="15.5" cy="25" rx="2.6" ry="4" fill="rgba(255,255,255,.55)"/>'
    + '<circle cx="16.5" cy="27" r="1.7" fill="#06283D"/><circle cx="23.5" cy="27" r="1.7" fill="#06283D"/></svg>';
}
// Đá Bóng Đầu To players: an oversized round head in the player's own
// seat colour on a tiny team-coloured body — the head IS the hitbox star.
function bigHeadSVG(colorName, team) {
  var col = COLORS[colorName] || '#4FA8E8';
  var light = LIGHT[colorName] || '#FFFFFF';
  var shirt = team === 'do' ? '#E84F4F' : '#3FA9F5';
  return '<svg width="52" height="56" viewBox="0 0 52 56">'
    + '<path d="M18 46 h6 l-1.5 8 h-5 Z" fill="#26324A"/><path d="M28 46 h6 l1.5 8 h-5 Z" fill="#26324A"/>'
    + '<rect x="14" y="36" width="24" height="11" rx="5" fill="' + shirt + '" stroke="rgba(0,0,0,.3)" stroke-width="1.6"/>'
    + '<circle cx="26" cy="21" r="17" fill="' + col + '" stroke="rgba(0,0,0,.28)" stroke-width="2"/>'
    + '<ellipse cx="20" cy="14" rx="6.5" ry="4" fill="' + light + '" opacity=".75"/>'
    + '<circle cx="20.5" cy="22" r="2.2" fill="#14202E"/><circle cx="31.5" cy="22" r="2.2" fill="#14202E"/>'
    + '<path d="M21 29 Q26 32.5 31 29" stroke="#14202E" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
}
// Ếch Ộp frogs: a round frog in the seat colour; a carrying frog is
// drawn bigger with the passenger's colour glowing in its belly.
function frogSVG(colorName, bellyColorName) {
  var col = COLORS[colorName] || '#58C472';
  var light = LIGHT[colorName] || '#D8F5C8';
  var belly = bellyColorName ? (COLORS[bellyColorName] || '#FFFFFF') : 'rgba(255,255,255,.55)';
  var size = bellyColorName ? 56 : 46;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48">'
    + '<circle cx="15" cy="11" r="6.5" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/>'
    + '<circle cx="33" cy="11" r="6.5" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/>'
    + '<circle cx="15" cy="11" r="2.6" fill="#12240F"/><circle cx="33" cy="11" r="2.6" fill="#12240F"/>'
    + '<ellipse cx="24" cy="28" rx="19" ry="16.5" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1.8"/>'
    + '<ellipse cx="24" cy="33" rx="11.5" ry="8.5" fill="' + belly + '"/>'
    + '<ellipse cx="17" cy="21" rx="5.5" ry="3.2" fill="' + light + '" opacity=".8"/>'
    + '<path d="M17 27 Q24 31.5 31 27" stroke="#12240F" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
}
// Chung Một Thân: the shared blob is a WHITE orb wearing the neon visor,
// ringed by four quarter arcs — one per direction, stroked in the seat
// colour of the player who owns that direction (up/right/down/left).
function sharedOrbSVG(v, size) {
  S.blobN += 1;
  var gid = 'sg' + S.blobN;
  var dirs = [['u', -90], ['r', 0], ['d', 90], ['l', 180]];
  var arcs = '';
  for (var i = 0; i < 4; i++) {
    var seat = v.game.owners ? v.game.owners[dirs[i][0]] : null;
    var p = seat ? playerOf(v, seat) : null;
    var col = p ? (COLORS[p.color] || '#FFFFFF') : '#FFFFFF';
    var a0 = (dirs[i][1] - 40) * Math.PI / 180, a1 = (dirs[i][1] + 40) * Math.PI / 180;
    var x0 = Math.round((50 + 46 * Math.cos(a0)) * 10) / 10, y0 = Math.round((50 + 46 * Math.sin(a0)) * 10) / 10;
    var x1 = Math.round((50 + 46 * Math.cos(a1)) * 10) / 10, y1 = Math.round((50 + 46 * Math.sin(a1)) * 10) / 10;
    arcs += '<path d="M' + x0 + ' ' + y0 + ' A46 46 0 0 1 ' + x1 + ' ' + y1 + '" stroke="' + col + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
  }
  var visor = '<path d="M15 39 L85 39 L78 58 Q50 67 22 58 Z" fill="#0B1020"/>'
    + '<path d="M15 39 L85 39 L82 48 L18 48 Z" fill="#1B2742"/>'
    + '<path d="M27 52.5 L50 58 L73 52.5" stroke="#FFE066" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="50" cy="44" r="2.4" fill="#FFE066"/>';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100">'
    + '<defs><radialGradient id="' + gid + '" cx="0.35" cy="0.3" r="0.95"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#E8ECF5"/><stop offset="1" stop-color="#9AA7C2"/></radialGradient></defs>'
    + '<circle cx="50" cy="50" r="44" fill="url(#' + gid + ')"/>'
    + arcs
    + visor
    + '<ellipse cx="33" cy="23" rx="13" ry="7" fill="#ffffff" opacity="0.6" transform="rotate(-20 33 23)"/>'
    + '</svg>';
}
function ac() {
  if (!S.audio) { try { S.audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { S.audio = null; } }
  if (S.audio && S.audio.state === 'suspended') S.audio.resume();
  return S.audio;
}
function beep(freq, dur, type, vol, delay) {
  if (S.muted) return;
  var ctx = ac(); if (!ctx) return;
  var t0 = ctx.currentTime + (delay || 0);
  var o = ctx.createOscillator(); var gn = ctx.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  gn.gain.setValueAtTime(vol || 0.14, t0);
  gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(gn); gn.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function sfxTap() { beep(620, 0.06, 'triangle', 0.12); }
function sfxCorrect() { beep(660, 0.09, 'sine', 0.16); beep(880, 0.14, 'sine', 0.16, 0.08); }
function sfxWrong() { beep(200, 0.16, 'sawtooth', 0.08); beep(140, 0.2, 'sawtooth', 0.08, 0.1); }
function sfxWin() { var n = [523, 659, 784, 1046]; for (var i = 0; i < n.length; i++) beep(n[i], 0.16, 'triangle', 0.16, i * 0.1); }
function sfxCount(last) { beep(last ? 990 : 660, last ? 0.22 : 0.09, 'square', 0.1); }
function noiseBuf() {
  var ctx = ac(); if (!ctx) return null;
  if (S._nb) return S._nb;
  var len = Math.floor(ctx.sampleRate * 0.5);
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var ch = buf.getChannelData(0);
  for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  S._nb = buf; return buf;
}
function noiseBurst(dur, f0, f1, vol) {
  if (S.muted) return;
  var ctx = ac(); if (!ctx) return;
  var buf = noiseBuf(); if (!buf) return;
  var t0 = ctx.currentTime;
  var src = ctx.createBufferSource(); src.buffer = buf;
  var fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 1.1;
  fl.frequency.setValueAtTime(f0, t0);
  fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
  var gn = ctx.createGain();
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(fl); fl.connect(gn); gn.connect(ctx.destination);
  src.start(t0); src.stop(t0 + dur + 0.05);
}
function toneDrop(f0, f1, dur, vol) {
  if (S.muted) return;
  var ctx = ac(); if (!ctx) return;
  var t0 = ctx.currentTime;
  var o = ctx.createOscillator(); var gn = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(gn); gn.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function sfxThud() { toneDrop(120, 42, 0.16, 0.32); noiseBurst(0.08, 900, 300, 0.1); }
function sfxBoom() { toneDrop(90, 30, 0.5, 0.42); noiseBurst(0.42, 500, 90, 0.22); }
function sfxWhoosh() { noiseBurst(0.22, 2400, 500, 0.13); }
function sfxDash() { noiseBurst(0.16, 900, 2600, 0.09); }
function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
function confetti(waves) {
  var box = el('confetti'); if (!box) return;
  var colors = ['#F77FB0', '#4FA8E8', '#58C472', '#A78BFA', '#FFB35C', '#FFC93D'];
  for (var w = 0; w < (waves || 1); w++) {
    (function (delayMs) {
      setTimeout(function () {
        for (var i = 0; i < 34; i++) {
          var s = document.createElement('span');
          s.className = 'cf';
          s.style.left = (Math.random() * 100) + 'vw';
          s.style.background = colors[i % colors.length];
          s.style.animationDuration = (2.1 + Math.random() * 1.7) + 's';
          s.style.animationDelay = (Math.random() * 0.35) + 's';
          if (i % 3 === 0) s.style.borderRadius = '50%';
          if (i % 4 === 0) { s.style.width = '14px'; s.style.height = '8px'; }
          box.appendChild(s);
          (function (node) { setTimeout(function () { node.remove(); }, 4800); })(s);
        }
      }, delayMs);
    })(w * 450);
  }
}
function api(path, body, cb) {
  var opt = { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' } };
  if (body) opt.body = JSON.stringify(body);
  // Network-level failures (offline, DNS, a non-JSON reply) are flagged
  // with net:true so poll() can tell "no answer at all" apart from a real
  // JSON error the server sent on purpose.
  fetch(path, opt).then(function (r) { return r.json(); }).then(cb).catch(function () { cb({ ok: false, error: 'Mất kết nối, thử lại nhé.', net: true }); });
}
function stateUrl() { return '/api/rooms/' + S.code + '/state?role=' + S.role + '&token=' + encodeURIComponent(S.token); }
// Stale-view watchdog. poll()'s own failure counter only counts failures
// spaced >=600ms apart, so when polls fail FAST (flaky WiFi against the
// 120ms in-game poll) an outage never registers and the screen can sit
// frozen on the last good frame forever. noteOk() stamps every successful
// state application; watchdog() (driven from tick) shows a reconnecting
// badge after 3s of silence and self-heals with ONE location.reload()
// after 8s — the session restores from sessionStorage and rejoins the
// same room view. The reload budget (one per 60s) is kept in
// sessionStorage so it survives the reload itself; on the home screen
// (no role) the watchdog is inert and the badge stays hidden.
function noteOk() {
  S.lastOkAt = Date.now();
  var b = el('recon'); if (b) b.style.display = 'none';
}
function watchdog() {
  var b = el('recon');
  if (!S.role || !S.code) { if (b) b.style.display = 'none'; return; }
  if (!S.lastOkAt) { S.lastOkAt = Date.now(); return; }
  var stale = Date.now() - S.lastOkAt;
  if (stale <= 3000) { if (b) b.style.display = 'none'; return; }
  if (b) b.style.display = 'block';
  if (stale > 8000) {
    var last = 0;
    try { last = +sessionStorage.getItem('np_reload_at') || 0; } catch (e) {}
    if (Date.now() - last > 60000) {
      try { sessionStorage.setItem('np_reload_at', String(Date.now())); } catch (e) {}
      location.reload();
    }
  }
}
var lastPollAt = 0;
function poll() {
  if (!S.code) return;
  wsEnsure();
  // While the WebSocket channel is live it pushes every change the
  // moment it happens, so polling demotes itself to a ~2s safety net.
  // The moment the socket drops, this gate opens and the normal rates
  // (800ms base + 120ms in-game) resume on their own.
  var tPoll = Date.now();
  // While a game is playing the safety net tightens to ~900ms: a
  // stalled push channel then freezes the screen for under a second
  // instead of up to ~3s. Other phases keep the relaxed ~2s gate.
  var gateMs = (S.view && S.view.phase === 'playing') ? 900 : 2000;
  if (wsOpen() && tPoll - lastPollAt < gateMs) return;
  lastPollAt = tPoll;
  api(stateUrl(), null, function (v) {
    if (v && v.ok) { S.failN = 0; S.failSince = 0; if (!viewStale(v) && !S.localActive) { var gapP = Date.now(); if (S.lastStateAt) { S._gapH = S._gapH || []; S._gapH.push(gapP - S.lastStateAt); if (S._gapH.length > 20) S._gapH.shift(); } S.lastStateAt = gapP; S._lastSrc = 'http'; S.view = v; noteServerTime(v.serverNow); render(); patchPositions(v); hostKbAutoSeat(v); } noteOk(); return; }
    if (v && v.net) {
      // No answer at all (offline / DNS / non-JSON reply): the room may
      // well still exist, so keep waiting — but never spin on the
      // connecting screen forever. Count only failures spaced >=600ms
      // apart (the 120ms fast poll during games must not be able to fake
      // a long outage) and give up after 5 counted failures spanning
      // at least ~3 seconds of continuous silence.
      var t = Date.now();
      if (!S.failSince) S.failSince = t;
      if (t - (S.failLast || 0) >= 600) { S.failN = (S.failN || 0) + 1; S.failLast = t; }
      if (S.failN >= 5 && t - S.failSince >= 3000) {
        if (wsOpen()) {
          // The WS channel is still feeding fresh state, so this session
          // is demonstrably alive even while HTTP polls are failing:
          // never let the poll path tear it down.
          S.failN = 0; S.failSince = 0; S.failLast = 0;
          return;
        }
        if (S.view && (S.view.phase === 'playing' || S.view.phase === 'results' || S.view.phase === 'podium')) {
          // Mid-match (or on the results/podium screens) a dead connection
          // must NOT nuke the host session: the room lives on server-side,
          // and the stale-view watchdog recovers more gently (badge, then
          // one session-restoring reload). Just restart the failure count
          // and keep waiting for the watchdog to escalate.
          S.failN = 0; S.failSince = 0; S.failLast = 0;
          return;
        }
        S.failN = 0; S.failSince = 0;
        clearSession();
        toast('Mất kết nối với phòng, về trang chính nhé.');
      }
      return;
    }
    // The server answered with a JSON error: any silence streak is over.
    S.failN = 0; S.failSince = 0;
    if (v && v.error && v.error.indexOf('Không thấy phòng này') >= 0) {
      // The room is gone (expired after its TTL or older than the current
      // storage): this saved session can never work again. Leave for the
      // home screen instead of polling a dead room forever.
      clearSession();
      toast('Phòng đã đóng hoặc hết hạn, tạo phòng mới nhé.');
    } else if (v && v.error && v.error.indexOf('không hợp lệ') >= 0) clearSession();
  });
}
var PAGE_V = '__PAGEV__';
var vchkN = 0;
function versionCheck() {
  // Between games only: if the server has a newer build than this
  // open tab, reload once — a stale tab must never keep playing an
  // old version (it would miss fixes like LOCAL PLAY entirely).
  if (!S.code || S.localActive) return;
  if (S.view && S.view.phase === 'playing') return;
  fetch('/api/version').then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.build || j.build === PAGE_V) return;
    var last = +(sessionStorage.getItem('np_vreload') || 0);
    if (Date.now() - last < 300000) return;
    try { sessionStorage.setItem('np_vreload', '' + Date.now()); } catch (e) {}
    location.reload();
  }).catch(function () {});
}
// ---------------------------------------------------------------------
// LOCAL PLAY: when a room holds ONLY people at this screen (keyboard
// seats, the host's own seat) plus bots, the game simulation runs IN
// THIS PAGE from the shared engine (served at /engine.js) instead of
// on the server. The picture then answers to this machine's frame
// clock alone — a stalled network cannot touch it. Rooms with any
// remote (phone) player keep the server path exactly as before. The
// server room remains the membership shell; when a local game ends,
// its score deltas sync back in one small action.
// ---------------------------------------------------------------------
var L = { room: null, active: false, synced: true, startScores: null, timer: null, engLoading: false, syncTries: 0 };
function engReady() { return !!window.__NP_ENGINE; }
function engLoad() {
  if (engReady() || L.engLoading) return;
  L.engLoading = true;
  var sc = document.createElement('script');
  sc.src = '/engine.js?v=__ENGV__';
  sc.onload = function () { L.engLoading = false; };
  sc.onerror = function () { L.engLoading = false; };
  document.head.appendChild(sc);
}
function localEligible() {
  var v = S.view;
  if (S.role !== 'host' || !v || !v.players) return false;
  if (v.playlist && v.playlist.active) return false;
  for (var i = 0; i < v.players.length; i++) { var p = v.players[i]; if (p.type === 'human' && !p.local && !p.hostSeat) return false; }
  return true;
}
function localMirror() {
  var E = window.__NP_ENGINE; var v = S.view; if (!E || !v) return null;
  var room = E.newRoom(v.code, 'local');
  room.phase = v.phase;
  room.lastGame = v.lastGame || null;
  room.players = [];
  L.mirrorSeats = {};
  for (var i = 0; i < v.players.length; i++) {
    var p = v.players[i];
    L.mirrorSeats[p.seat] = true;
    room.players.push({ seat: p.seat, name: p.name, type: p.type, difficulty: p.difficulty || 'vua', score: p.score || 0, local: p.local ? true : undefined, scheme: p.scheme || 0, hostSeat: p.hostSeat ? true : undefined, token: 'local-' + p.seat });
  }
  return room;
}
function localApply() {
  var E = window.__NP_ENGINE; if (!E || !L.room) return;
  var v = E.buildView(L.room, 'host', null);
  // NOTE: S.sig must NOT be cleared here. Clearing it defeats
  // render()'s signature gate and rebuilds the entire app DOM on
  // every tick — under software rendering that saturates the
  // raster threads and collapses the frame rate to single digits
  // (found by weak-profile bisection, 2026-11-24). The server push
  // path never clears it either; structural changes flow through
  // the signature exactly as they do there.
  S.view = v; render(); patchPositions(v);
}
function localDispatch(body) {
  var E = window.__NP_ENGINE; if (!E || !L.room) return 'Phòng tại chỗ chưa sẵn sàng.';
  E.advance(L.room);
  var err = E.hostDispatch(L.room, body);
  E.advance(L.room);
  localApply();
  return err;
}
function localStart(body) {
  var room = localMirror();
  if (!room) return false;
  L.room = room;
  var err = null;
  try { err = localDispatch(body); } catch (e) { err = 'engine-error'; }
  if (err || !room.game) { L.room = null; if (err && err !== 'engine-error') toast(err); return false; }
  L.active = true; S.localActive = true; L.synced = false; L.syncTries = 0;
  L.startScores = {};
  for (var i = 0; i < room.players.length; i++) L.startScores[room.players[i].seat] = room.players[i].score || 0;
  api('/api/rooms/' + S.code + '/action', { role: 'host', token: S.token, action: 'localPlay', on: true }, function () {});
  L.timer = setInterval(localTick, 31);
  toast('Đang chơi TẠI CHỖ trên máy này — mạng lag cũng không ảnh hưởng ván này.');
  return true;
}
function localTick() {
  if (!L.active || !L.room) return;
  var E = window.__NP_ENGINE;
  try { E.advance(L.room); localApply(); } catch (e) { localAbort(); return; }
  if (L.room.phase === 'playing') L.wasPlaying = true;
  if (L.room.phase === 'results' && !L.synced && Date.now() >= (L.syncNextAt || 0)) { L.synced = true; localSyncResults(); }
  else if (L.room.phase === 'lobby') localStop();
  else if (L.room.phase === 'choosing' && L.wasPlaying) { localStop(); poll(); }
}
function localSyncResults() {
  var room = L.room; if (!room) return;
  var deltas = {};
  for (var i = 0; i < room.players.length; i++) { var p = room.players[i]; var d = (p.score || 0) - (L.startScores[p.seat] || 0); if (d) deltas[p.seat] = d; }
  var bots = [];
  for (var j = 0; j < room.players.length; j++) { var bp = room.players[j]; if (bp.type === 'bot' && !(L.mirrorSeats && L.mirrorSeats[bp.seat])) bots.push({ seat: bp.seat, difficulty: bp.difficulty || 'vua' }); }
  api('/api/rooms/' + S.code + '/action', { role: 'host', token: S.token, action: 'syncLocalResults', deltas: deltas, bots: bots, lastGame: room.lastGame || null }, function (v) {
    if (v && v.ok) { localStop(); S.view = v; S.sig = ''; render(); }
    else if (L.active) { L.syncTries++; if (L.syncTries <= 5) { L.synced = false; L.syncNextAt = Date.now() + 3000; } }
  });
}
function localStop() {
  if (L.timer) { clearInterval(L.timer); L.timer = null; }
  L.active = false; S.localActive = false; L.room = null;
}
function localAbort() {
  // Any engine fault drops back to the server path for the next
  // game; the current local game is abandoned rather than risked.
  localStop();
  toast('Chế độ chơi tại chỗ gặp lỗi — ván sau sẽ chạy qua máy chủ như cũ.');
}
function act(body, cb) {
  if (S.localActive && body.action !== 'leave' && body.action !== 'closeRoom') {
    var lerr = null;
    try { lerr = localDispatch(body); } catch (e) { lerr = null; }
    if (lerr) toast(lerr);
    if (cb) cb(lerr ? { error: lerr } : { ok: true });
    return;
  }
  if ((body.action === 'startGame' || body.action === 'quickStart' || body.action === 'replay') && !S.localActive && engReady() && localEligible()) {
    if (localStart(body)) { if (cb) cb({ ok: true }); return; }
  }
  body.role = S.role; body.token = S.token;
  api('/api/rooms/' + S.code + '/action', body, function (v) {
    if (v && v.ok && !viewStale(v)) { S.view = v; noteServerTime(v.serverNow); S.sig = ''; noteOk(); render(); }
    else if (v && v.error && v.error.indexOf('Không thấy phòng này') >= 0) { clearSession(); toast('Phòng đã đóng hoặc hết hạn, tạo phòng mới nhé.'); }
    else if (v && v.error && v.error.indexOf('không hợp lệ') >= 0) clearSession();
    else if (v && v.error) toast(v.error);
    if (cb) cb(v);
  });
}
// Tiến Lên sends: like act(), but a rejected play must NEVER clear
// the session — act() drops the session on errors containing
// 'không hợp lệ', which is exactly the wording of this game's rules
// errors ('Bài không hợp lệ.'). Errors only toast, and the player's
// card selection (S.tlSel) survives the rejection untouched.
function tlSend(body) {
  body.role = S.role; body.token = S.token;
  api('/api/rooms/' + S.code + '/action', body, function (v) {
    if (v && v.ok && !viewStale(v)) { S.view = v; noteServerTime(v.serverNow); S.sig = ''; noteOk(); render(); }
    else if (v && v.error) toast(v.error);
  });
}
// ---------------------------------------------------------------------
// WebSocket live channel. Once a session exists the page also opens a
// socket to the room: the server pushes the personalized view the
// moment it changes (no poll delay) and pad snapshots ride the socket
// instead of a fresh HTTP round trip per press. HTTP stays the full
// fallback: while the socket is open, poll() demotes itself to a ~2s
// safety net (see poll), and if the socket dies the normal poll rates
// resume automatically while a reconnect is retried with backoff
// (1s, 2s, 5s, then every 10s) — the session itself is never touched,
// and every pushed state stamps noteOk() exactly like a poll, so the
// stale-view watchdog keeps working off the same freshness signal.
// ---------------------------------------------------------------------
var wsConn = null;
var wsBackoff = 0;
var wsTimer = null;
var WS_BACKOFFS = [1000, 2000, 5000, 10000];
function wsUrl() {
  var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  return proto + location.host + '/api/rooms/' + S.code + '/ws?role=' + S.role + '&token=' + encodeURIComponent(S.token);
}
function wsOpen() { return !!wsConn && wsConn.readyState === 1; }
// Push-channel watchdog (SMOOTH5). The stale-view watchdog above cannot
// see a silently dead socket: while playing, the 900ms safety poll keeps
// stamping noteOk() with fresh views, so the screen never looks stale —
// yet sendPad/sendLocalPad keep preferring the corpse socket (readyState
// still 1) and the player's inputs vanish. Track push freshness on its
// own signal: S.lastWsAt is stamped ONLY when a pushed state is applied
// below (never on open, never by polls) and cleared whenever a fresh
// socket is created, so a new socket is never judged before its first
// push. During real arena play views change every tick, so 2s of push
// silence mid-play means the channel is dead.
function wsStale() {
  if (!wsOpen()) return false;
  if (!S.view || S.view.phase !== 'playing') return false;
  if (!S.view.game || S.view.game.phase === 'countdown') return false;
  // A socket that opened but never delivered a single push is just
  // as dead as one that went silent — the old guard required a first
  // message before it could ever fire, so a blackholed connection
  // (NAT/proxy eating the return path) pinned the page to a corpse
  // socket and the slow poll gate forever.
  if (!S.lastWsAt) return !!(S.wsOpenAt && Date.now() - S.wsOpenAt > 3000);
  return Date.now() - S.lastWsAt > 2000;
}
function wsWatchdog() {
  if (!wsStale()) return;
  // Drop the corpse: poll() ungates itself the moment wsOpen() is false
  // (full 120ms in-play rate resumes) and the scheduled retry builds a
  // fresh socket. After the drop wsConn is null, so wsStale() stays
  // false until a new socket opens, receives a push, then goes silent
  // again — this cannot loop from tick().
  wsDrop();
  wsSchedule();
}
function wsEnsure() {
  if (!S.code || !S.role || !S.token) return;
  if (wsConn || wsTimer) return; // already open/connecting, or a retry is scheduled
  if (typeof WebSocket === 'undefined') return;
  var sock = null;
  try { sock = new WebSocket(wsUrl()); } catch (e) { wsSchedule(); return; }
  wsConn = sock;
  S.lastWsAt = 0;
  S.wsOpenAt = Date.now();
  sock.onopen = function () { wsBackoff = 0; };
  sock.onmessage = function (ev) {
    var msg = null;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (!msg) return;
    if (msg.type === 'state' && msg.view && msg.view.ok) {
      // Applied EXACTLY like a successful poll: fresh view, fresh
      // server-offset, watchdog stamp, render. The push-freshness stamp
      // is separate: only a real pushed state proves the socket lives.
      var gapNow = Date.now();
      if (S.lastStateAt) { S._gapH = S._gapH || []; S._gapH.push(gapNow - S.lastStateAt); if (S._gapH.length > 20) S._gapH.shift(); }
      // WS-only gap history: the poll fallback (120 ms in play) also
      // feeds _gapH, so the mixed history cannot tell whether the
      // socket itself delivers at tick rate. The render buffer and
      // the meter read the socket's own cadence when it has samples.
      if (S.lastWsAt) { S._gapWs = S._gapWs || []; S._gapWs.push(gapNow - S.lastWsAt); if (S._gapWs.length > 20) S._gapWs.shift(); }
      S._lastSrc = 'ws';
      S.lastStateAt = gapNow;
      S.lastWsAt = gapNow;
      S.failN = 0; S.failSince = 0; if (!S.localActive) { S.view = msg.view; noteServerTime(msg.view.serverNow); render(); patchPositions(msg.view); } noteOk();
    } else if (msg.type === 'pong') {
      if (msg.t) { S._rttH = S._rttH || []; S._rttH.push(Date.now() - msg.t); if (S._rttH.length > 10) S._rttH.shift(); }
    } else if (msg.type === 'error' && msg.error) {
      toast(msg.error);
    } else if (msg.type === 'bye') {
      // The server is closing this socket for a fatal reason; the
      // safety-net poll arbitrates what happens to the session.
      try { sock.close(); } catch (e) {}
    }
  };
  sock.onclose = function () { if (wsConn === sock) wsConn = null; wsSchedule(); };
  sock.onerror = function () { try { sock.close(); } catch (e) {} };
}
function wsSchedule() {
  if (wsTimer) return;
  if (!S.code || !S.role) return;
  var d = WS_BACKOFFS[Math.min(wsBackoff, WS_BACKOFFS.length - 1)];
  wsBackoff += 1;
  wsTimer = setTimeout(function () { wsTimer = null; wsEnsure(); }, d);
}
function wsDrop() {
  if (wsTimer) { clearTimeout(wsTimer); wsTimer = null; }
  wsBackoff = 0;
  if (wsConn) { var s = wsConn; wsConn = null; s.onclose = null; try { s.close(); } catch (e) {} }
}
function serverNow() { return Date.now() + S.serverOffset; }
// Clock discipline: a view's serverNow is stamped when the server
// GENERATED it, so (serverNow - receipt time) = true offset MINUS
// that view's transit delay. Adopting every sample raw (the old
// code) baked each delivery's jitter straight into the clock —
// anchor ages wobbled by the full jitter swing and rendered goals
// teleported back and forth (measured: 78 one-frame jumps > 0.3
// units and ~3 s of frozen frames in 10 s on a swinging connection).
// Track the MAXIMUM sample instead: transit can only subtract from
// it, so the maximum is the least-contaminated estimate (the
// fastest delivery), and jitter stops moving the clock. A sample
// hours below the current estimate means the clock itself stepped
// — re-seed then.
// A state view older than the one already on screen must never
// replace it. The HTTP poll (every ~900ms in play) and action
// responses are generated when the request lands and arrive a
// round trip later, by which time the WebSocket has usually
// delivered something newer: applying the stale copy regressed
// the whole view (ring radius pulsing backwards, HUD flicker,
// anchor statistics poisoned) roughly once a second.
function medOf(a) { if (!a || !a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; }
function pctOf(a, q) { if (!a || !a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(b.length * q))]; }
function viewStale(v) {
  return !!(v && S.view && typeof v.serverNow === 'number' && typeof S.view.serverNow === 'number' && v.serverNow < S.view.serverNow);
}
function noteServerTime(sn) {
  if (!sn) return;
  var now = Date.now();
  var sample = sn - now;
  if (S.serverOffset == null || sample > S.serverOffset || S.serverOffset - sample > 3600000) S.serverOffset = sample;
  // Rolling delivery stats for the interpolation buffer: how far
  // apart anchors are generated, how long they take to arrive, and
  // how much that arrival time spreads (jitter). The buffer below
  // sizes itself from all three.
  var tr = Math.max(0, (now + (S.serverOffset || 0)) - sn);
  if (S._lastSn && sn > S._lastSn) {
    S._ivH = S._ivH || []; S._ivH.push(sn - S._lastSn); if (S._ivH.length > 24) S._ivH.shift();
  }
  if (sn !== S._lastSn) {
    S._trH = S._trH || []; S._trH.push(tr); if (S._trH.length > 24) S._trH.shift();
    S._lastSn = sn;
  }
  if (S._ivH && S._ivH.length >= 4 && S._trH && S._trH.length >= 4) {
    var med = function (a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; };
    // Render delay for non-predicted movers. This used to be a full
    // anchor interval + transit (>=100 ms by construction): the
    // player's own blob is predicted at ~now while shells and other
    // players rendered 100+ ms in the past — two different time
    // frames on one field, so in Né Đạn a shell visually 1 unit
    // away was already hitting you. Ballistic movers extrapolate
    // exactly, so the buffer only needs to cover transit plus a
    // third of an interval of jitter slack.
    S.transitMs = med(S._trH);
    var trH = S._trH.slice().sort(function (a, b) { return a - b; });
    var spread = trH.length ? trH[Math.floor(trH.length * 0.9)] - med(S._trH) : 0;
    S.interpMs = Math.min(260, Math.max(35, med(S._trH) + med(S._ivH) * 0.35 + Math.min(Math.max(spread, 0), 120)));
  }
}

var DUR = { 'do-vui': 15000, 'keo-co': 20000 };
var GCOLORS = {
  'do-vui': 'linear-gradient(160deg,#6BCBFF,#4F7BE8)',
  'ma-soi': 'linear-gradient(160deg,#1E1B4B,#6D28A8)', 'ca-ngua': 'linear-gradient(160deg,#78350F,#D97706)',
  'tien-len': 'linear-gradient(160deg,#134E4A,#0F766E)',
  'day-ra': 'linear-gradient(160deg,#4A0E24,#A4133C)',
  'ne-dan': 'linear-gradient(160deg,#2A0A54,#6D28A8)', 'keo-co': 'linear-gradient(160deg,#064A38,#0B7A55)',
  'chia-cuop': 'linear-gradient(160deg,#241457,#4C2FA8)',
  'cuop-sao': 'linear-gradient(160deg,#8A5A00,#E8A812)', 'giu-vuong-mien': 'linear-gradient(160deg,#5B21B6,#B8860B)',
  'son-san': 'linear-gradient(160deg,#0E7490,#22C55E)', 'cao-boi': 'linear-gradient(160deg,#7C2D12,#B45309)',
  'chung-mot-than': 'linear-gradient(160deg,#312E81,#7C3AED)', 'day-hop': 'linear-gradient(160deg,#92400E,#D97706)',
  'cheo-thuyen': 'linear-gradient(160deg,#0C4A6E,#0284C7)',
  'xe-tank': 'linear-gradient(160deg,#14532D,#22C55E)', 'dat-bom': 'linear-gradient(160deg,#7C2D12,#F97316)',
  'ke-gia-mao': 'linear-gradient(160deg,#4C1D95,#A855F7)',
  'thu-thanh': 'linear-gradient(160deg,#0E7490,#67E8F9)', 'giai-ma-chung': 'linear-gradient(160deg,#3730A3,#818CF8)',
  'nguoi-que': 'linear-gradient(160deg,#7F1D1D,#F43F5E)', 'den-lua-nuoc': 'linear-gradient(160deg,#451A03,#B45309)',
  'da-bong': 'linear-gradient(160deg,#14532D,#22C55E)', 'ech-op': 'linear-gradient(160deg,#713F12,#A3C14A)',
  'can-goc': 'linear-gradient(160deg,#0C4A6E,#38BDF8)'
};
function noX2(id) { return id === 'day-ra' || id === 'ne-dan' || id === 'keo-co' || id === 'cuop-sao' || id === 'giu-vuong-mien' || id === 'son-san' || id === 'chung-mot-than' || id === 'day-hop' || id === 'cheo-thuyen' || id === 'xe-tank' || id === 'dat-bom' || id === 'thu-thanh' || id === 'giai-ma-chung' || id === 'nguoi-que' || id === 'den-lua-nuoc' || id === 'da-bong' || id === 'ech-op' || id === 'can-goc' || id === 'tien-len'; }
function isActionGame(id) { return id === 'day-ra' || id === 'ne-dan' || id === 'keo-co' || id === 'chia-cuop' || id === 'cuop-sao' || id === 'giu-vuong-mien' || id === 'son-san' || id === 'chung-mot-than' || id === 'day-hop' || id === 'cheo-thuyen' || id === 'xe-tank' || id === 'dat-bom' || id === 'thu-thanh' || id === 'nguoi-que' || id === 'den-lua-nuoc' || id === 'da-bong' || id === 'ech-op'; }
function topbarHTML(v, isHost) {
  var h = '<div class="topbar"><span class="baloo" style="font-size:24px">Nảy Party</span>';
  h += '<span class="chip cool">Phòng ' + esc(v.code) + '</span>';
  h += '<span class="sp"></span>';
  h += '<button class="btn small ghost" data-cmd="sound">' + (S.muted ? 'Bật tiếng' : 'Tắt tiếng') + '</button>';
  if (isHost) h += '<button class="btn small ghost" data-cmd="fs">Toàn màn hình</button>';
  h += '<button class="btn small ghost" data-cmd="reload">Đổi phòng</button></div>';
  return h;
}
function scoreStrip(v) {
  var h = '<div class="scorebar">';
  for (var i = 0; i < v.standings.length; i++) {
    var p = playerOf(v, v.standings[i]);
    if (!p) continue;
    h += '<span class="scorechip">' + blobSVG(p.color, p.mood, 30) + ' ' + esc(p.name) + ' · <b>' + fmt(p.liveScore) + '</b></span>';
  }
  h += '</div>';
  if (v.gap && v.players.length > 1) {
    var top = playerOf(v, v.gap.topSeat); var second = playerOf(v, v.gap.secondSeat);
    if (top && second) {
      h += '<div class="gapline">' + (v.gap.diff > 0
        ? esc(top.name) + ' đang dẫn trước ' + esc(second.name) + ' ' + fmt(v.gap.diff) + ' điểm'
        : esc(top.name) + ' và ' + esc(second.name) + ' đang hoà điểm dẫn đầu!') + '</div>';
    }
  }
  return h;
}
// Tiến Lên hand chips + action buttons, shared by the phone page
// (prefix 'tl', selection in S.tlSel, sends via tlSend) and the host
// page's my-seat section (prefix 'myTl', selection in S.myTlSel,
// sends via the forSeat relay): the same chips and buttons — only
// the command names and the selection store differ.
function tlHandHTML(hand, sel, pfx) {
  var h = '<div class="tlhand">';
  for (var i = 0; i < hand.length; i++) {
    var cid = hand[i];
    h += '<button class="tlcard' + (tlCardRed(cid) ? ' red' : '') + (sel.indexOf(cid) >= 0 ? ' sel' : '') + '" data-cmd="' + pfx + 'Card" data-i="' + cid + '">' + tlCardLabel(cid) + '</button>';
  }
  return h + '</div>';
}
function tlBtnsHTML(g, sel, pfx) {
  return '<p class="center">'
    + '<button class="btn green" data-cmd="' + pfx + 'Play"' + ((g.myTurn && sel.length) ? '' : ' disabled style="opacity:.45"') + '>Đánh bài (' + sel.length + ')</button> '
    + ((g.myTurn && g.table && !g.myPassed) ? '<button class="btn orange" data-cmd="' + pfx + 'Pass">Bỏ lượt</button> ' : '')
    + (sel.length ? '<button class="btn ghost" data-cmd="' + pfx + 'Clear">Bỏ chọn</button>' : '')
    + '</p>';
}
// The host's own Tiến Lên selection, keyed by the myHand signature —
// the same discipline as the phone's S.tlSel: it survives re-renders
// and rejected plays, and resets only when the hand itself changes.
function myTlSync(g) {
  var hand = (g && g.myHand) || [];
  var sig = hand.join(',');
  if (S.myTlSig !== sig) { S.myTlSig = sig; S.myTlSel = []; }
  if (!S.myTlSel) S.myTlSel = [];
  return hand;
}
// ---------------------------------------------------------------------
// My-seat section (phone mode). When the host also sits in the room
// (hostSeat), buildView attaches their own player view as v.myView;
// the host page renders it as a control block directly under the
// stage. Every send goes through localAct() with forSeat = the host's
// seat — the same relay the keyboard seats use, and never act(): a
// rules error ('Bài không hợp lệ.' and friends) must never clear the
// host's session. renderMySeat() repaints the block on its own
// signature from every render() call, because the private view can
// change while the public stage signature stands still.
// ---------------------------------------------------------------------
function mySeatHTML(v) {
  return '<div id="myseat" class="card' + (S.phoneMode ? ' phonemode' : '') + '">' + mySeatInner(v) + '</div>';
}
var MYSEAT_INTER = { 'tien-len': 1, 'ma-soi': 1, 'ca-ngua': 1, 'ke-gia-mao': 1, 'do-vui': 1, 'giai-ma-chung': 1, 'chia-cuop': 1 };
function renderMySeat() {
  var box = el('myseat');
  if (!box) { S.mySeatSig = ''; return; }
  var v = S.view;
  if (S.role !== 'host' || !v || !v.myView || v.phase !== 'playing' || !v.game) {
    if (S.mySeatSig !== '') { S.mySeatSig = ''; box.style.display = 'none'; }
    return;
  }
  box.style.display = '';
  var g = v.game;
  var sig = MYSEAT_INTER[g.id]
    ? g.id + '|' + g.phase + '|' + JSON.stringify(v.myView) + '|' + (S.myTlSel || []).join(',')
    : g.id + '|' + g.phase;
  if (sig === S.mySeatSig) return;
  var ci = el('myChatText');
  var cval = ci ? ci.value : null;
  var cfocus = !!ci && document.activeElement === ci;
  var caret = -1;
  if (cfocus) { try { caret = ci.selectionStart; } catch (e) {} }
  S.mySeatSig = sig;
  box.innerHTML = mySeatInner(v);
  if (cval !== null) {
    var ni = el('myChatText');
    if (ni) {
      ni.value = cval;
      if (cfocus) { ni.focus(); try { ni.setSelectionRange(caret < 0 ? cval.length : caret, caret < 0 ? cval.length : caret); } catch (e) {} }
    }
  }
}
function mySeatInner(v) {
  var g = v.myView;
  var seat = mySeatOf(v);
  if (!g || seat == null) return '';
  var me = playerOf(v, seat);
  var h = '<div class="baloo" style="font-size:21px">🎮 Ghế của tôi — ' + esc(me ? me.name : '') + '</div>';
  if (!v.game || v.game.phase === 'countdown') return h + '<p class="center" style="margin:6px 0 0">⏳ Chuẩn bị…</p>';
  function nm(s2) { var p = playerOf(v, s2); return p ? p.name : ''; }
  function pickBtns(cmd, kind, excludeSelf, guardSeat) {
    var out = '<div class="optgrid">';
    for (var i = 0; i < v.players.length; i++) {
      var p = v.players[i];
      if (g.aliveMap && !g.aliveMap[p.seat]) continue;
      if (excludeSelf && p.seat === seat) continue;
      var dis = guardSeat != null && p.seat === guardSeat;
      out += '<button class="opt" data-cmd="' + cmd + '"' + (kind ? ' data-kind="' + kind + '"' : '') + ' data-i="' + p.seat + '"' + (dis ? ' disabled style="opacity:.45"' : '') + '>' + esc(p.name)
        + (p.seat === seat ? ' (bạn)' : '')
        + (kind === 'wolfVote' && (g.wolfTeam || []).indexOf(p.seat) >= 0 ? ' 🐺 (đồng đội)' : '')
        + (dis ? ' · đêm qua đã bảo vệ' : '') + '</button>';
    }
    return out + '</div>';
  }
  if (g.id === 'tien-len') {
    if (g.phase === 'tlWin') {
      h += '<p class="center baloo" style="font-size:19px">🏆 ' + esc(nm(g.winner)) + ' thắng!' + (g.instantWin ? ' ⚡ TỚI TRẮNG — ' + (TL_IW_NAMES[g.instantWin.kind] || '') + '!' : '') + (g.myRank ? ' Bạn về hạng ' + g.myRank + ' · +' + fmt(g.points ? (g.points[seat] || 0) : 0) + ' điểm' : '') + '</p>';
      return h;
    }
    if (g.phase === 'cards') {
      var handT = myTlSync(g);
      if (g.table) {
        h += '<p class="center" style="margin:4px 0">Trên bàn — ' + esc(nm(g.table.seat)) + ' · ' + (TL_KIND_NAMES[g.table.kind] || '') + '</p>';
        h += '<div class="tlchips">' + tlChipsHTML(g.table.cards, true) + '</div>';
      } else h += '<p class="center" style="margin:4px 0">🃏 Bàn trống</p>';
      if (g.myRank) {
        h += '<p class="center baloo" style="font-size:19px">🏆 Bạn đã hết bài — về hạng ' + g.myRank + '!</p>';
      } else {
        if (g.myTurn) {
          h += '<p class="center baloo" style="font-size:19px">' + (g.table ? '⚔️ LƯỢT CỦA BẠN — chọn bài để CHẶN!' : '👑 LƯỢT CỦA BẠN — bạn cầm cái, chọn bài để đánh!') + '</p>';
          if (g.mustInclude3) h += '<p class="center"><span class="chip hot">Lượt đầu tiên của trận: bộ bạn đánh phải có lá 3♠!</span></p>';
        } else if (g.myPassed) {
          h += '<p class="center">✋ Bạn đã bỏ lượt vòng này — đợi vòng mới…</p>';
        } else {
          h += '<p class="center">Lượt của ' + esc(nm(g.turn)) + ' — chuẩn bị bài của bạn…</p>';
        }
        h += tlHandHTML(handT, S.myTlSel, 'myTl');
        h += tlBtnsHTML(g, S.myTlSel, 'myTl');
        h += '<p class="center small">Chạm vào lá bài để chọn / bỏ chọn — bộ không hợp lệ sẽ bị báo lỗi và lựa chọn vẫn được giữ nguyên.</p>';
      }
    }
    return h;
  }
  if (g.id === 'ma-soi') {
    h += '<div class="center"><span class="chip ' + (g.myRole === 'soi' ? 'hot' : 'cool') + '" style="font-size:16px">Vai của bạn: ' + (WOLF_ROLE_NAMES[g.myRole] || '') + '</span></div>';
    if (!g.myAlive) {
      h += '<p class="center">💀 Bạn đã chết — theo dõi tiếp trên bàn chung nhé!</p>';
    } else if (g.phase === 'night') {
      if (g.myRole === 'soi') {
        if (g.myWolfVote == null) { h += '<div class="baloo" style="font-size:19px">🐺 Chọn con mồi đêm nay:</div>' + pickBtns('myWolf', 'wolfVote', true, null); }
        else h += '<p class="center baloo" style="font-size:19px">Đã chọn con mồi: ' + esc(nm(g.myWolfVote)) + '<br><span style="font-size:16px">Phiếu sói đã vào: ' + (g.wolfVotesIn || 0) + '/' + (g.wolfTeam || []).length + '</span></p>';
      } else if (g.myRole === 'bao-ve') {
        if (g.myGuardPick == null) { h += '<div class="baloo" style="font-size:19px">🛡️ Đêm nay bạn bảo vệ ai?</div>' + pickBtns('myWolf', 'wolfGuard', false, g.myGuardLast); }
        else h += '<p class="center baloo" style="font-size:19px">🛡️ Đang bảo vệ: ' + esc(nm(g.myGuardPick)) + '</p>';
      } else if (g.myRole === 'tien-tri') {
        if (g.mySeerPick == null) { h += '<div class="baloo" style="font-size:19px">🔮 Đêm nay bạn soi ai?</div>' + pickBtns('myWolf', 'wolfSeer', true, null); }
        else { var seenW = (g.mySeerNotes || []).some(function (n2) { return n2.seat === g.mySeerPick && n2.wolf; }); h += '<p class="center baloo" style="font-size:19px">🔮 ' + esc(nm(g.mySeerPick)) + (seenW ? ' LÀ SÓI! 🐺' : ' là dân lành ✅') + '</p>'; }
        if (g.mySeerNotes && g.mySeerNotes.length) {
          h += '<p class="center small" style="margin:4px 0 0">📖 Sổ tay: ';
          for (var sn2 = 0; sn2 < g.mySeerNotes.length; sn2++) h += esc(nm(g.mySeerNotes[sn2].seat)) + (g.mySeerNotes[sn2].wolf ? ' 🐺' : ' ✅') + (sn2 < g.mySeerNotes.length - 1 ? ' · ' : '');
          h += '</p>';
        }
      } else if (g.myRole === 'phu-thuy') {
        if (g.myWitchDone) h += '<p class="center baloo" style="font-size:19px">🧙 Đã quyết định xong — đi ngủ thôi!</p>';
        else if (!g.wolvesIn) h += '<p class="center">🧙 Đợi bầy sói chọn xong con mồi… · 🧪 cứu ×' + (g.mySaveLeft || 0) + ' · ☠️ độc ×' + (g.myPoisonLeft || 0) + '</p>';
        else {
          h += '<p class="center baloo" style="font-size:19px">Con mồi của sói đêm nay: ' + (g.myVictim ? esc(nm(g.myVictim)) + (g.myVictim === seat ? ' (CHÍNH LÀ BẠN!)' : '') : '—') + '</p>';
          if ((g.mySaveLeft || 0) > 0) h += '<p class="center"><button class="btn ' + (g.myWitchSave ? 'green' : 'ghost') + '" data-cmd="myWitchSave">' + (g.myWitchSave ? '🧪 ĐÃ CHỌN CỨU — bấm để huỷ' : '🧪 Dùng thuốc cứu người này') + '</button></p>';
          else h += '<p class="center muted">Thuốc cứu đã dùng hết.</p>';
          if ((g.myPoisonLeft || 0) > 0) {
            h += '<div class="baloo" style="font-size:18px">☠️ Đầu độc ai? ' + (g.myWitchPoison ? '(đang chọn: ' + esc(nm(g.myWitchPoison)) + ')' : '(chưa chọn)') + '</div>' + pickBtns('myWolf', 'wolfPoison', true, null);
            if (g.myWitchPoison) h += '<p class="center"><button class="btn small ghost" data-cmd="myWitchClear">Bỏ chọn đầu độc</button></p>';
          } else h += '<p class="center muted">Thuốc độc đã dùng hết.</p>';
          h += '<p class="center"><button class="btn pink" data-cmd="myWitchDone">Xác nhận — đi ngủ</button></p>';
        }
      } else {
        h += '<p class="center">😴 Bạn là dân làng — ngủ ngon, đợi trời sáng…</p>';
      }
    } else if (g.phase === 'dawn') {
      h += '<p class="center baloo" style="font-size:19px">' + (g.dawnDeaths && g.dawnDeaths.length ? '☀️ Đêm qua làng mất: ' + g.dawnDeaths.map(function (d3) { return esc(nm(d3.seat)); }).join(', ') : '☀️ Đêm qua bình yên — không ai ra đi!') + '</p>';
    } else if (g.phase === 'discuss') {
      h += '<p class="center">🗣️ Bàn luận: ai là sói? (xem bàn chung ở trên)</p>';
    } else if (g.phase === 'vote') {
      if (g.voted && g.voted[seat]) h += '<p class="center baloo" style="font-size:19px">Đã bỏ phiếu! Đợi kết quả…</p>';
      else { h += '<div class="baloo" style="font-size:19px">⚖️ Treo cổ ai? Chọn người bạn nghi là sói:</div>' + pickBtns('myVote', null, true, null); }
    } else if (g.phase === 'execute') {
      h += '<p class="center baloo" style="font-size:19px">' + (g.exec && g.exec.seat ? '⚖️ ' + esc(nm(g.exec.seat)) + ' bị treo cổ — là ' + (WOLF_ROLE_NAMES[g.exec.role] || '') : '⚖️ Hôm nay không ai bị treo cổ.') + '</p>';
    } else if (g.phase === 'wolfEnd') {
      h += '<p class="center baloo" style="font-size:19px">' + (g.winner === 'soi' ? '🐺 Bầy sói thắng!' : '🎉 Dân làng thắng!') + ' · Bạn +' + fmt(g.points ? (g.points[seat] || 0) : 0) + ' điểm</p>';
    }
    return h;
  }
  if (g.id === 'ca-ngua') {
    if (g.phase === 'ngWin') {
      h += '<p class="center baloo" style="font-size:19px">🏆 ' + esc(nm(g.winner)) + ' thắng!</p>';
    } else if (g.myTurn && g.phase === 'roll') {
      h += '<p class="center baloo" style="font-size:19px">🎲 LƯỢT CỦA BẠN!</p>';
      h += '<p class="center"><button class="btn pink" data-cmd="myRoll" style="font-size:22px;padding:14px 30px">THẢY XÚC XẮC</button></p>';
      h += '<p class="center small">Thảy 6 để xuất chuồng và được thảy tiếp · Ba lần 6 liên tiếp là mất lượt!</p>';
    } else if (g.myTurn && g.phase === 'pick') {
      h += '<p class="center baloo" style="font-size:19px">Bạn thảy được: ' + (g.dice || '') + ' chấm — chọn ngựa để đi:</p>';
      if (g.myLegal && g.myLegal.length) {
        h += '<div class="optgrid">';
        for (var ml2 = 0; ml2 < g.myLegal.length; ml2++) h += '<button class="opt" data-cmd="myMove" data-i="' + g.myLegal[ml2].horse + '">🐴 Ngựa ' + (g.myLegal[ml2].horse + 1) + '<br><span style="font-size:15px">' + esc(g.myLegal[ml2].hint) + '</span></button>';
        h += '</div>';
      } else h += '<p class="center">Không có nước đi nào — đợi qua lượt…</p>';
    } else {
      h += '<p class="center">Lượt của ' + esc(nm(g.turn)) + (g.dice ? ' · vừa thảy ' + g.dice + ' chấm' : '') + ' — xem bàn cờ ở bàn chung.</p>';
    }
    return h;
  }
  if (g.id === 'ke-gia-mao') {
    if (g.phase === 'answer') {
      h += '<div class="center"><span class="chip cool">Chủ đề: ' + esc(g.category || '') + '</span></div>';
      h += '<div class="baloo" style="font-size:20px">' + esc(g.myQuestion || '') + '</div>';
      if (g.mine == null) {
        h += '<div class="optgrid">';
        for (var a3 = 0; a3 < 4; a3++) h += '<button class="opt" data-cmd="myAnswer" data-i="' + a3 + '">' + LETTERS[a3] + '. ' + esc(g.options ? g.options[a3] : '') + '</button>';
        h += '</div>';
        h += '<p class="center small">Trả lời bí mật — đừng đọc to câu hỏi hay đáp án của bạn!</p>';
      } else h += '<p class="center baloo" style="font-size:19px">Đã trả lời! Đợi mọi người…</p>';
    } else if (g.phase === 'discuss') {
      h += '<p class="center">🗣️ Bàn luận: ai đang giả vờ? (xem bàn chung ở trên)</p>';
    } else if (g.phase === 'vote') {
      if (g.myVote == null) {
        h += '<div class="baloo" style="font-size:19px">Bạn tố cáo ai là kẻ giả mạo?</div><div class="optgrid">';
        for (var v3 = 0; v3 < v.players.length; v3++) { if (v.players[v3].seat === seat) continue; h += '<button class="opt" data-cmd="myVote" data-i="' + v.players[v3].seat + '">' + esc(v.players[v3].name) + '</button>'; }
        h += '</div>';
      } else h += '<p class="center baloo" style="font-size:19px">Đã tố cáo! Đợi công bố…</p>';
    } else if (g.phase === 'reveal' && g.reveal) {
      h += '<p class="center baloo" style="font-size:19px">' + (g.reveal.caught ? 'Bắt được kẻ giả mạo!' : 'Kẻ giả mạo đã thoát!') + ' Kẻ giả mạo: ' + esc(nm(g.reveal.impostor)) + (g.reveal.impostor === seat ? ' — chính là BẠN!' : '') + ' · +' + fmt(g.reveal.points[seat] || 0) + ' điểm</p>';
    }
    return h;
  }
  if (g.id === 'do-vui') {
    if (g.phase === 'question') {
      h += '<div class="baloo" style="font-size:19px">' + esc(g.question || '') + '</div>';
      if (g.mine == null) {
        h += '<div class="optgrid">';
        for (var a4 = 0; a4 < 4; a4++) h += '<button class="opt" data-cmd="myAnswer" data-i="' + a4 + '">' + LETTERS[a4] + '. ' + esc(g.options[a4]) + '</button>';
        h += '</div>';
      } else h += '<p class="center baloo" style="font-size:19px">Đã trả lời! Đợi mọi người…</p>';
    } else if (g.phase === 'reveal' && g.reveal) {
      var okA = g.mine != null && g.mine === g.reveal.correct;
      h += '<p class="center baloo" style="font-size:19px">' + (okA ? 'ĐÚNG RỒI!' : 'Chưa đúng!') + ' Đáp án đúng: ' + LETTERS[g.reveal.correct] + '. ' + esc(g.options[g.reveal.correct]) + ' · +' + fmt(g.reveal.points[seat] || 0) + ' điểm</p>';
    }
    return h;
  }
  if (g.id === 'giai-ma-chung') {
    if (g.phase === 'decode' || g.phase === 'levelup') {
      h += '<p class="center">Màn ' + (g.level || 1) + ' · Tim đội: ' + '❤'.repeat(Math.max(0, g.hearts || 0)) + ' · Tiến độ: ' + (g.done || 0) + '/' + (g.total || 0) + ' bước · Đã qua ' + (g.levelsDone || 0) + ' màn</p>';
      if (g.phase === 'levelup') h += '<p class="center baloo" style="font-size:19px">QUA MÀN! 🎉</p>';
      var ms3 = g.mySteps || [];
      h += '<p class="center" style="margin:4px 0"><b>Phần mật mã của bạn:</b> ';
      if (!ms3.length) h += 'Màn này bạn không giữ bước nào — cổ vũ đồng đội nhé!';
      for (var s3 = 0; s3 < ms3.length; s3++) h += '<span class="mystep">Bước ' + ms3[s3].pos + ': <span style="color:' + SYMCOLORS[ms3[s3].sym] + '">' + ms3[s3].name + '</span></span> ';
      h += '</p>';
      h += '<div class="symgrid">';
      for (var y3 = 0; y3 < 4; y3++) h += '<button class="symbtn" data-cmd="mySymbol" data-i="' + y3 + '" style="background:' + SYMCOLORS[y3] + '">' + SYMNAMES[y3] + '</button>';
      h += '</div>';
      h += '<p class="center small">Chỉ bấm khi tới lượt bước của bạn và đúng ký hiệu của bước đó — bấm sai cả đội mất 1 tim!</p>';
    }
    return h;
  }
  if (g.id === 'chia-cuop') {
    var inPair2 = g.pair && g.pair.indexOf(seat) >= 0;
    if (g.phase === 'talk') {
      h += '<p class="center baloo" style="font-size:19px">Nồi ' + fmt(g.pot || 400) + ' điểm' + (g.finalRound ? ' · VÒNG CUỐI ×2' : '') + '</p>';
      if (g.chat) for (var c3 = 0; c3 < g.chat.length; c3++) { var cp3 = playerOf(v, g.chat[c3].seat); h += '<div class="chatrow">' + blobSVG(cp3 ? cp3.color : 'blue', 'cuoi', 24) + ' <b>' + esc(cp3 ? cp3.name : '') + ':</b> ' + esc(g.chat[c3].text) + '</div>'; }
      if (inPair2) {
        h += '<p class="center">Bạn đấu với <b>' + esc(nm(g.pair[g.pair[0] === seat ? 1 : 0])) + '</b>. Nói gì cũng được — lát nữa chọn mới là thật!</p>';
        h += '<p class="center"><input type="text" id="myChatText" maxlength="60" placeholder="Lời thương lượng…" style="width:min(70vw,300px)"> <button class="btn small blue" data-cmd="myChatSend">Gửi</button></p>';
      } else {
        h += '<p class="center">Vòng này hai người khác thương lượng — bạn ngồi ngoài xem.</p>';
      }
    } else if (g.phase === 'choose') {
      if (!inPair2) h += '<p class="center">Hai người kia đang chọn bí mật…</p>';
      else if (g.mineChosen) h += '<p class="center baloo" style="font-size:19px">Đã khoá lựa chọn! Đợi đối thủ…</p>';
      else {
        h += '<p class="center baloo" style="font-size:19px">CHỌN BÍ MẬT ĐI!</p>';
        h += '<p class="center">Cả hai CHIA: mỗi người một nửa nồi · Một người CƯỚP: cướp hết · Cả hai CƯỚP: mất trắng!</p>';
        h += '<p class="center"><button class="btn green" data-cmd="myChoose" data-c="chia" style="font-size:20px">CHIA</button> <button class="btn pink" data-cmd="myChoose" data-c="cuop" style="font-size:20px">CƯỚP</button></p>';
      }
    } else if (g.phase === 'reveal' && g.reveal) {
      var myE3 = null;
      for (var q3 = 0; q3 < g.reveal.entries.length; q3++) if (g.reveal.entries[q3].seat === seat) myE3 = g.reveal.entries[q3];
      h += '<p class="center baloo" style="font-size:19px">' + (myE3 ? 'Bạn đã ' + (myE3.choice === 'cuop' ? 'CƯỚP' : 'CHIA') + ' · +' + fmt(myE3.points) + ' điểm' : 'Xem kết quả ở bàn chung!') + '</p>';
    }
    return h;
  }
  // Any other game (real-time pads and friends): the host's own seat
  // has no touch controls on this screen — say so plainly instead of
  // rendering dead buttons.
  return h + '<p class="center" style="margin:6px 0 0">Game hành động cần bàn phím hoặc điện thoại — quay lại sảnh rồi bấm “⌨️ Chơi bằng phím ngay trên máy này” là chơi được ngay trên máy này.</p>';
}
function seatCard(v, seat) {
  var p = playerOf(v, seat);
  if (!p) {
    var h = '<div class="seat"><div style="opacity:.45">' + blobSVG('orange', 'ngu', 84) + '</div>';
    h += '<div class="nm muted">P' + seat + ' · Trống</div>';
    if (seat >= 2 && (v.phase === 'lobby' || v.phase === 'choosing')) {
      h += '<button class="btn small orange" data-cmd="addBot" data-seat="' + seat + '">+ Máy</button>';
      var nLoc0 = 0; for (var li0 = 0; li0 < v.players.length; li0++) if (v.players[li0].local) nLoc0++;
      if (nLoc0 < 4) h += ' <button class="btn small blue" data-cmd="addLocal" data-seat="' + seat + '">+ Phím</button>';
    }
    return h + '</div>';
  }
  var h2 = '<div class="seat filled">';
  if (v.bubble && v.bubble.seat === seat) h2 += '<div class="bubble">' + esc(v.bubble.text) + '</div>';
  h2 += '<span class="blobbob">' + blobSVG(p.color, p.mood, 84) + '</span>';
  h2 += '<div class="nm">' + esc(p.name) + '</div>';
  h2 += '<div class="sc">P' + seat + ' · ' + fmt(p.score) + ' điểm</div>';
  if (p.type === 'bot') {
    h2 += '<div><span class="chip hot">MÁY · ' + esc(p.diffLabel) + '</span></div>';
    if (v.phase === 'lobby' || v.phase === 'choosing') {
      h2 += '<div style="margin-top:6px"><button class="btn small ghost" data-cmd="cycleBot" data-seat="' + seat + '">Đổi mức máy</button> ';
      h2 += '<button class="btn small ghost" data-cmd="removeBot" data-seat="' + seat + '">Xoá máy</button></div>';
    }
  } else if (p.local) {
    h2 += '<div><span class="chip cool">NGƯỜI CHƠI · BÀN PHÍM</span></div>';
    h2 += '<div class="small muted" style="margin-top:4px">' + esc(LK_SCHEME_SUMMARY[p.scheme || 0] || '') + '</div>';
    if (v.phase === 'lobby' || v.phase === 'choosing') {
      h2 += '<div style="margin-top:6px"><button class="btn small ghost" data-cmd="cycleScheme" data-seat="' + seat + '">Đổi bộ phím</button> ';
      h2 += '<button class="btn small ghost" data-cmd="removeBot" data-seat="' + seat + '">Xoá phím</button></div>';
    }
  } else if (p.hostSeat) {
    h2 += '<div><span class="chip hot">CHỦ PHÒNG · ĐANG CHƠI</span></div>';
    if (v.phase === 'lobby' || v.phase === 'choosing') {
      h2 += '<div style="margin-top:6px"><button class="btn small ghost" data-cmd="hostLeave">Rời ghế</button></div>';
    }
  } else {
    h2 += '<div><span class="chip cool">NGƯỜI CHƠI</span></div>';
  }
  return h2 + '</div>';
}
function hostHTML(v) {
  var h = topbarHTML(v, true);
  if (v.phase === 'lobby' || v.phase === 'choosing') {
    h += '<div class="card"><div class="logo"><span class="word">nảy</span>' + blobSVG('blue', 'reo', 54) + blobSVG('pink', 'cuoi', 54) + '<span class="party"><span style="background:#4FA8E8">P</span><span style="background:#F77FB0">A</span><span style="background:#FFB35C">R</span><span style="background:#58C472">T</span><span style="background:#A78BFA">Y</span></span></div>';
    h += '<p class="center tagline">Mở Nảy Party trên điện thoại, nhập mã phòng:</p>';
    h += '<div class="codeboxes">';
    for (var i = 0; i < v.code.length; i++) h += '<div class="codebox">' + esc(v.code[i]) + '</div>';
    h += '</div>';
    h += '<p class="center" style="margin:10px 0 0">🔗 Link mời bạn bè: <input class="shareurl" id="shareLink" readonly value="' + esc((location.origin || (location.protocol + '//' + location.host)) + '/?code=' + v.code) + '"> <button class="btn small blue" data-cmd="copyLink">Sao chép link</button></p>';
    var kbFreeT = 0, kbLocT = 0;
    for (var liT = 0; liT < v.players.length; liT++) if (v.players[liT].local) kbLocT++;
    if (kbLocT < 4) for (var fsT = 2; fsT <= 12; fsT++) if (!playerOf(v, fsT)) { kbFreeT = fsT; break; }
    var canKbT = !('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer:fine)').matches);
    h += '<div style="border:3px solid #58C472;border-radius:16px;padding:10px 12px;margin:12px 0 4px;background:rgba(88,196,114,.10)">';
    h += '<div class="center baloo" style="font-size:19px;margin-bottom:8px">🎮 Chủ phòng cũng chơi — chọn cách chơi của bạn</div>';
    h += '<p class="center" style="margin:0">';
    if (kbFreeT && canKbT) h += '<button class="btn green" data-cmd="hostPlayKb" data-seat="' + kbFreeT + '">⌨️ Chơi bằng bàn phím máy này</button> ';
    h += '<button class="btn blue" data-cmd="hostPhone">📱 Chơi bằng điện thoại</button> ';
    if (!mySeatOf(v)) h += '<button class="btn ghost" data-cmd="hostJoinBtn">Ngồi vào ghế trên màn hình này</button>';
    h += '</p>';
    if (S.phoneHelp) h += '<p class="center" style="margin:8px 0 0">Mở Nảy Party trên điện thoại của bạn, nhập mã phòng <b>' + esc(v.code) + '</b> hoặc quét mã QR phía trên — bạn vào như một người chơi bình thường.</p>';
    h += '</div>';
    h += '<div class="seats">';
    for (var s = 1; s <= 12; s++) h += seatCard(v, s);
    h += '</div>';
    var humans = 0; for (var j = 0; j < v.players.length; j++) if (v.players[j].type === 'human') humans++;
    h += '<p class="center" style="margin-top:14px">';
    if (humans < 1) h += '<span class="chip hot">Cần ít nhất 1 người chơi (điện thoại hoặc bàn phím)</span>';
    else if (v.players.length < 2) h += '<span class="chip hot">Thêm Máy hoặc rủ thêm bạn để đủ 2 người</span>';
    else h += '<span class="chip cool">Sẵn sàng! Chọn một game bên dưới để bắt đầu</span>';
    h += '</p>';
    h += '<p class="center small muted" style="margin:8px 0 0">Chơi ngay trên màn hình này: mỗi ghế trống cũng có nút + Phím / + Máy riêng.</p>';
    h += '</div>';
    // Game chooser, grouped by category: versus games race for
    // placement points; co-op games score the whole team one tier.
    // In playlist mode the same cards become queue toggles instead of
    // one-tap starts, with numbered badges showing the queue order.
    function gameCard(gm) {
      // Seat-range lock (same pattern in both modes): a game whose
      // [min, max] excludes the current seat count shows WHY, and a
      // tap explains instead of mysteriously failing.
      var nP = v.players.length;
      var rangeTxt = (gm.min === gm.max ? gm.min : gm.min + '–' + gm.max) + ' người';
      var lockWhy = '';
      if (gm.min && nP < gm.min) lockWhy = '🔒 Cần ít nhất ' + gm.min + ' người chơi (đang có ' + nP + ')';
      else if (gm.max && nP > gm.max) lockWhy = '🔒 Tối đa ' + gm.max + ' người chơi (đang có ' + nP + ')';
      if (S.plMode) {
        var qi = S.plQueue.indexOf(gm.id);
        return '<button class="gamecard' + (qi >= 0 ? ' plon' : '') + (lockWhy ? ' pllock' : '') + '" style="background:' + GCOLORS[gm.id] + '" data-cmd="plToggle" data-game="' + gm.id + '">'
          + (qi >= 0 ? '<span class="plbadge">' + (qi + 1) + '</span>' : '')
          + '<h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p>'
          + (lockWhy ? '<p class="small">' + lockWhy + '</p>' : '<p class="small">' + rangeTxt + ' · ' + (qi >= 0 ? 'Đã chọn · chạm để bỏ khỏi hàng chờ' : 'Chạm để thêm vào hàng chờ') + '</p></button>');
      }
      var small = gm.cat === 'coop' ? '1 trận hợp tác · Cả đội cùng nhận điểm theo hạng' : (gm.rounds > 1 ? gm.rounds + ' vòng · Vòng cuối ×2 điểm' : '1 trận sống còn · 300/200/100/50');
      if (lockWhy) {
        if (gm.min && nP < gm.min) {
          return '<button class="gamecard" style="background:' + GCOLORS[gm.id] + '" data-cmd="quickStart" data-game="' + gm.id + '"><h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p><p class="small">▶ Thiếu ' + (gm.min - nP) + ' người — chạm để thêm Máy và chơi ngay</p></button>';
        }
        return '<button class="gamecard pllock" style="background:' + GCOLORS[gm.id] + '" data-cmd="startLocked" data-game="' + gm.id + '"><h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p><p class="small">' + lockWhy + '</p></button>';
      }
      return '<button class="gamecard" style="background:' + GCOLORS[gm.id] + '" data-cmd="start" data-game="' + gm.id + '"><h3>' + esc(gm.name) + '</h3><p>' + esc(gm.desc) + '</p><p class="small">' + rangeTxt + ' · ' + small + '</p></button>';
    }
    // Playlist builder: arm the mode, tap cards to queue them, then
    // start the chain — or take a preset (random 5 / everything).
    h += '<div class="card center" style="margin-top:12px">';
    if (!S.plMode) {
      h += '<button class="btn purple" data-cmd="plMode">🔁 Chế độ liên hoàn</button>';
      h += '<p class="small muted" style="margin:8px 0 0">Chọn sẵn nhiều game để chơi nối tiếp nhau — hết game này tự sang game kia, cả phòng không phải chọn lại.</p>';
    } else {
      h += '<div class="baloo" style="font-size:21px">🔁 Chế độ liên hoàn</div>';
      h += '<p style="margin:6px 0">Chạm vào các game bên dưới để xếp hàng chờ · đã chọn ' + S.plQueue.length + ' game</p>';
      if (S.plQueue.length) {
        h += '<p class="small" style="margin:4px 0">';
        for (var qi2 = 0; qi2 < S.plQueue.length; qi2++) { var qm = gameMeta(v, S.plQueue[qi2]); h += '<span class="chip cool">' + (qi2 + 1) + '. ' + esc(qm ? qm.name : S.plQueue[qi2]) + '</span>'; }
        h += '</p>';
      }
      h += '<p style="margin:8px 0 0"><button class="btn green" data-cmd="plStart">▶ Chơi liên hoàn (' + S.plQueue.length + ' game)</button> ';
      h += '<button class="btn blue" data-cmd="plRandom">🎲 Ngẫu nhiên 5 game</button> ';
      h += '<button class="btn orange" data-cmd="plAll">🏆 Tất cả game</button> ';
      h += '<button class="btn ghost" data-cmd="plMode">Tắt liên hoàn</button></p>';
    }
    h += '</div>';
    h += '<div class="cathead">🏆 Đấu với nhau</div><div class="games">';
    for (var k = 0; k < v.games.length; k++) if (v.games[k].cat !== 'coop') h += gameCard(v.games[k]);
    h += '</div>';
    h += '<div class="cathead">🤝 Hợp tác</div><div class="games">';
    for (var k2 = 0; k2 < v.games.length; k2++) if (v.games[k2].cat === 'coop') h += gameCard(v.games[k2]);
    h += '</div>';
    return h;
  }
  if (v.phase === 'playing' && v.game) {
    h += scoreStrip(v);
    h += '<p style="text-align:right;margin:2px 0 0"><button class="btn small ghost" data-cmd="quitGame" title="Bỏ game đang chơi, về màn hình chọn game — điểm ván này không tính">Đổi game ✕</button></p>';
    h += '<div class="stage g-' + v.game.id + (isActionGame(v.game.id) ? ' neon-stage' : '') + '">' + hostStage(v) + '</div>';
    if (v.myView) h += mySeatHTML(v);
    return h;
  }
  if (v.phase === 'results') return h + resultsHTML(v, true);
  if (v.phase === 'podium') return h + podiumHTML(v, true);
  if (v.phase === 'final') return h + finalHTML(v, true);
  return h + '<div class="card center"><h2>Đang tải…</h2></div>';
}
function countdownHTML(g) {
  var title = g.id === 'ma-soi' ? 'Đêm ' + g.round : (g.id === 'ca-ngua' || g.id === 'tien-len') ? 'Bắt đầu nào!' : 'Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · VÒNG QUYẾT ĐỊNH ×2' : '');
  return '<div class="cdwrap"><div class="baloo" style="font-size:30px">' + title + '</div>'
    + '<div class="cdnum" id="cdnum">3</div><div class="baloo" style="font-size:24px">Chuẩn bị…</div></div>';
}
// Shared client helpers for the two platformer games (wave 4): rect
// geometry in the arena's % space, stick-fighter pose + damage colour.
function rectStyle(r) { return 'left:' + PX(r.x) + '%;top:' + PY(r.y) + '%;width:' + (r.w / 32 * 100) + '%;height:' + (r.h / 18 * 100) + '%'; }
// Đá Bóng Đầu To maps its 38 x 19.2 space onto the wide field.
function rectStyleS(r) {
  return 'left:' + ((r.x + 19) / 38 * 100) + '%;top:' + ((r.y + 9.6) / 19.2 * 100) + '%;width:' + (r.w / 38 * 100) + '%;height:' + (r.h / 19.2 * 100) + '%';
}
function pctS(x, y) { return { l: (x + 19) / 38 * 100, t: (y + 9.6) / 19.2 * 100 }; }
function fightPose(b) {
  if (!b.alive || b.hit) return 'hit';
  if (b.hvy) return 'atkh';
  if (b.atk) return 'atk';
  if (!b.ground) return 'air';
  if (Math.abs(b.vx || 0) > 0.1) return 'run';
  return 'idle';
}
function dmgColor(d) { return d >= 100 ? '#FF5A3C' : d >= 50 ? '#FFC93D' : '#7BE0B8'; }
function hostStage(v) {
  var g = v.game;
  if (g.phase === 'countdown') return countdownHTML(g);
  var h = '<h2>' + esc(g.name) + (g.id === 'ma-soi' ? ' · Đêm ' + (g.night || g.round) : (g.id === 'ca-ngua' || g.id === 'tien-len') ? '' : ' · Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · ×2' : '')) + '</h2>';
  var t = serverNow();
  if (g.id === 'do-vui') {
    if (g.phase === 'question' || g.phase === 'reveal') {
      h += '<div class="baloo" style="font-size:30px">' + esc(g.question) + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['do-vui']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="optgrid">';
      for (var a = 0; a < 4; a++) {
        var cls = 'opt';
        if (g.phase === 'reveal' && g.reveal) cls += (a === g.reveal.correct ? ' right' : ' dim');
        h += '<div class="' + cls + '">' + LETTERS[a] + '. ' + esc(g.options[a]) + '</div>';
      }
      h += '</div>';
      if (g.phase === 'question') {
        h += '<div class="scorebar">';
        for (var b = 0; b < v.players.length; b++) { var q = v.players[b]; h += '<span class="scorechip">' + blobSVG(q.color, q.mood, 28) + ' ' + esc(q.name) + ' ' + (g.answered && g.answered[q.seat] ? '✓' : '…') + '</span>'; }
        h += '</div>';
      } else if (g.reveal) {
        h += '<div class="rows">';
        for (var c = 0; c < v.standings.length; c++) { var rp = playerOf(v, v.standings[c]); var pts = g.reveal.points[rp.seat] || 0; var stk = g.reveal.streaks[rp.seat] || 0; h += '<div class="rrow">' + blobSVG(rp.color, rp.mood, 34) + ' ' + esc(rp.name) + (stk >= 2 ? '<span class="chip hot">Chuỗi đúng ×' + stk + '</span>' : '') + '<span class="pts">' + (pts > 0 ? '+' : '') + fmt(pts) + '</span></div>'; }
        h += '</div>';
      }
    }
  } else if (g.id === 'day-ra') {
    if (g.phase === 'arena') {
      h += '<div class="baloo" style="font-size:25px">Đẩy hết đối thủ ra khỏi vòng tròn! Sàn đang thu hẹp dần…</div>';
      h += '<div class="afield" id="afield"><div class="aring dynring" id="aring" style="transform:translate(-50%,-50%) scale(' + (g.arenaR * 25 / 300) + ')"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      for (var aI = 0; aI < v.players.length; aI++) { var ap = v.players[aI]; h += '<div class="ablob" id="ablob-' + ap.seat + '" style="left:50%;top:50%;color:' + COLORS[ap.color] + '">' + orbSVG(ap.color, 62) + '<div class="aname">' + esc(ap.name) + '</div><div class="alives" id="alives-' + ap.seat + '"></div></div>'; }
      h += '</div>';

    }
  } else if (g.id === 'ne-dan') {
    if (g.phase === 'dodge') {
      h += '<div class="baloo" style="font-size:25px">Né hết đạn pháo! Trúng là mất 1 mạng…</div>';
      h += '<div class="afield" id="afield"><div class="aring dynring" id="aring" style="transform:translate(-50%,-50%) scale(' + (g.arenaR * 25 / 300) + ')"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      for (var dI = 0; dI < v.players.length; dI++) { var dp = v.players[dI]; h += '<div class="ablob" id="ablob-' + dp.seat + '" style="left:50%;top:50%;color:' + COLORS[dp.color] + '">' + orbSVG(dp.color, 62) + '<div class="aname">' + esc(dp.name) + '</div><div class="alives" id="alives-' + dp.seat + '"></div></div>'; }
      h += '</div>';

    }
  } else if (g.id === 'keo-co') {
    if (g.phase === 'pull') {
      h += '<div class="baloo" style="font-size:25px">Đội A (ghế lẻ) ⟵ KÉO! ⟶ Đội B (ghế chẵn)</div>';
      var kpct = Math.max(3, Math.min(97, 50 + (g.knot / 112) * 46));
      h += '<div class="rope"><div class="mid"></div><div class="knot" id="tugknot" style="left:' + kpct + '%"></div></div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var tI = 0; tI < v.players.length; tI++) { var tp = v.players[tI]; var tm = tp.seat % 2 === 1 ? 'A' : 'B'; h += '<span class="scorechip">' + blobSVG(tp.color, tp.mood, 28) + ' ' + esc(tp.name) + ' · Đội ' + tm + ' · <span id="tugpress-' + tp.seat + '">' + (g.presses ? (g.presses[tp.seat] || 0) : 0) + '</span> lần kéo</span>'; }
      h += '</div>';

    }
  } else if (g.id === 'chia-cuop') {
    var pa = g.pair ? playerOf(v, g.pair[0]) : null; var pb = g.pair ? playerOf(v, g.pair[1]) : null;
    if (pa && pb) {
      h += '<div class="center"><span class="blobbob">' + orbSVG(pa.color, 74) + '</span> <span class="baloo" style="font-size:26px"> ' + esc(pa.name) + ' ⚔ ' + esc(pb.name) + ' </span> <span class="blobbob">' + orbSVG(pb.color, 74) + '</span></div>';
      h += '<div class="center baloo" style="font-size:23px">Nồi điểm vòng này: ' + fmt(g.pot || 400) + ' điểm' + (g.finalRound ? ' (VÒNG CUỐI ×2!)' : '') + '</div>';
    }
    if (g.phase === 'talk') {
      h += '<div class="baloo" style="font-size:24px">Đang thương lượng… hai người cứ thuyết phục nhau đi!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 60000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.chat) for (var cI2 = 0; cI2 < g.chat.length; cI2++) { var cp = playerOf(v, g.chat[cI2].seat); h += '<div class="chatrow">' + blobSVG(cp ? cp.color : 'blue', 'cuoi', 26) + ' <b>' + esc(cp ? cp.name : '') + ':</b> ' + esc(g.chat[cI2].text) + '</div>'; }

    } else if (g.phase === 'choose') {
      h += '<div class="baloo" style="font-size:26px">Đang chọn bí mật… không ai biết ai chọn gì!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 15000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      if (g.pair) for (var sI = 0; sI < g.pair.length; sI++) { var sp = playerOf(v, g.pair[sI]); h += '<span class="scorechip">' + blobSVG(sp.color, sp.mood, 28) + ' ' + esc(sp.name) + ' ' + (g.chosen && g.chosen[sp.seat] ? 'đã khoá ✓' : 'đang nghĩ…') + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'reveal' && g.reveal) {
      h += '<div class="baloo" style="font-size:27px">Công bố!</div><div class="rows">';
      for (var vI = 0; vI < g.reveal.entries.length; vI++) {
        var ve = g.reveal.entries[vI]; var vp = playerOf(v, ve.seat);
        h += '<div class="rrow rev" data-reveal="' + ve.revealAt + '">' + orbSVG(vp.color, 34) + ' ' + esc(vp.name) + '<span class="chip ' + (ve.choice === 'cuop' ? 'hot' : 'cool') + '">' + (ve.choice === 'cuop' ? 'CƯỚP!' : 'CHIA') + '</span><span class="pts">+' + fmt(ve.points) + '</span></div>';
      }
      h += '</div>';
    }
  } else if (g.id === 'cuop-sao') {
    if (g.phase === 'steal') {
      h += '<div class="baloo" style="font-size:25px">Nhặt sao vàng, xô đối thủ cho rơi sao! Sao lớn = 3 sao thường</div>';
      h += '<div class="afield" id="afield"><div class="aring" id="aring"></div>';
      for (var aI2 = 0; aI2 < v.players.length; aI2++) { var ap2 = v.players[aI2]; h += '<div class="ablob" id="ablob-' + ap2.seat + '" style="left:50%;top:50%;color:' + COLORS[ap2.color] + '">' + orbSVG(ap2.color, 62) + '<div class="aname">' + esc(ap2.name) + '</div></div>'; }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var bI = 0; bI < v.players.length; bI++) { var bp = v.players[bI]; h += '<span class="scorechip">' + orbSVG(bp.color, 26) + ' ' + esc(bp.name) + ' · ★ <span id="bankn-' + bp.seat + '">' + (g.banked ? (g.banked[bp.seat] || 0) : 0) + '</span></span>'; }
      h += '</div>';
    }
  } else if (g.id === 'giu-vuong-mien') {
    if (g.phase === 'crown') {
      h += '<div class="baloo" style="font-size:25px">Giành vương miện và giữ càng lâu càng tốt! Bị xô là rơi vương miện</div>';
      h += '<div class="afield" id="afield"><div class="aring" id="aring"></div><div class="acrown" id="acrown" style="left:50%;top:50%">' + crownSVG(60) + '</div>';
      for (var cI3 = 0; cI3 < v.players.length; cI3++) { var cp3 = v.players[cI3]; h += '<div class="ablob" id="ablob-' + cp3.seat + '" style="left:50%;top:50%;color:' + COLORS[cp3.color] + '">' + orbSVG(cp3.color, 62) + '<div class="aname">' + esc(cp3.name) + '</div></div>'; }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var hI = 0; hI < v.players.length; hI++) { var hp = v.players[hI]; h += '<span class="scorechip">' + orbSVG(hp.color, 26) + ' ' + esc(hp.name) + ' · 👑 <span id="holdn-' + hp.seat + '">' + (g.hold ? (g.hold[hp.seat] || 0) : 0) + '</span></span>'; }
      h += '</div>';
    }
  } else if (g.id === 'son-san') {
    if (g.phase === 'splat') {
      h += '<div class="baloo" style="font-size:25px">Chạy sơn sàn theo màu của mình — hết giờ ai nhiều ô nhất thắng!</div>';
      h += '<div class="afield" id="afield"><div class="splatgrid">';
      for (var gI = 0; gI < 180; gI++) { var gs = g.grid ? g.grid[gI] : 0; var gp2 = gs ? playerOf(v, gs) : null; h += '<div class="scell" id="scell-' + gI + '"' + (gp2 ? ' style="background:' + COLORS[gp2.color] + '"' : '') + '></div>'; }
      h += '</div>';
      for (var sI3 = 0; sI3 < v.players.length; sI3++) { var sp3 = v.players[sI3]; h += '<div class="ablob" id="ablob-' + sp3.seat + '" style="left:50%;top:50%;color:' + COLORS[sp3.color] + '">' + orbSVG(sp3.color, 54) + '<div class="aname">' + esc(sp3.name) + '</div></div>'; }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var cI4 = 0; cI4 < v.players.length; cI4++) { var cp4 = v.players[cI4]; h += '<span class="scorechip">' + orbSVG(cp4.color, 26) + ' ' + esc(cp4.name) + ' · <span id="scount-' + cp4.seat + '">' + (g.counts ? (g.counts[cp4.seat] || 0) : 0) + '</span> ô</span>'; }
      h += '</div>';
    }
  } else if (g.id === 'cao-boi') {
    if (g.phase === 'wait') h += '<div class="bigcircle wait">ĐỢI…<br><span style="font-size:19px">Tay để yên trên nút…</span></div>';
    else if (g.phase === 'go') h += '<div class="duel-bang">BẮN!</div>';
    if (g.phase === 'roundEnd' && g.lastRound) {
      h += '<div class="rows">';
      for (var dI2 = 0; dI2 < g.lastRound.entries.length; dI2++) {
        var de = g.lastRound.entries[dI2]; var dp2 = playerOf(v, de.seat);
        var mid2 = de.status === 'fired' ? de.reactionMs + ' ms' + (de.order === 1 ? ' · NHANH NHẤT!' : ' · thứ ' + de.order) : (de.status === 'foul' ? 'Phạm quy! Bắn trước hiệu lệnh' : 'Không bắn');
        h += '<div class="rrow">' + blobSVG(dp2.color, dp2.mood, 34) + ' ' + esc(dp2.name) + '<span class="muted">' + mid2 + '</span><span class="pts">' + (de.points > 0 ? '+' : '') + fmt(de.points) + '</span></div>';
      }
      h += '</div>';
    } else if (g.phase !== 'roundEnd') {
      h += '<div class="scorebar">';
      for (var dI3 = 0; dI3 < v.players.length; dI3++) { var dp3 = v.players[dI3]; var dst = g.status ? g.status[dp3.seat] : 'waiting'; h += '<span class="scorechip">' + blobSVG(dp3.color, dp3.mood, 28) + ' ' + esc(dp3.name) + ' · ' + (dst === 'fired' ? 'đã bắn!' : dst === 'foul' ? 'phạm quy!' : 'đang đợi…') + '</span>'; }
      h += '</div>';
    }
  } else if (g.id === 'chung-mot-than') {
    if (g.phase === 'shared') {
      h += '<div class="scorebar"><span class="scorechip">⭐ Điểm kiểm tra: <b id="checkn">' + (g.checks || 0) + '</b></span><span class="scorechip">Tim đội: <b id="teamhearts">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</b></span>';
      var dirNames = { u: '▲ Lên', r: '▶ Phải', d: '▼ Xuống', l: '◀ Trái' };
      var dirKeys = ['u', 'r', 'd', 'l'];
      for (var oI = 0; oI < 4; oI++) { var op = g.owners ? playerOf(v, g.owners[dirKeys[oI]]) : null; if (op) h += '<span class="scorechip">' + dirNames[dirKeys[oI]] + ': ' + esc(op.name) + '</span>'; }
      h += '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - 60000) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="afield" id="afield"><div class="aring" style="width:95%;height:91.1%"></div>';
      if (g.star) h += '<div class="astar gold" id="cstar" style="left:' + PX(g.star.x) + '%;top:' + PY(g.star.y) + '%">★</div>';
      h += '<div class="ablob" id="sharedblob" style="left:50%;top:50%">' + sharedOrbSVG(v, 66) + '<div class="aname">CẢ ĐỘI</div></div>';
      h += '</div>';
      h += '<p class="center">Một quả bóng, bốn người lái — mỗi người giữ một hướng! Chạm sao ⭐ là +1 điểm kiểm tra · Trúng đạn là cả đội mất 1 tim</p>';
    }
  } else if (g.id === 'day-hop') {
    if (g.phase === 'box') {
      h += '<div class="scorebar"><span class="scorechip">📦 Đã giao: <b id="delivn">' + (g.deliveries || 0) + '</b> hộp</span><span class="scorechip">Mê cung ' + ((g.layout || 0) + 1) + '/3</span></div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="afield" id="afield">';
      if (g.goal) h += '<div class="agoal" style="' + rectStyle(g.goal) + '">ĐÍCH</div>';
      if (g.walls) for (var wI = 0; wI < g.walls.length; wI++) { var wl = g.walls[wI]; h += '<div class="awallseg" style="' + rectStyle(wl) + '"></div>'; }
      h += '<div class="acrate" id="acrate" style="left:50%;top:50%">📦</div>';
      for (var pI3 = 0; pI3 < v.players.length; pI3++) { var pp3 = v.players[pI3]; h += '<div class="ablob" id="ablob-' + pp3.seat + '" style="left:50%;top:50%;color:' + COLORS[pp3.color] + '">' + orbSVG(pp3.color, 58) + '<div class="aname">' + esc(pp3.name) + '</div></div>'; }
      h += '</div>';
      h += '<p class="center">Một người đẩy không nhúc nhích — phải từ 2 người cùng đẩy mới đi! Đưa hộp vào ô ĐÍCH xanh lá</p>';
    }
  } else if (g.id === 'cheo-thuyen') {
    if (g.phase === 'row') {
      h += '<div class="baloo" style="font-size:25px">Cả đội chèo theo nhịp — bấm đúng nhịp vàng mới tiến!</div>';
      h += '<div class="scorebar"><span class="scorechip">🚣 Đã đi: <b id="rowdist">' + Math.round(g.distance || 0) + '</b>/' + (g.course || 400) + ' m</span><span class="scorechip">Nhịp <b id="rowbeat">' + (g.beat || 1) + '</b>/' + (g.beats || 45) + '</span></div>';
      h += '<div class="racebar"><i id="rowprog" style="background:#38BDF8;width:0%"></i><b>Tiến độ về đích</b></div>';
      h += '<div class="water"><div class="beating" id="beating"></div><div class="aboat" id="aboat" style="left:5%">🚣</div><div class="buoy">🏁</div></div>';
      h += '<div class="tbar"><i data-start="' + g.rowStart + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var rI3 = 0; rI3 < v.players.length; rI3++) { var rp3 = v.players[rI3]; h += '<span class="scorechip">' + orbSVG(rp3.color, 26) + ' ' + esc(rp3.name) + ' · trúng nhịp <span id="rowhit-' + rp3.seat + '">' + (g.hits ? (g.hits[rp3.seat] || 0) : 0) + '</span></span>'; }
      h += '</div>';
    }
  } else if (g.id === 'xe-tank') {
    if (g.phase === 'tank') {
      h += '<div class="baloo" style="font-size:25px">Lái xe tăng, bắn hạ đối thủ! Núp sau thùng chắn — đạn không xuyên qua được</div>';
      h += '<div class="afield" id="afield"><div class="aframe" style="left:2.5%;top:4.44%;width:95%;height:91.11%"></div><div class="ko-banner" id="kobanner"><div class="ko-txt">K.O.!</div><div><span class="ko-sub" id="kosub"></span></div></div>';
      if (g.blocks) for (var kI = 0; kI < g.blocks.length; kI++) { var kb = g.blocks[kI]; h += '<div class="ablock" style="' + rectStyle(kb) + '"></div>'; }
      for (var tI2 = 0; tI2 < v.players.length; tI2++) { var tp2 = v.players[tI2]; var fc = g.facing ? g.facing[tp2.seat] : null; var deg = fc ? Math.round(Math.atan2(fc.y, fc.x) * 180 / Math.PI) : 0; h += '<div class="ablob" id="ablob-' + tp2.seat + '" style="left:50%;top:50%;color:' + COLORS[tp2.color] + '"><span class="orbwrap">' + orbSVG(tp2.color, 62) + '<span class="abarrel" id="barrel-' + tp2.seat + '" style="transform:rotate(' + deg + 'deg)"></span></span><div class="aname">' + esc(tp2.name) + '</div><div class="alives" id="alives-' + tp2.seat + '"></div></div>'; }
      h += '</div>';
      h += '<p class="center">Trúng đạn mất 1 mạng · Hết 3 mạng là bị loại · A: bắn · B: lướt nhanh</p>';
    }
  } else if (g.id === 'dat-bom') {
    if (g.phase === 'bomber') {
      h += '<div class="baloo" style="font-size:25px">Đặt bom phá tường gỗ, thổi bay đối thủ! Né xa vụ nổ chữ thập</div>';
      h += '<div class="afield" id="afield">';
      if (g.hard) for (var hI2 = 0; hI2 < g.hard.length; hI2++) h += '<div class="bhard" style="left:' + (g.hard[hI2][0] * 6.25) + '%;top:' + (g.hard[hI2][1] * 11.1111) + '%;width:6.25%;height:11.1111%"></div>';
      if (g.soft) for (var sI4 = 0; sI4 < g.soft.length; sI4++) h += '<div class="bsoft" id="bsoft-' + g.soft[sI4][0] + ',' + g.soft[sI4][1] + '" style="left:' + (g.soft[sI4][0] * 6.25) + '%;top:' + (g.soft[sI4][1] * 11.1111) + '%;width:6.25%;height:11.1111%"></div>';
      for (var bI4 = 0; bI4 < v.players.length; bI4++) { var bp4 = v.players[bI4]; h += '<div class="ablob" id="ablob-' + bp4.seat + '" style="left:50%;top:50%;color:' + COLORS[bp4.color] + '">' + orbSVG(bp4.color, 56) + '<div class="aname">' + esc(bp4.name) + '</div><div class="alives" id="alives-' + bp4.seat + '"></div></div>'; }
      h += '</div>';
      h += '<p class="center">Tường xám không phá được · Tường gỗ phá được · Nổ dây chuyền khi lửa chạm bom khác · Trúng nổ mất 1 mạng (có 2 mạng)</p>';
    }
  } else if (g.id === 'ke-gia-mao') {
    h += '<div class="center baloo" style="font-size:31px">🕵️ AI LÀ KẺ GIẢ MẠO?</div>';
    h += '<div class="center"><span class="chip cool">Chủ đề: ' + esc(g.category || '') + '</span></div>';
    if (g.phase === 'answer') {
      h += '<div class="baloo" style="font-size:24px">Mỗi người đang trả lời MỘT câu hỏi bí mật trên điện thoại của mình… và một người nhận câu hỏi KHÁC!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var iI = 0; iI < v.players.length; iI++) { var ip = v.players[iI]; h += '<span class="scorechip">' + blobSVG(ip.color, ip.mood, 28) + ' ' + esc(ip.name) + ' ' + (g.answered && g.answered[ip.seat] ? 'đã trả lời ✓' : 'đang nghĩ…') + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'discuss') {
      h += '<div class="baloo" style="font-size:24px">Bàn luận đi! Ai đang nói dối về câu hỏi của mình?</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 45000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.chatLog) for (var cI6 = 0; cI6 < g.chatLog.length; cI6++) { var cp6 = playerOf(v, g.chatLog[cI6].seat); h += '<div class="chatrow">' + blobSVG(cp6 ? cp6.color : 'blue', 'cuoi', 26) + ' <b>' + esc(cp6 ? cp6.name : '') + ':</b> ' + esc(g.chatLog[cI6].text) + '</div>'; }
    } else if (g.phase === 'vote') {
      h += '<div class="baloo" style="font-size:26px">Tố cáo! Mọi người chọn kẻ giả mạo trên điện thoại…</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var vI2 = 0; vI2 < v.players.length; vI2++) { var vp3 = v.players[vI2]; h += '<span class="scorechip">' + blobSVG(vp3.color, vp3.mood, 28) + ' ' + esc(vp3.name) + ' ' + (g.voted && g.voted[vp3.seat] ? 'đã tố cáo ✓' : 'đang chọn…') + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'reveal' && g.reveal) {
      var rv = g.reveal; var imp = playerOf(v, rv.impostor);
      h += '<div class="center baloo" style="font-size:29px">' + (rv.caught ? '🎉 BẮT ĐƯỢC KẺ GIẢ MẠO!' : '😈 KẺ GIẢ MẠO ĐÃ THOÁT!') + '</div>';
      h += '<div class="center"><span class="blobbob">' + orbSVG(imp.color, 84, !rv.caught) + '</span><div class="baloo" style="font-size:24px">Kẻ giả mạo là: ' + esc(imp.name) + '!</div></div>';
      h += '<div class="impq"><div class="qcard"><b>Câu hỏi thật:</b><br>' + esc(rv.realQ) + '</div><div class="qcard"><b>Câu hỏi của kẻ giả mạo:</b><br>' + esc(rv.fakeQ) + '</div></div>';
      h += '<div class="rows">';
      for (var rI4 = 0; rI4 < v.players.length; rI4++) {
        var rp4 = v.players[rI4]; var vt = rv.votes ? rv.votes[rp4.seat] : null; var tp4 = vt ? playerOf(v, vt) : null;
        var ans = rv.answers ? rv.answers[rp4.seat] : null;
        h += '<div class="rrow">' + blobSVG(rp4.color, rp4.mood, 34) + ' ' + esc(rp4.name) + (rp4.seat === rv.impostor ? '<span class="chip hot">GIẢ MẠO</span>' : '') + '<span class="muted">' + (ans == null ? 'không trả lời' : 'đã chọn ' + LETTERS[ans]) + ' · tố cáo: ' + (tp4 ? esc(tp4.name) : '—') + '</span><span class="pts">' + (rv.points[rp4.seat] > 0 ? '+' : '') + fmt(rv.points[rp4.seat] || 0) + '</span></div>';
      }
      h += '</div>';
    }
  } else if (g.id === 'thu-thanh') {
    if (g.phase === 'defend') {
      h += '<div class="scorebar"><span class="scorechip">💎 Pha lê: <b id="crystalhp">' + (g.crystal ? g.crystal.hp : 10) + '</b>/10</span><span class="scorechip">🟢 Đã hạ: <b id="killn">' + (g.kills || 0) + '</b> slime</span></div>';
      h += '<div class="afield" id="afield"><div class="aring" style="width:95%;height:91.1%"></div>';
      h += '<div class="acrystal">💎<div class="chp" id="crystalhearts">' + (g.crystal ? '❤'.repeat(Math.max(0, g.crystal.hp)) : '') + '</div></div>';
      for (var dI4 = 0; dI4 < v.players.length; dI4++) { var dp4 = v.players[dI4]; var fc2 = g.facing ? g.facing[dp4.seat] : null; var deg2 = fc2 ? Math.round(Math.atan2(fc2.y, fc2.x) * 180 / Math.PI) : 0; h += '<div class="ablob" id="ablob-' + dp4.seat + '" style="left:50%;top:50%;color:' + COLORS[dp4.color] + '"><span class="orbwrap">' + orbSVG(dp4.color, 62) + '<span class="abarrel" id="barrel-' + dp4.seat + '" style="transform:rotate(' + deg2 + 'deg)"></span></span><div class="aname">' + esc(dp4.name) + '</div></div>'; }
      h += '</div>';
      h += '<p class="center">Đừng để slime chạm vào pha lê! Sống sót hết giờ: pha lê còn ≥7 tim = hạng VÀNG · ≥4 = BẠC · ≥1 = ĐỒNG</p>';
    }
  } else if (g.id === 'giai-ma-chung') {
    if (g.phase === 'decode' || g.phase === 'levelup') {
      h += '<div class="teambanner">MÀN ' + (g.level || 1) + ' · Tim đội: ' + '❤'.repeat(Math.max(0, g.hearts || 0)) + ' · Đã qua: ' + (g.levelsDone || 0) + ' màn</div>';
      if (g.phase === 'levelup') h += '<div class="center baloo" style="font-size:30px">QUA MÀN! 🎉 Chuẩn bị màn tiếp theo…</div>';
      h += '<div class="pips">';
      for (var pI5 = 0; pI5 < (g.total || 0); pI5++) h += '<div class="pip' + (pI5 < (g.done || 0) ? ' done' : pI5 === (g.done || 0) ? ' now' : '') + '"></div>';
      h += '</div>';
      h += '<div class="baloo center" style="font-size:22px">Mỗi người chỉ thấy phần mật mã CỦA MÌNH trên điện thoại — gọi nhau mà bấm cho đúng thứ tự!</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'nguoi-que') {
    if (g.phase === 'fight') {
      h += '<div class="afield" id="afield">';
      (g.platforms || []).forEach(function (pf) { h += '<div class="fplat' + (pf.oneWay ? ' oneway' : '') + '" style="' + rectStyle(pf) + '"></div>'; });
      for (var fI = 0; fI < v.players.length; fI++) {
        var fp = v.players[fI]; var fb = g.blobs[fp.seat];
        h += '<div class="ablob" id="ablob-' + fp.seat + '" style="left:' + PX(fb.x) + '%;top:' + PY(fb.y) + '%;color:' + COLORS[fp.color] + '">'
          + '<div class="admg" id="dmg-' + fp.seat + '" style="color:' + dmgColor(fb.dmg || 0) + '">' + (fb.dmg || 0) + '%</div>'
          + '<span id="fig-' + fp.seat + '">' + stickSVG(fp.color, fightPose(fb), fb.face) + '</span>'
          + '<div class="alives" id="alives-' + fp.seat + '">' + '♥'.repeat(Math.max(0, fb.lives)) + '</div>'
          + '<div class="aname">' + esc(fp.name) + '</div></div>';
      }
      h += '</div>';
      h += '<p class="center">Đánh đối thủ tích % sát thương — % càng cao văng càng xa! Văng khỏi sàn là mất một mạng.</p>';
    }
  } else if (g.id === 'den-lua-nuoc') {
    if (g.phase === 'temple') {
      h += '<div class="scorebar"><span class="scorechip">🔥 Ngọc lửa: <b id="gemlua">' + (g.gemCount ? g.gemCount.lua : 0) + '</b>/5</span><span class="scorechip">💧 Ngọc nước: <b id="gemnuoc">' + (g.gemCount ? g.gemCount.nuoc : 0) + '</b>/5</span><span class="scorechip">Tim đội: <b id="temphearts">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</b></span></div>';
      h += '<div class="afield" id="afield">';
      (g.solids || []).forEach(function (s) { h += '<div class="tbrick" style="' + rectStyle(s) + '"></div>'; });
      (g.pools || []).forEach(function (pl) { h += '<div class="tpool ' + pl.kind + '" style="' + rectStyle(pl) + '"></div>'; });
      (g.buttons || []).forEach(function (bt) { h += '<div class="tbtn" style="' + rectStyle(bt) + '"></div>'; });
      if (g.doors) { h += '<div class="tdoor lua" style="' + rectStyle(g.doors.lua) + '"></div>'; h += '<div class="tdoor nuoc" style="' + rectStyle(g.doors.nuoc) + '"></div>'; }
      (g.gates || []).forEach(function (gt, gi) { h += '<div class="tgate' + (g.gateOpen ? ' open' : '') + '" id="gate-' + gi + '" style="' + rectStyle(gt) + '"></div>'; });
      (g.gems || []).forEach(function (gm) { h += '<div class="tgem ' + gm.el + (gm.taken ? ' taken' : '') + '" id="tgem-' + gm.id + '" style="left:' + PX(gm.x) + '%;top:' + PY(gm.y) + '%"><i></i></div>'; });
      for (var tI = 0; tI < v.players.length; tI++) {
        var tp = v.players[tI]; var tc = g.chars[tp.seat];
        if (!tc) continue;
        h += '<div class="achar' + (tc.home ? ' home' : '') + '" id="achar-' + tp.seat + '" style="left:' + PX(tc.x) + '%;top:' + PY(tc.y) + '%">' + charSVG(tc.el, tp.color) + '<div class="aname">' + esc(tp.name) + '</div></div>';
      }
      h += '</div>';
      h += '<p class="center">Hồ đỏ chỉ Lửa qua được, hồ xanh chỉ Nước, hồ xanh lá hại cả hai! Đứng lên nút vàng để mở cổng cho đồng đội, rồi về đúng cửa của mình.</p>';
    }
  } else if (g.id === 'ma-soi') {
    var deadRole = {};
    if (g.deadList) for (var dL = 0; dL < g.deadList.length; dL++) deadRole[g.deadList[dL].seat] = g.deadList[dL].role;
    var wbanner = { night: '🌙 ĐÊM ' + (g.night || 1) + ' — LÀNG ĐANG NGỦ…', dawn: '☀️ BÌNH MINH ĐÊM ' + (g.night || 1), discuss: '🗣️ BÀN LUẬN — AI LÀ SÓI?', vote: '🗳️ BỎ PHIẾU TREO CỔ', execute: '⚖️ KẾT QUẢ BỎ PHIẾU', wolfEnd: '🏁 TRỜI SÁNG HẲN — KẾT THÚC!' };
    h += '<div class="center baloo" style="font-size:27px">' + (wbanner[g.phase] || '') + '</div>';
    if (g.phase === 'night') {
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 45000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<p class="center">Sói đang săn mồi · Bảo Vệ đang canh giữ · Tiên Tri đang soi · Phù Thủy đang cân nhắc hai lọ thuốc — tất cả bí mật trên điện thoại của từng người!</p>';
    } else if (g.phase === 'dawn') {
      if (g.dawnDeaths && g.dawnDeaths.length) {
        h += '<div class="baloo center" style="font-size:24px">Đêm qua, làng đã mất:</div><div class="rows">';
        for (var dI = 0; dI < g.dawnDeaths.length; dI++) { var dd = g.dawnDeaths[dI]; var dp5 = playerOf(v, dd.seat); if (dp5) h += '<div class="rrow">' + blobSVG(dp5.color, 'buon', 34) + ' ' + esc(dp5.name) + '<span class="chip hot">' + (WOLF_ROLE_NAMES[dd.role] || '') + '</span><span class="muted">' + (dd.role === 'soi' ? 'Một con sói đã gục ngã!' : 'Một người vô tội ra đi…') + '</span></div>'; }
        h += '</div>';
      } else {
        h += '<div class="baloo center" style="font-size:25px">🌿 Một đêm yên bình — không ai phải ra đi!</div>';
      }
    } else if (g.phase === 'discuss') {
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 60000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.chatLog) for (var cI7 = 0; cI7 < g.chatLog.length; cI7++) { var cp7 = playerOf(v, g.chatLog[cI7].seat); h += '<div class="chatrow">' + blobSVG(cp7 ? cp7.color : 'blue', 'cuoi', 26) + ' <b>' + esc(cp7 ? cp7.name : '') + ':</b> ' + esc(g.chatLog[cI7].text) + '</div>'; }
    } else if (g.phase === 'vote') {
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var vI4 = 0; vI4 < v.players.length; vI4++) { var vp5 = v.players[vI4]; var isDead = g.aliveMap && !g.aliveMap[vp5.seat]; h += '<span class="scorechip">' + blobSVG(vp5.color, vp5.mood, 28) + ' ' + esc(vp5.name) + ' ' + (isDead ? '💀' : (g.voted && g.voted[vp5.seat] ? 'đã bỏ phiếu ✓' : 'đang nghĩ…')) + '</span>'; }
      h += '</div>';
    } else if (g.phase === 'execute' || g.phase === 'wolfEnd') {
      if (g.exec) {
        if (g.exec.seat) { var ep2 = playerOf(v, g.exec.seat); h += '<div class="center baloo" style="font-size:26px">Làng đã treo cổ ' + esc(ep2 ? ep2.name : '') + ' — đó là ' + (WOLF_ROLE_NAMES[g.exec.role] || '') + '!</div>'; }
        else h += '<div class="center baloo" style="font-size:25px">Phiếu hoà hoặc chưa đủ — hôm nay không ai bị treo cổ.</div>';
      }
      if (g.voteTally) {
        h += '<div class="rows">';
        for (var tSeat in g.voteTally) { var tp5 = playerOf(v, +tSeat); if (tp5) h += '<div class="rrow">' + blobSVG(tp5.color, tp5.mood, 30) + ' ' + esc(tp5.name) + '<span class="pts">' + g.voteTally[tSeat] + ' phiếu</span></div>'; }
        h += '</div>';
      }
    }
    if (g.phase === 'wolfEnd') {
      h += '<div class="center baloo" style="font-size:30px">' + (g.winner === 'soi' ? '🐺 BẦY SÓI THẮNG! Làng đã bị sói ăn mòn…' : '🎉 DÂN LÀNG THẮNG! Sói đã bị quét sạch!') + '</div>';
      h += '<div class="rows">';
      for (var wI = 0; wI < v.players.length; wI++) { var wp = v.players[wI]; var wr = g.roles ? g.roles[wp.seat] : null; h += '<div class="rrow">' + blobSVG(wp.color, wp.mood, 34) + ' ' + esc(wp.name) + (wr ? '<span class="chip ' + (wr === 'soi' ? 'hot' : 'cool') + '">' + WOLF_ROLE_NAMES[wr] + '</span>' : '') + '<span class="pts">+' + fmt(g.points[wp.seat] || 0) + '</span></div>'; }
      h += '</div>';
    } else {
      h += '<div class="wolfgrid">';
      for (var gI2 = 0; gI2 < v.players.length; gI2++) {
        var gp3 = v.players[gI2]; var alive3 = !g.aliveMap || g.aliveMap[gp3.seat];
        h += '<div class="wolfcard' + (alive3 ? '' : ' dead') + '">' + blobSVG(gp3.color, alive3 ? gp3.mood : 'buon', 54) + '<div>' + esc(gp3.name) + '</div>'
          + (alive3 ? '<div class="small muted">😴 đang yên giấc / còn sống</div>' : '<div class="rolechip">💀 ' + (WOLF_ROLE_NAMES[deadRole[gp3.seat]] || '') + '</div>') + '</div>';
      }
      h += '</div>';
    }
  } else if (g.id === 'ca-ngua') {
    var turnP = g.turn ? playerOf(v, g.turn) : null;
    if (g.phase === 'ngWin' && g.winner) {
      var winP = playerOf(v, g.winner);
      h += '<div class="center baloo" style="font-size:29px">🏆 ' + esc(winP ? winP.name : '') + ' ĐƯA CẢ 4 NGỰA VỀ CHUỒNG — THẮNG!</div>';
    } else {
      h += '<div class="center baloo" style="font-size:24px">Lượt của: ' + (turnP ? esc(turnP.name) : '') + (g.dice ? ' · <span class="diceface">' + DICE_FACES[g.dice] + '</span> ' + g.dice + ' chấm' : ' · đang chờ thảy xúc xắc…') + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
    // Wide layout: the square board keeps the full stage height in the
    // middle; the freed side columns carry the turn order + per-player
    // progress (left) and the event log (right), so the whole row
    // spans the TV instead of leaving two dead bands.
    h += '<div class="ngrow"><div class="ngside"><h3>Thứ tự lượt & tiến độ</h3>';
    var turnIdx = 0;
    for (var tIx = 0; tIx < v.players.length; tIx++) if (v.players[tIx].seat === g.turn) turnIdx = tIx;
    for (var nI2 = 0; nI2 < v.players.length; nI2++) {
      var np3 = v.players[(turnIdx + nI2) % v.players.length];
      var hs = g.horses ? (g.horses[np3.seat] || []) : [];
      var home3 = 0, sum3 = 0;
      for (var hI3 = 0; hI3 < hs.length; hI3++) { if (hs[hI3] === 58) home3++; sum3 += hs[hI3]; }
      var isTurn = np3.seat === g.turn && g.phase !== 'ngWin';
      h += '<div class="rrow"' + (isTurn ? ' style="outline:3px solid #FFC93D"' : '') + '>' + blobSVG(np3.color, np3.mood, 28) + '<span>' + esc(np3.name) + (isTurn ? ' <b>◀ đang đi</b>' : '') + '<br><span class="muted">🐴 về đích ' + home3 + '/4 · tiến độ ' + (g.progress ? (g.progress[np3.seat] || 0) : 0) + '</span><span class="progbar"><i style="width:' + Math.round(sum3 / 232 * 100) + '%;background:' + COLORS[np3.color] + '"></i></span></span></div>';
    }
    h += '</div><div class="ngmid">';
    h += nguaBoardHTML(v, g);
    h += '</div><div class="ngside"><h3>Diễn biến</h3>';
    if (g.log && g.log.length) for (var lI = 0; lI < g.log.length; lI++) h += '<div class="chatrow">🎲 ' + esc(g.log[lI]) + '</div>';
    else h += '<p class="muted">Chưa có diễn biến nào…</p>';
    h += '</div></div>';
    h += '<p class="center">Ô vàng là ô an toàn — ngựa đứng đó không bị đá. Thảy 6 được đi tiếp; 6 ba lần liên tiếp thì mất lượt!</p>';
  } else if (g.id === 'tien-len') {
    if (g.phase === 'tlWin' && g.winner) {
      var winT = playerOf(v, g.winner);
      h += '<div class="center baloo" style="font-size:30px">🏆 ' + esc(winT ? winT.name : '') + ' THẮNG TIẾN LÊN!</div>';
      if (g.instantWin) h += '<div class="center baloo" style="font-size:24px;color:#FFC93D">⚡ TỚI TRẮNG — ' + (TL_IW_NAMES[g.instantWin.kind] || '') + '!</div>';
      h += '<div class="rows">';
      for (var fI = 0; fI < (g.finished || []).length; fI++) { var fp9 = playerOf(v, g.finished[fI]); h += '<div class="rrow">' + blobSVG(fp9.color, fp9.mood, 32) + ' ' + esc(fp9.name) + '<span class="chip cool">Hạng ' + (fI + 1) + '</span><span class="pts">+' + fmt(g.points[fp9.seat] || 0) + '</span></div>'; }
      h += '</div>';
    } else if (g.phase === 'cards') {
      var turnT = g.turn ? playerOf(v, g.turn) : null;
      h += '<div class="center baloo" style="font-size:24px">Lượt của: ' + (turnT ? esc(turnT.name) : '') + (g.table ? ' · cần chặn bài trên bàn' : ' · đang cầm cái') + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="tltable">';
      if (g.table) {
        var tabP = playerOf(v, g.table.seat);
        h += '<div class="center baloo" style="font-size:19px">' + esc(tabP ? tabP.name : '') + ' vừa đánh · ' + (TL_KIND_NAMES[g.table.kind] || '') + '</div>';
        h += '<div class="tlchips">' + tlChipsHTML(g.table.cards, false) + '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:20px">🃏 Bàn trống — ' + (turnT ? esc(turnT.name) : '') + ' cầm cái, đánh bộ bất kỳ!</div>';
      }
      h += '</div>';
      h += '<div class="scorebar">';
      for (var pI9 = 0; pI9 < v.players.length; pI9++) {
        var pp9 = v.players[pI9];
        var fin9 = (g.finished || []).indexOf(pp9.seat);
        h += '<span class="scorechip"' + (g.turn === pp9.seat ? ' style="outline:3px solid #FFC93D"' : '') + '>' + blobSVG(pp9.color, pp9.mood, 28) + ' ' + esc(pp9.name)
          + ' · 🂠 × ' + (g.counts ? (g.counts[pp9.seat] || 0) : 0)
          + (g.leader === pp9.seat ? ' · <b>Cái</b>' : '')
          + (g.passed && g.passed[pp9.seat] ? ' · ✋ Bỏ' : '')
          + (fin9 >= 0 ? ' · 🏆 ' + (fin9 + 1) : '') + '</span>';
      }
      h += '</div>';
      if (g.log && g.log.length) { h += '<div style="margin-top:8px">'; for (var lI9 = 0; lI9 < g.log.length; lI9++) h += '<div class="chatrow">🃏 ' + esc(g.log[lI9]) + '</div>'; h += '</div>'; }
      h += '<p class="center">Chặt heo: tứ quý & đôi thông chặt được lá 2; đôi heo chỉ bị chặt bởi tứ quý và 4 đôi thông. Hết bài trước là thắng!</p>';
    }
  } else if (g.id === 'da-bong') {
    var sb = g.scoreboard || { do: 0, xanh: 0 };
    h += '<div class="scorebar"><span class="scorechip" style="background:#FBD5D5">🔴 Đội Đỏ: <b id="scoredo">' + sb.do + '</b></span><span class="scorechip" style="background:#CFE8FB">🔵 Đội Xanh: <b id="scorexanh">' + sb.xanh + '</b></span></div>';
    h += '<div class="afield wide" id="afield">';
    (g.solids || []).forEach(function (s) { h += '<div class="spitch' + (s.w > 20 ? '' : ' wall') + '" style="' + rectStyleS(s) + '"></div>'; });
    h += '<div class="sgoalbox" style="' + rectStyleS({ x: -19, y: 5.4, w: 3, h: 2.6 }) + '"></div>';
    h += '<div class="sgoalbox" style="' + rectStyleS({ x: 16, y: 5.4, w: 3, h: 2.6 }) + '"></div>';
    for (var sI = 0; sI < v.players.length; sI++) {
      var sp2 = v.players[sI]; var sb2 = g.blobs[sp2.seat];
      if (!sb2) continue;
      h += '<div class="ablob" id="ablob-' + sp2.seat + '" style="left:' + ((sb2.x + 19) / 38 * 100) + '%;top:' + ((sb2.y + 9.6) / 19.2 * 100) + '%">' + bigHeadSVG(sp2.color, sb2.team) + '<div class="aname">' + esc(sp2.name) + '</div></div>';
    }
    if (g.ball) h += '<div class="sball" id="sball" style="left:' + ((g.ball.x + 19) / 38 * 100) + '%;top:' + ((g.ball.y + 9.6) / 19.2 * 100) + '%"></div>';
    if (g.phase === 'goal' && g.goalInfo) {
      var gp8 = g.goalInfo.by ? playerOf(v, g.goalInfo.by) : null;
      h += '<div class="goalbanner">GÔÔÔL! ' + (g.goalInfo.team === 'do' ? '🔴' : '🔵') + '</div>';
      h += '<div class="center baloo" style="font-size:21px;position:relative;z-index:6">' + (gp8 ? esc(gp8.name) + (g.goalInfo.ownGoal ? ' đá phản lưới nhà! 😱' : ' ghi bàn!') : 'Vào rồi!') + '</div>';
    }
    h += '</div>';
    h += '<p class="center">Đội Đỏ (ghế lẻ) tấn công sang phải, Đội Xanh (ghế chẵn) sang trái. A = SÚT (giữ ▲ = bổng, ▼ = sệt) · B = lướt · ▲/Y = nhảy đánh đầu!</p>';
  } else if (g.id === 'ech-op') {
    h += '<div class="scorebar"><span class="scorechip">Màn <b id="frogcham">' + (g.chamber || 1) + '</b>/' + (g.chambersTotal || 3) + '</span><span class="scorechip">Tim đội: <b id="froghearts">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</b></span><span class="scorechip">🪰 Ruồi: <b id="frogflies">' + (g.fliesEaten || 0) + '</b>/' + (g.fliesTotal || 9) + '</span></div>';
    if (g.phase === 'frogClear') h += '<div class="center baloo" style="font-size:29px">🎉 QUA MÀN ' + (g.chamber || 1) + '! Chuẩn bị màn tiếp theo…</div>';
    h += '<div class="afield" id="afield">';
    (g.solids || []).forEach(function (s) { h += '<div class="tbrick" style="' + rectStyle(s) + '"></div>'; });
    (g.spikes || []).forEach(function (sp3) { h += '<div class="fspike" style="' + rectStyle(sp3) + '"></div>'; });
    if (g.door) h += '<div class="fdoor" style="' + rectStyle(g.door) + '"></div>';
    (g.flies || []).forEach(function (fl) { h += '<div class="ffly' + (fl.taken ? ' taken' : '') + '" id="ffly-' + fl.id + '" style="left:' + PX(fl.x) + '%;top:' + PY(fl.y) + '%"></div>'; });
    (g.crates || []).forEach(function (cr) { h += '<div class="fcrate" id="fcrate-' + cr.id + '" style="left:' + PX(cr.x) + '%;top:' + PY(cr.y) + '%"></div>'; });
    for (var fI2 = 0; fI2 < v.players.length; fI2++) {
      var fp3 = v.players[fI2]; var ff = g.frogs[fp3.seat];
      if (!ff) continue;
      var bellyP = ff.bellySeat ? playerOf(v, ff.bellySeat) : null;
      h += '<div class="afrog' + (ff.state === 'carry' ? ' carry' : '') + '" id="afrog-' + fp3.seat + '" data-st="' + ff.state + ':' + (ff.bellySeat || '') + '" style="left:' + PX(ff.x) + '%;top:' + PY(ff.y) + '%' + (ff.state === 'in' ? ';display:none' : '') + '">' + frogSVG(fp3.color, bellyP ? bellyP.color : null) + '<div class="aname">' + esc(fp3.name) + '</div></div>';
    }
    h += '</div>';
    h += '<p class="center">Đứng cạnh đồng đội rồi bấm B/X để NUỐT bạn vào bụng — ếch đang vác nhảy xa và cao hơn hẳn! Sang bờ an toàn thì bấm B/X lần nữa để nhả ra. Cả đội cùng đứng vào cửa xanh là qua màn.</p>';
  } else if (g.id === 'can-goc') {
    var turnP3 = g.turn ? playerOf(v, g.turn) : null;
    var windTxt = !g.wind ? 'không gió' : (g.wind > 0 ? '→ ' + g.wind : '← ' + (-g.wind));
    h += '<div class="scorebar"><span class="scorechip">Lượt: <b>' + (turnP3 ? esc(turnP3.name) : '—') + '</b></span><span class="scorechip">🌬️ Gió: <b>' + windTxt + '</b></span>';
    if (g.phase === 'aim' && turnP3 && g.cannons && g.cannons[g.turn]) h += '<span class="scorechip">Góc ' + g.cannons[g.turn].angle + '° · Lực ' + g.cannons[g.turn].power + '</span>';
    h += '</div>';
    if (g.phase === 'aim') h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    h += '<div class="afield art" id="afield"><div class="artwrap"><svg viewBox="0 0 320 180" preserveAspectRatio="none">';
    var pts = '0,180 ';
    for (var cI = 0; cI < (g.heights || []).length; cI++) { var hy = Math.round(((g.heights[cI] + 9) * 10) * 10) / 10; pts += (cI * 2) + ',' + hy + ' ' + ((cI + 1) * 2) + ',' + hy + ' '; }
    pts += '320,180';
    h += '<polygon points="' + pts + '" fill="#3E6B35" stroke="#7AC74F" stroke-width="1.6"/>';
    if (g.shell && g.shell.trail && g.shell.trail.length > 1) {
      var tp9 = '';
      for (var tI9 = 0; tI9 < g.shell.trail.length; tI9++) tp9 += Math.round((g.shell.trail[tI9].x + 16) * 10) + ',' + Math.round((g.shell.trail[tI9].y + 9) * 10) + ' ';
      h += '<polyline points="' + tp9 + '" fill="none" stroke="rgba(255,240,190,.75)" stroke-width="1.6" stroke-dasharray="3 3"/>';
    }
    for (var nI = 0; nI < v.players.length; nI++) {
      var np9 = v.players[nI]; var cn = g.cannons ? g.cannons[np9.seat] : null;
      if (!cn) continue;
      var cx9 = Math.round((cn.x + 16) * 10), cy9 = Math.round((cn.y + 9) * 10);
      var colr = COLORS[np9.color] || '#fff';
      if (!cn.alive) {
        h += '<g opacity=".55"><circle cx="' + cx9 + '" cy="' + (cy9 - 4) + '" r="6" fill="#5A6472"/><path d="M' + (cx9 - 4) + ' ' + (cy9 - 8) + ' l8 8 M' + (cx9 + 4) + ' ' + (cy9 - 8) + ' l-8 8" stroke="#FF8A7A" stroke-width="2"/></g>';
        continue;
      }
      var rad9 = cn.angle * Math.PI / 180;
      var bx9 = Math.round(cx9 + cn.face * Math.cos(rad9) * 15), by9 = Math.round((cy9 - 4) - Math.sin(rad9) * 15);
      if (g.turn === np9.seat && g.phase !== 'boom') h += '<circle cx="' + cx9 + '" cy="' + (cy9 - 4) + '" r="12" fill="none" stroke="#FFE066" stroke-width="2" stroke-dasharray="4 3"/>';
      h += '<line x1="' + cx9 + '" y1="' + (cy9 - 4) + '" x2="' + bx9 + '" y2="' + by9 + '" stroke="#2B3442" stroke-width="4.4" stroke-linecap="round"/>';
      h += '<circle cx="' + cx9 + '" cy="' + (cy9 - 4) + '" r="7" fill="' + colr + '" stroke="rgba(0,0,0,.4)" stroke-width="1.6"/>';
      h += '<rect x="' + (cx9 - 10) + '" y="' + (cy9 - 20) + '" width="20" height="3.6" fill="rgba(0,0,0,.45)"/><rect x="' + (cx9 - 10) + '" y="' + (cy9 - 20) + '" width="' + Math.round(20 * Math.max(0, cn.hp) / 100) + '" height="3.6" fill="' + (cn.hp > 40 ? '#58C472' : '#FF5A3C') + '"/>';
      h += '<text x="' + cx9 + '" y="' + (cy9 + 13) + '" font-size="8.5" font-weight="700" fill="#fff" text-anchor="middle" style="text-shadow:0 1px 2px #000">' + esc(np9.name) + '</text>';
    }
    h += '</svg></div>';
    if (g.shell) h += '<div class="ashell" id="shellpt" style="left:' + PX(g.shell.x) + '%;top:' + PY(g.shell.y) + '%"></div>';
    if (g.boom) h += '<div class="boomflash" style="left:' + PX(g.boom.x) + '%;top:' + PY(g.boom.y) + '%"></div>';
    h += '</div>';
    h += '<p class="center">Căn góc như Gunny: ▲▼ chỉnh góc · ◀▶ chỉnh lực · X đổi hướng · A bắn. Không có đường đạn mẫu đâu — gió còn đổi mỗi lượt nữa!</p>';
  }
  return h;
}
// Cờ Cá Ngựa board: geometry arrives in the view (g.board), so the
// renderer is a pure lookup — loop cells, home stretches, stables and
// one token per horse; horses sharing a cell fan out into corners.
function nguaBoardHTML(v, g) {
  var B = g.board; if (!B) return '';
  var CELL = 100 / 15;
  // token coordinates per horse
  var toks = [];
  for (var si = 0; si < v.players.length; si++) {
    var pl2 = v.players[si]; var bi = g.boards[pl2.seat]; var hs2 = g.horses[pl2.seat] || [];
    for (var hi = 0; hi < hs2.length; hi++) {
      var p2 = hs2[hi]; var xy = null;
      if (p2 === 0) xy = B.stable[bi][hi];
      else if (p2 <= 51) xy = B.loop[(bi * 13 + p2 - 1) % 52];
      else if (p2 <= 57) xy = B.stretch[bi][p2 - 52];
      else xy = [6 + (bi % 2) * 2, 6 + Math.floor(bi / 2) * 2];
      toks.push({ seat: pl2.seat, hi: hi, x: xy[0], y: xy[1], p: p2 });
    }
  }
  var groups = {};
  toks.forEach(function (tk) { var k = tk.x + ',' + tk.y; (groups[k] = groups[k] || []).push(tk); });
  var h = '<div class="ngboard">';
  var quadXY = [[0, 0], [9, 0], [9, 9], [0, 9]];
  for (var qi = 0; qi < v.players.length; qi++) {
    var qp = v.players[qi]; var qb = g.boards[qp.seat];
    h += '<div class="ngcell quad" style="left:' + (quadXY[qb][0] * CELL) + '%;top:' + (quadXY[qb][1] * CELL) + '%;width:' + (6 * CELL) + '%;height:' + (6 * CELL) + '%;background:' + LIGHT[qp.color] + '"></div>';
  }
  for (var ci = 0; ci < B.loop.length; ci++) {
    var c2 = B.loop[ci];
    var fill = '';
    if (B.safe.indexOf(ci) >= 0) fill = '';
    var startBoard = ci % 13 === 0 ? ci / 13 : -1;
    var st = 'left:' + (c2[0] * CELL) + '%;top:' + (c2[1] * CELL) + '%;width:' + CELL + '%;height:' + CELL + '%';
    if (startBoard >= 0) {
      var sp2 = null;
      for (var sj = 0; sj < v.players.length; sj++) if (g.boards[v.players[sj].seat] === startBoard) sp2 = v.players[sj];
      if (sp2) st += ';background:' + LIGHT[sp2.color];
    }
    h += '<div class="ngcell' + (B.safe.indexOf(ci) >= 0 ? ' safe' : '') + '" style="' + st + '"></div>';
  }
  for (var bi2 = 0; bi2 < B.stretch.length; bi2++) {
    var owner = null;
    for (var oj = 0; oj < v.players.length; oj++) if (g.boards[v.players[oj].seat] === bi2) owner = v.players[oj];
    if (!owner) continue;
    for (var sti = 0; sti < B.stretch[bi2].length; sti++) { var sc = B.stretch[bi2][sti]; h += '<div class="ngcell" style="left:' + (sc[0] * CELL) + '%;top:' + (sc[1] * CELL) + '%;width:' + CELL + '%;height:' + CELL + '%;background:' + LIGHT[owner.color] + '"></div>'; }
    for (var sbi = 0; sbi < B.stable[bi2].length; sbi++) { var sb = B.stable[bi2][sbi]; h += '<div class="ngstable" style="left:' + ((sb[0] + 0.15) * CELL) + '%;top:' + ((sb[1] + 0.15) * CELL) + '%;width:' + (0.7 * CELL) + '%;height:' + (0.7 * CELL) + '%;border-color:' + COLORS[owner.color] + '"></div>'; }
  }
  toks.forEach(function (tk) {
    var owner2 = playerOf(v, tk.seat);
    var grp = groups[tk.x + ',' + tk.y];
    var idx = grp.indexOf(tk);
    var many = grp.length > 1;
    var size = many ? 0.52 : 0.8;
    var ox = many ? (idx % 2) * 0.48 : 0.1;
    var oy = many ? Math.floor(idx / 2) * 0.48 : 0.1;
    h += '<div class="nghorse' + (g.turn === tk.seat && g.phase !== 'ngWin' ? ' turn' : '') + '" style="left:' + ((tk.x + ox) * CELL) + '%;top:' + ((tk.y + oy) * CELL) + '%;width:' + (size * CELL) + '%;height:' + (size * CELL) + '%;background:' + COLORS[owner2.color] + ';font-size:' + (many ? 11 : 14) + 'px">' + (tk.hi + 1) + '</div>';
  });
  return h + '</div>';
}
function resultsHTML(v, isHost) {
  var lg = v.lastGame;
  var h = '<div class="card center"><h2 style="margin:0">Kết quả game: ' + esc(lg.name) + '</h2></div>';
  if (lg.teamResult) {
    h += '<div class="teambanner">🏆 Cả đội đạt hạng ' + esc(lg.teamResult.tierLabel) + ' — mỗi người +' + fmt(lg.teamResult.pointsEach) + ' điểm!<br><span style="font-size:17px">Thành tích đội: ' + fmt(lg.teamResult.score) + ' ' + esc(lg.teamResult.unit) + '</span></div>';
  }
  h += scoreStrip(v);
  var seats = Object.keys(lg.points).map(function (k) { return +k; }).sort(function (a, b) { return (lg.points[b] - lg.points[a]) || (a - b); });
  h += '<div class="card rows" style="margin-top:10px">';
  for (var i = 0; i < seats.length; i++) { var p = playerOf(v, seats[i]); h += '<div class="rrow">' + blobSVG(p.color, p.mood, 38) + ' ' + esc(p.name) + '<span class="pts">' + fmt(lg.points[seats[i]]) + ' điểm game này</span></div>'; }
  h += '</div>';
  var plv = v.playlist;
  if (plv && plv.active && plv.nextName && plv.nextInSec != null) {
    h += '<div class="card center" style="margin-top:10px"><div class="baloo" style="font-size:22px">🔁 Game tiếp theo: ' + esc(plv.nextName) + '</div>';
    h += '<p style="margin:4px 0">Tự bắt đầu sau <b>' + plv.nextInSec + '</b> giây · Game ' + plv.pos + '/' + plv.total + ' trong liên hoàn</p>';
    if (isHost) h += '<p style="margin:6px 0 0"><button class="btn pink" data-cmd="plStop">⏸ Dừng liên hoàn</button></p><p class="small muted" style="margin:6px 0 0">Bấm Chơi lại hoặc Chọn game khác cũng sẽ huỷ chế độ liên hoàn.</p>';
    h += '</div>';
  }
  if (isHost) h += '<p class="center" style="margin-top:16px"><button class="btn green" data-cmd="replay">Chơi lại ngay</button> <button class="btn blue" data-cmd="toChoosing">Chọn game khác</button> <button class="btn purple" data-cmd="continue">Bục vinh quang</button></p>';
  else if (!(plv && plv.active && plv.nextName)) h += '<p class="center muted">Ván này xong rồi! Chủ phòng sẽ chọn game tiếp theo, cứ ở yên trong phòng nhé.</p>';
  return h;
}
function podiumHTML(v, isHost) {
  var h = '<div class="card center"><h2 style="margin:0">Bục vinh quang</h2>' + scoreStrip(v);
  var top = v.standings.slice(0, 3);
  var order = top.length >= 2 ? [top[1], top[0], top[2]] : top;
  var heights = {}; if (top[0]) heights[top[0]] = 150; if (top[1]) heights[top[1]] = 105; if (top[2]) heights[top[2]] = 78;
  h += '<div class="podium">';
  for (var i = 0; i < order.length; i++) {
    if (!order[i]) continue;
    var p = playerOf(v, order[i]); var rank = v.standings.indexOf(order[i]) + 1;
    h += '<div class="pod">' + (rank === 1 ? '<span class="crownglow">' + crownSVG(64) + '</span><br>' : '') + '<span class="blobbob">' + blobSVG(p.color, 'reo', 86) + '</span><div class="baloo" style="font-size:19px">' + esc(p.name) + '</div><div class="col" style="height:' + heights[order[i]] + 'px;background:' + COLORS[p.color] + '">' + rank + '</div><div class="muted">' + fmt(p.score) + ' điểm</div></div>';
  }
  h += '</div>';
  h += '<div class="rows">';
  for (var j = 0; j < v.standings.length; j++) { var q = playerOf(v, v.standings[j]); h += '<div class="rrow"><b>' + (j + 1) + '</b>' + blobSVG(q.color, q.mood, 32) + ' ' + esc(q.name) + '<span class="pts">' + fmt(q.score) + '</span></div>'; }
  h += '</div>';
  if (isHost) h += '<p class="center" style="margin-top:14px"><button class="btn green" data-cmd="replay">Chơi lại game này</button> <button class="btn blue" data-cmd="toChoosing">Chọn game khác</button> <button class="btn pink" data-cmd="finish">Kết thúc</button></p>';
  else h += '<p class="center muted">Đợi màn hình lớn…</p>';
  return h + '</div>';
}
function finalHTML(v, isHost) {
  var champ = playerOf(v, v.standings[0]);
  var h = '<div class="card center"><div class="crownglow">' + crownSVG(90) + '</div><span class="blobbob">' + blobSVG(champ.color, 'reo', 130) + '</span>';
  h += '<h2 style="margin:6px 0">NHÀ VÔ ĐỊCH: ' + esc(champ.name) + '</h2><div class="baloo" style="font-size:24px">' + fmt(champ.score) + ' điểm</div>';
  h += '<div class="rows" style="text-align:left">';
  for (var i = 0; i < v.standings.length; i++) { var p = playerOf(v, v.standings[i]); h += '<div class="rrow"><b>' + (i + 1) + '</b>' + blobSVG(p.color, p.mood, 32) + ' ' + esc(p.name) + '<span class="pts">' + fmt(p.score) + '</span></div>'; }
  h += '</div>';
  if (isHost) h += '<p style="margin-top:14px"><button class="btn green" data-cmd="playAgain">Chơi lại từ đầu</button></p>';
  return h + '</div>';
}
function viewSig(v) {
  if (!v) return 'none';
  var pl = S.role === 'player';
  var g = v.game;
  var gp = null;
  if (g) {
    if (g.id === 'day-ra') {
      var ak = '';
      if (g.blobs) for (var bs in g.blobs) ak += bs + (g.blobs[bs].alive ? '1' : '0');
      gp = [g.id, g.phase, ak, g.lastRound];
    } else if (g.id === 'ne-dan') {
      var ak2 = '';
      if (g.blobs) for (var bs2 in g.blobs) ak2 += bs2 + (g.blobs[bs2].alive ? '1' : '0') + g.blobs[bs2].lives;
      gp = [g.id, g.phase, ak2, g.lastRound];
    } else if (g.id === 'keo-co') {
      gp = pl ? [g.id, g.phase, Math.round((g.knot || 0) / 9), g.lastRound] : [g.id, g.phase, g.lastRound];
    } else if (g.id === 'chia-cuop') {
      gp = [g.id, g.phase, g.round, g.points, g.chosen, g.chat, g.reveal, g.mineChosen, g.lastRound];
    } else if (g.id === 'cuop-sao') {
      gp = pl ? [g.id, g.phase, g.banked ? g.banked[S.seat] : 0, g.lastRound] : [g.id, g.phase, g.lastRound];
    } else if (g.id === 'giu-vuong-mien') {
      gp = [g.id, g.phase, g.crown ? g.crown.holder : '-', g.lastRound];
    } else if (g.id === 'son-san') {
      gp = [g.id, g.phase, g.lastRound];
    } else if (g.id === 'chung-mot-than') {
      gp = [g.id, g.phase, g.hearts, g.checks, g.owners, g.lastRound];
    } else if (g.id === 'day-hop') {
      gp = [g.id, g.phase, g.deliveries, g.layout, g.lastRound];
    } else if (g.id === 'cheo-thuyen') {
      gp = [g.id, g.phase, g.lastRound];
    } else if (g.id === 'xe-tank') {
      var tk = '';
      if (g.blobs) for (var ts in g.blobs) tk += ts + (g.blobs[ts].alive ? '1' : '0') + g.blobs[ts].lives;
      gp = [g.id, g.phase, tk, g.lastRound];
    } else if (g.id === 'dat-bom') {
      var bk = '';
      if (g.blobs) for (var bs3 in g.blobs) bk += bs3 + (g.blobs[bs3].alive ? '1' : '0') + g.blobs[bs3].lives;
      gp = [g.id, g.phase, bk, g.lastRound];
    } else if (g.id === 'thu-thanh') {
      gp = [g.id, g.phase, g.crystal ? g.crystal.hp : 0, g.kills, g.lastRound];
    } else if (g.id === 'ke-gia-mao') {
      gp = [g.id, g.phase, g.round, g.points, g.answered, g.voted, g.chatLog, g.reveal, g.mine, g.myVote, g.lastRound];
    } else if (g.id === 'giai-ma-chung') {
      gp = pl ? [g.id, g.phase, g.level, g.hearts, g.done, g.mySteps, g.levelsDone, g.lastRound]
        : [g.id, g.phase, g.level, g.hearts, g.done, g.total, g.levelsDone, g.lastRound];
    } else if (g.id === 'nguoi-que') {
      var fk = '';
      if (g.blobs) for (var fs in g.blobs) fk += fs + (g.blobs[fs].alive ? '1' : '0') + g.blobs[fs].lives;
      gp = pl ? [g.id, g.phase, fk, g.myDmg, g.lastRound] : [g.id, g.phase, fk, g.lastRound];
    } else if (g.id === 'den-lua-nuoc') {
      gp = pl ? [g.id, g.phase, g.hearts, g.gemCount, g.myEl, g.myHome, g.lastRound]
        : [g.id, g.phase, g.hearts, g.gemCount, g.gateOpen, g.lastRound];
    } else if (g.id === 'ma-soi') {
      gp = pl ? [g.id, g.phase, g.night, g.aliveMap, g.deadList, g.myRole, g.myAlive, g.myWolfVote, g.wolfVotesIn, g.myGuardPick, g.mySeerPick, g.mySeerNotes, g.myVictim, g.myWitchSave, g.myWitchPoison, g.myWitchDone, g.voted, g.chatLog, g.exec, g.winner, g.points, g.lastRound]
        : [g.id, g.phase, g.night, g.aliveMap, g.deadList, g.dawnDeaths, g.voted, g.chatLog, g.exec, g.voteTally, g.winner, g.roles, g.points, g.lastRound];
    } else if (g.id === 'ca-ngua') {
      gp = pl ? [g.id, g.phase, g.turn, g.dice, g.horses, g.last, g.winner, g.myLegal, g.myTurn]
        : [g.id, g.phase, g.turn, g.dice, g.horses, g.last, g.winner, g.log];
    } else if (g.id === 'tien-len') {
      gp = pl ? [g.id, g.phase, g.counts, g.table, g.turn, g.leader, g.passed, g.finished, g.log, g.myHand, g.myTurn, g.myPassed, g.myRank, g.lastRound]
        : [g.id, g.phase, g.counts, g.table, g.turn, g.leader, g.passed, g.finished, g.log, g.winner, g.instantWin, g.lastRound];
    } else if (g.id === 'da-bong') {
      gp = pl ? [g.id, g.phase, g.scoreboard, g.myTeam, g.lastRound]
        : [g.id, g.phase, g.scoreboard, g.goalInfo, g.lastRound];
    } else if (g.id === 'ech-op') {
      gp = pl ? [g.id, g.phase, g.chamber, g.hearts, g.fliesEaten, g.myState, g.myPassengerSeat, g.myCarrierSeat, g.myDoor, g.lastRound]
        : [g.id, g.phase, g.chamber, g.hearts, g.fliesEaten, g.lastRound];
    } else if (g.id === 'can-goc') {
      var ck = '';
      if (g.cannons) for (var cs in g.cannons) { var cc9 = g.cannons[cs]; ck += cs + ':' + cc9.hp + (cc9.alive ? 1 : 0) + ':' + cc9.angle + ':' + cc9.power + ':' + cc9.face + ';'; }
      gp = pl ? [g.id, g.phase, g.turn, g.wind, g.myTurn, g.myCannon, ck, g.boom, g.lastRound]
        : [g.id, g.phase, g.turn, g.wind, ck, g.shell ? 's' : '', g.boom, g.lastRound];
    } else {
      if (pl) {
      // PLAYER signature for the tap/answer games: keep only what the
      // phone actually renders and what changes on real game events.
      // Dropped vs the host signature: g.answered / g.statuses, which
      // track the OTHER players and are never drawn on the phone.
      // Rebuilding the controls mid-press is what ate real finger
      // presses; the host signature is unchanged.
      gp = [g.id, g.phase, g.round, g.points, g.lastRound, g.reveal, g.status, g.mine, g.myStreak];
    } else {
      gp = [g.id, g.phase, g.round, g.points, g.lastRound, g.reveal, g.status, g.answered, g.statuses, g.mine];
    }
    }
  }
  var pls = v.playlist ? [v.playlist.active ? 1 : 0, v.playlist.pos || 0, v.playlist.total || 0, v.playlist.nextName || '', v.playlist.nextInSec] : 0;
  return JSON.stringify([v.phase, v.players, v.bubble, v.standings, v.gap, gp, v.lastGame, pls]);
}
var FIELD_GAMES = { 'day-ra': 1, 'ne-dan': 1, 'cuop-sao': 1, 'giu-vuong-mien': 1, 'son-san': 1, 'xe-tank': 1, 'dat-bom': 1, 'thu-thanh': 1, 'chung-mot-than': 1, 'day-hop': 1, 'nguoi-que': 1, 'den-lua-nuoc': 1, 'ech-op': 1, 'da-bong': 1, 'can-goc': 1 };
// The phone's control cluster for the current screen, as a key: the
// cluster's CONTENT is a pure function of this key, so while the key is
// unchanged a state push may rebuild everything AROUND the controls
// but must never rebuild the controls themselves — a rebuilt DiscPad
// or button detaches the very node a finger is holding, and the held
// direction dies mid-press (the "bấm không ăn / giữ hướng bị rơi"
// complaint). render() transplants the live cluster nodes into the
// fresh markup instead (see clusterNodes).
function playerCtrlKey(v) {
  var g = v.game; if (!g) return '';
  var myB = g.blobs ? g.blobs[S.seat] : null;
  var ko = myB && !myB.alive ? '|ko' : '';
  switch (g.id) {
    case 'day-ra': case 'ne-dan': case 'xe-tank': case 'dat-bom': case 'thu-thanh': case 'nguoi-que':
      return g.id + '|' + g.phase + ko;
    case 'ech-op':
      return g.id + '|' + g.phase + '|' + (g.myState || '');
    case 'can-goc': {
      var mc = g.myCannon;
      return g.id + '|' + g.phase + '|' + (!mc || !mc.alive ? 'ko' : g.myTurn ? 'aim' : 'wait');
    }
    case 'cao-boi':
      return g.id + '|' + g.phase + '|' + (g.mine || '');
    case 'do-vui':
      return g.id + '|' + g.phase + '|' + g.round + '|' + (g.mine == null ? 'ans' : 'done');
    case 'chia-cuop': {
      var inP = g.pair && g.pair.indexOf(S.seat) >= 0;
      return g.id + '|' + g.phase + '|' + (inP ? 'in' : 'out') + '|' + (g.mineChosen ? 'chosen' : '');
    }
    case 'ke-gia-mao':
      return g.id + '|' + g.phase + '|' + g.round + '|' + (g.mine == null ? 'a0' : 'a1') + '|' + (g.myVote == null ? 'v0' : 'v1');
    case 'ma-soi': {
      var k = g.id + '|' + g.phase + '|' + (g.myRole || '') + '|' + (g.myAlive ? 'alive' : 'dead');
      if (g.phase === 'night') k += '|' + (g.myWolfVote == null ? 0 : 1) + (g.myGuardPick == null ? 0 : 1) + (g.mySeerPick == null ? 0 : 1) + '|' + (g.myWitchDone ? 'wd' : '') + (g.wolvesIn ? 'wi' : '') + '|' + (g.myWitchSave ? 'ws' : '') + '|' + (g.myWitchPoison || '');
      if (g.phase === 'vote') k += '|' + (g.voted && g.voted[S.seat] ? 'voted' : '');
      return k;
    }
    case 'ca-ngua':
      return g.id + '|' + g.phase + '|' + (g.myTurn ? 'my' : 'other') + '|' + (g.dice || 0) + '|' + (g.myLegal || []).map(function (e) { return e.horse; }).join(',');
  }
  return g.id + '|' + g.phase;
}
function clusterNodes(root) {
  var out = [];
  var pw = root.querySelector('.padwrap'); if (pw) out.push(pw);
  var tb = root.querySelector('.tapbtn'); if (tb) out.push(tb);
  var og = root.querySelector('.optgrid'); if (og) out.push(og);
  var sg = root.querySelector('.symgrid'); if (sg) out.push(sg);
  var ct = root.querySelector('#chatText'); if (ct && ct.parentElement) out.push(ct.parentElement);
  var chs = root.querySelectorAll('[data-cmd="choose"]');
  for (var i = 0; i < chs.length; i++) { var pp = chs[i].parentElement; if (pp && out.indexOf(pp) < 0) out.push(pp); }
  var rl = root.querySelector('[data-cmd="roll"]'); if (rl && rl.parentElement && out.indexOf(rl.parentElement) < 0) out.push(rl.parentElement);
  return out;
}
function render() {
  var app = el('app');
  // Local keyboard panels live outside #app and must repaint even when
  // the main view signature is unchanged (peek/cursor state), and clear
  // themselves when the host leaves a game — so they run on EVERY
  // render() invocation, before any early return below.
  renderLocalPanels();
  // The my-seat section (phone mode) lives inside #app but, exactly
  // like the local panels, must repaint on its own signature — the
  // host's private view can change (a dealt hand, a witch toggle)
  // while the public stage signature stands still.
  renderMySeat();
  if (!S.role) { if (app.classList) { app.classList.remove('playhud'); app.classList.remove('perf'); } if (S.sig !== 'home') { S.sig = 'home'; S.ctrlKey = ''; app.innerHTML = homeHTML(); fillHomeDefaults(); } return; }
  var v = S.view;
  if (!v) { app.innerHTML = '<div class="card center"><h2>Đang nối phòng…</h2><p class="muted">Nếu chờ lâu vẫn không vào được, phòng có thể đã đóng hoặc hết hạn.</p><p><button class="btn ghost" data-cmd="reload">Về trang chính</button></p></div>'; return; }
  if (app.classList) app.classList.toggle('playhud', !!(S.role === 'host' && v.phase === 'playing' && v.game && FIELD_GAMES[v.game.id]));
  if (app.classList) app.classList.toggle('perf', !!(v.phase === 'playing' && v.game && FIELD_GAMES[v.game.id]));
  var sig = viewSig(v);
  if (sig === S.sig) return;
  var transplant = null;
  if (S.role === 'player' && v.phase === 'playing' && v.game) {
    var key = playerCtrlKey(v);
    if (S.ctrlKey === key) transplant = clusterNodes(document);
    S.ctrlKey = key;
  } else S.ctrlKey = '';
  S.sig = sig;
  app.innerHTML = S.role === 'host' ? hostHTML(v) : playerHTML(v);
  if (transplant && transplant.length) {
    var fresh = clusterNodes(app);
    if (fresh.length === transplant.length) {
      var activeEl = document.activeElement;
      var caret = activeEl && activeEl.id === 'chatText' ? activeEl.selectionStart : -1;
      for (var ti = 0; ti < fresh.length; ti++) fresh[ti].parentNode.replaceChild(transplant[ti], fresh[ti]);
      if (activeEl && activeEl.id === 'chatText' && document.activeElement !== activeEl) {
        activeEl.focus();
        try { activeEl.setSelectionRange(caret, caret); } catch (e) {}
      }
    }
  }
  afterRender(v);
}
function checkRoundWin(v) {
  var lr = v.game.lastRound; if (!lr) return;
  var key = v.game.id + ':' + lr.round + ':' + v.game.phase;
  if (S.fxRound === key) return;
  S.fxRound = key;
  var myPts = null; var max = -1; var k;
  if (lr.points) { for (k in lr.points) { if (lr.points[k] > max) max = lr.points[k]; } myPts = lr.points[S.seat]; }
  else if (lr.entries) { for (var i = 0; i < lr.entries.length; i++) { if (lr.entries[i].points > max) max = lr.entries[i].points; if (lr.entries[i].seat === S.seat) myPts = lr.entries[i].points; } }
  if (myPts != null && myPts > 0 && myPts === max) vibrate([70, 50, 70]);
}
function afterRender(v) {
  if (v.phase === 'results' && v.lastGame) {
    var k = 'r' + v.lastGame.at;
    if (S.fxConfetti !== k) { S.fxConfetti = k; confetti(1); sfxWin(); }
  }
  if (v.phase === 'podium' || v.phase === 'final') {
    var k2 = 'p' + (v.lastGame ? v.lastGame.at : 0) + v.phase;
    if (S.fxConfetti !== k2) { S.fxConfetti = k2; confetti(3); sfxWin(); }
  }
  if (S.role === 'player' && v.game) {
    if (v.game.id === 'do-vui' && v.game.phase === 'reveal' && v.game.reveal) {
      var key = 'q' + v.game.round + ':' + v.game.round;
      if (S.fxReveal !== key) {
        S.fxReveal = key;
        if (v.game.mine != null && v.game.mine === v.game.reveal.correct) { sfxCorrect(); vibrate(80); }
        else sfxWrong();
      }
    }
    checkRoundWin(v);
  }
  if (S.role === 'player' && v.phase === 'results' && v.lastGame) {
    var mine = v.lastGame.points[S.seat] || 0; var max = 0; var kk;
    for (kk in v.lastGame.points) if (v.lastGame.points[kk] > max) max = v.lastGame.points[kk];
    var key3 = 'w' + v.lastGame.at;
    if (S.fxRound !== key3) { S.fxRound = key3; if (mine > 0 && mine === max) { sfxWin(); vibrate([70, 50, 70]); } }
  }
  // The full render above rebuilt the field DOM from scratch: arena
  // pieces were created at their CSS default position (centre). Patch
  // them onto the current view NOW, in the same task, so the browser
  // never paints the centred frame (the life-loss centre-flash).
  patchPositions(v);
}
function countUp(row) {
  var out = row.querySelector('.gv'); if (!out) return;
  var gd = row.querySelector('.gd'); if (gd) gd.textContent = row.getAttribute('data-difftext') || '';
  var target = row.getAttribute('data-value');
  if (target === '' || target === null) { out.textContent = '—'; return; }
  var val = +target; var t0 = Date.now();
  var iv = setInterval(function () {
    var p = Math.min(1, (Date.now() - t0) / 600);
    out.textContent = fmt(val * p);
    if (p >= 1) clearInterval(iv);
  }, 40);
}
// Decorative effects are MUTED while a game is playing (user's
// order: strip every excess effect for smoothness). Spark bursts,
// ghosts, trails, warning pings, screen shakes and the slow-mo
// class all create DOM nodes and force style/layout work in the
// middle of play; the essential feedback that remains is the hit
// flash on the blob itself and the K.O. banner (plain class/text
// changes, no new nodes).
function fxMuted() { return !!(S.view && S.view.phase === 'playing'); }
function fxSparks(field, x, y, colorHex, n, fam) {
  if (fxMuted()) return;
  var fp = famPct(fam || 'std', x, y);
  for (var i = 0; i < n; i++) {
    var s = document.createElement('span');
    s.className = 'fx-spark';
    s.style.left = fp[0] + '%';
    s.style.top = fp[1] + '%';
    s.style.background = colorHex; s.style.color = colorHex;
    field.appendChild(s);
    var ang = Math.random() * Math.PI * 2; var dist = 22 + Math.random() * 48;
    var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    (function (node, mx, my) {
      requestAnimationFrame(function () {
        node.style.transform = 'translate(' + mx + 'px,' + my + 'px) scale(.3)';
        node.style.opacity = '0';
      });
      setTimeout(function () { node.remove(); }, 680);
    })(s, dx, dy);
  }
}
function fxGhost(field, pos, colorName) {
  if (fxMuted()) return;
  var s = document.createElement('span');
  s.className = 'fx-ghost';
  s.style.left = PX(pos.x) + '%';
  s.style.top = PY(pos.y) + '%';
  s.innerHTML = orbSVG(colorName, 40);
  field.appendChild(s);
  requestAnimationFrame(function () { s.style.opacity = '0'; });
  setTimeout(function () { s.remove(); }, 540);
}
function fxTrail(field, ball) {
  if (fxMuted()) return;
  var s = document.createElement('span');
  s.className = 'fx-trail';
  s.style.left = PX(ball.x) + '%';
  s.style.top = PY(ball.y) + '%';
  field.appendChild(s);
  setTimeout(function () { s.remove(); }, 320);
}
function fxWarn(field, ball) {
  if (fxMuted()) return;
  var cx = Math.max(-15, Math.min(15, ball.x)), cy = Math.max(-8.5, Math.min(8.5, ball.y));
  var s = document.createElement('span');
  s.className = 'awarn';
  s.style.left = PX(cx) + '%';
  s.style.top = PY(cy) + '%';
  field.appendChild(s);
  setTimeout(function () { s.remove(); }, 580);
}
function fxKO(name) {
  var b = el('kobanner'); if (!b) return;
  var sub = el('kosub'); if (sub) sub.textContent = name + ' bị loại!';
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  if (S._koT) clearTimeout(S._koT);
  S._koT = setTimeout(function () { b.classList.remove('show'); }, 1600);
}
function fxShake(field, big) {
  if (fxMuted()) return;
  var cls = big ? 'shake-big' : 'shake';
  field.classList.remove('shake'); field.classList.remove('shake-big');
  requestAnimationFrame(function () { field.classList.add(cls); });
  setTimeout(function () { field.classList.remove(cls); }, big ? 480 : 330);
}
function fxSlowmo(field) {
  if (fxMuted()) return;
  field.classList.add('slowmo');
  if (S._smT) clearTimeout(S._smT);
  S._smT = setTimeout(function () { field.classList.remove('slowmo'); }, 620);
}
function fxFlash(seat) {
  var node = el('ablob-' + seat); if (!node) return;
  node.classList.remove('hitflash');
  requestAnimationFrame(function () { node.classList.add('hitflash'); });
  setTimeout(function () { node.classList.remove('hitflash'); }, 240);
}
function arenaFX(v, g) {
  var field = el('afield');
  var key = g.id + '|' + g.round + '|' + g.phase;
  if (!S.fxP || S.fxP.key !== key) {
    S.fxP = { key: key, blobs: {}, ballN: -1, nearCd: 0, trailAt: 0 };
    for (var s0 in g.blobs) S.fxP.blobs[s0] = { x: g.blobs[s0].x, y: g.blobs[s0].y, lives: g.blobs[s0].lives, alive: g.blobs[s0].alive };
    if (g.balls) S.fxP.ballN = g.balls.length;
    return;
  }
  var P = S.fxP;
  var lostLife = {};
  for (var seat in g.blobs) {
    var cur = g.blobs[seat]; var prev = P.blobs[seat];
    var pl = playerOf(v, +seat);
    var colName = pl ? pl.color : 'blue'; var colHex = COLORS[colName] || COLORS.blue;
    if (prev && prev.alive && !cur.alive) {
      if (field) { fxKO(pl ? pl.name : ''); fxShake(field, true); fxSlowmo(field); fxSparks(field, cur.x, cur.y, colHex, 16); }
      sfxBoom(); if (+seat === S.seat) vibrate([90, 40, 90]);
    } else if (prev && cur.alive && cur.lives < prev.lives) {
      lostLife[seat] = true;
      fxFlash(seat);
      if (field) { fxShake(field, false); fxSparks(field, cur.x, cur.y, colHex, 7); }
      sfxThud(); if (+seat === S.seat) vibrate(120);
    } else if (prev && cur.alive && prev.alive && field) {
      var moved = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      if (moved > 1.4) {
        fxGhost(field, prev, colName);
        fxGhost(field, { x: (cur.x + prev.x) / 2, y: (cur.y + prev.y) / 2 }, colName);
        sfxDash();
      }
    }
    P.blobs[seat] = { x: cur.x, y: cur.y, lives: cur.lives, alive: cur.alive };
  }
  // Pickup bursts, same snapshot pattern: a banked star (Cướp Sao), a
  // crown changing hands (Giữ Vương Miện) and a temple gem being taken
  // each pop a small spark burst in the game's own colour.
  if (g.id === 'cuop-sao' && g.banked && g.blobs) {
    if (!P.banked) { P.banked = {}; for (var bk0 in g.banked) P.banked[bk0] = g.banked[bk0]; }
    for (var bkS in g.banked) {
      if (P.banked[bkS] != null && g.banked[bkS] > P.banked[bkS] && field && g.blobs[bkS]) {
        fxSparks(field, g.blobs[bkS].x, g.blobs[bkS].y, '#FFD93D', 8);
        beep(1180, 0.07, 'sine', 0.1);
      }
      P.banked[bkS] = g.banked[bkS];
    }
  }
  if (g.id === 'giu-vuong-mien' && g.crown && g.blobs) {
    var holderNow = g.crown.holder || 0;
    if (P.holder === undefined) P.holder = holderNow;
    else if (holderNow && holderNow !== P.holder && field && g.blobs[holderNow]) {
      fxSparks(field, g.blobs[holderNow].x, g.blobs[holderNow].y, '#FFC93D', 10);
      beep(880, 0.08, 'triangle', 0.11);
    }
    P.holder = holderNow;
  }
  if (g.id === 'den-lua-nuoc' && g.gems) {
    if (!P.gems) { P.gems = {}; for (var gm0 = 0; gm0 < g.gems.length; gm0++) P.gems[g.gems[gm0].id] = g.gems[gm0].taken; }
    for (var gmI = 0; gmI < g.gems.length; gmI++) {
      var gmNow = g.gems[gmI];
      if (P.gems[gmNow.id] === false && gmNow.taken && field) {
        fxSparks(field, gmNow.x, gmNow.y, gmNow.el === 'lua' ? '#FF7A4D' : '#4FC3F7', 9);
        beep(990, 0.07, 'sine', 0.1);
      }
      P.gems[gmNow.id] = gmNow.taken;
    }
  }
  if (g.id === 'da-bong' && g.scoreboard) {
    var totNow = (g.scoreboard.do || 0) + (g.scoreboard.xanh || 0);
    if (P.goals === undefined) P.goals = totNow;
    else if (totNow > P.goals) {
      if (field) {
        fxShake(field, true);
        var gx9 = g.goalInfo && g.goalInfo.team === 'do' ? 17.5 : -17.5;
        fxSparks(field, gx9, 6.7, '#FFE066', 18, 'soc');
      }
      sfxWin();
      P.goals = totNow;
    }
  }
  if (g.id === 'ech-op' && typeof g.fliesEaten === 'number') {
    if (P.flies === undefined) P.flies = g.fliesEaten;
    else if (g.fliesEaten > P.flies) { beep(1180, 0.07, 'sine', 0.1); P.flies = g.fliesEaten; }
  }
  if (g.id === 'can-goc') {
    var boomAt = g.boom ? g.boom.at : 0;
    if (P.boomAt === undefined) P.boomAt = boomAt;
    else if (boomAt && boomAt !== P.boomAt) {
      if (field) { fxShake(field, true); fxSparks(field, g.boom.x, g.boom.y, '#FFB35C', 14); }
      sfxBoom();
      P.boomAt = boomAt;
    }
  }
  var ring = el('aring');
  if (ring && g.id === 'day-ra' && g.arenaR) ring.classList.toggle('danger', g.arenaR <= 5.5);
  if (g.id === 'ne-dan' && g.balls) {
    if (P.ballN >= 0 && g.balls.length > P.ballN && field) {
      for (var bi = P.ballN; bi < g.balls.length; bi++) fxWarn(field, g.balls[bi]);
    }
    var nowMs = Date.now();
    if (field && nowMs - P.trailAt > 210 && g.balls.length <= 14) {
      P.trailAt = nowMs;
      for (var ti = 0; ti < g.balls.length; ti++) fxTrail(field, g.balls[ti]);
    }
    if (nowMs > P.nearCd) {
      var near = false;
      for (var ni = 0; ni < g.balls.length && !near; ni++) {
        for (var ns in g.blobs) {
          var bb2 = g.blobs[ns]; if (!bb2.alive || lostLife[ns]) continue;
          var dd = Math.hypot(g.balls[ni].x - bb2.x, g.balls[ni].y - bb2.y);
          if (dd > 1.5 && dd < 3.0) { near = true; break; }
        }
      }
      if (near) {
        P.nearCd = nowMs + 900;
        sfxWhoosh();
      }
    }
    P.ballN = g.balls.length;
  }
}
// Create/move/remove the transient field entities (shells, slimes)
// whose DOM nodes cannot be rendered once by hostStage: they are keyed
// by server id inside #afield and pruned when the server drops them.
// Coordinate families: 'std' games simulate in a 32x18 space
// (x in [-16,16], y in [-9,9]); soccer ('soc') in 38x19.2.
function PX(x) { return (x + 16) / 32 * 100; }
function PY(y) { return (y + 9) / 18 * 100; }
function PSX(x) { return (x + 19) / 38 * 100; }
function PSY(y) { return (y + 9.6) / 19.2 * 100; }
function famPct(fam, x, y) { return fam === 'soc' ? [PSX(x), PSY(y)] : [PX(x), PY(y)]; }
function syncDyn(items, prefix, cls, decorate) {
  var field = el('afield');
  if (!field) return;
  var seen = {};
  for (var i = 0; i < items.length; i++) {
    var it = items[i]; var id = prefix + it.id; seen[id] = 1;
    var n = el(id);
    if (!n) {
      n = document.createElement('div');
      n.id = id; n.className = cls;
      if (decorate) decorate(n, it);
      n.classList.add('pop');
      field.appendChild(n);
    }
    moveEl(n, it.x, it.y, 'std', it.vx, it.vy);
  }
  var olds = field.querySelectorAll('.' + cls);
  for (var j = 0; j < olds.length; j++) if (!seen[olds[j].id]) olds[j].remove();
}
// Index-keyed variant for the dodge/shared balls (no server id): nodes
// are nball-<index>, created/pruned as the ball count changes, so the
// host stage never rebuilds when a ball spawns.
function syncDynIdx(items, prefix, cls) {
  var field = el('afield');
  if (!field) return;
  for (var i = 0; i < items.length; i++) {
    var id = prefix + i;
    var n = el(id);
    if (!n) {
      n = document.createElement('div');
      n.id = id; n.className = cls;
      n.classList.add('pop');
      field.appendChild(n);
    }
    moveEl(n, items[i].x, items[i].y, 'std', items[i].vx, items[i].vy);
  }
  var olds = field.querySelectorAll('.' + cls);
  for (var j = 0; j < olds.length; j++) {
    var idx = +(olds[j].id || '').slice(prefix.length);
    if (!(idx >= 0 && idx < items.length)) olds[j].remove();
  }
}
// Bomber blast cells, keyed by grid cell: created/pruned from the live
// view so explosions no longer force a stage rebuild. Cell (c, r) of
// the 15x9 grid spans exactly 2x2 game units.
function syncBlasts(blasts) {
  var field = el('afield');
  if (!field) return;
  var seen = {};
  for (var i = 0; i < blasts.length; i++) {
    var cells = blasts[i].cells || [];
    for (var j = 0; j < cells.length; j++) {
      var c = cells[j][0], r = cells[j][1];
      var id = 'blast-' + c + '-' + r; seen[id] = 1;
      if (!el(id)) {
        var n = document.createElement('div');
        n.id = id; n.className = 'ablast';
        n.style.left = (c * 6.25) + '%'; n.style.top = (r * 11.1111) + '%';
        n.style.width = '6.25%'; n.style.height = '11.1111%';
        field.appendChild(n);
      }
    }
  }
  var olds = field.querySelectorAll('.ablast');
  for (var k = 0; k < olds.length; k++) if (!seen[olds[k].id]) olds[k].remove();
}
// ---------------------------------------------------------------------
// rAF position interpolation, transform edition. patchPositions records
// TARGET positions (in game units) through moveEl; one
// requestAnimationFrame loop eases each element toward its target and
// writes a GPU-composited transform: translate3d(...) instead of
// left/top (no layout, no paint of the element's box). Elements sit at
// left:0/top:0 of the field; the pixel offset comes from the field rect
// and each element's own centring is appended (translate(-50%,-50%),
// or the crown's -135% hover; margin-centred pieces need nothing).
// First placement of any element SNAPS exactly to target in the same
// task as the render: the centre-flash guard is preserved. On top of
// easing, the loop EXTRAPOLATES: views carry vx/vy in units per tick,
// and the rendered target leads the last server position by a TIME
// budget (SMOOTH3: up to 400 ms of dead reckoning at the 62.5 ms
// tick), so motion runs ahead of the tick instead of trailing it —
// and when a state push is delayed, movers keep gliding on their
// last velocity for up to 400 ms instead of freezing mid-glide; the
// exponential ease (tau 40) absorbs the correction when fresh state
// lands. The loop still reads the field's .slowmo class and
// stretches its time constant ~6x. Without rAF, moveEl falls back to
// left/top percentages and the CSS transitions carry the motion.
var RAF_OK = typeof requestAnimationFrame === 'function';
var RAF_TAU = 30;
// Snapshot-interpolation delay for non-predicted movers: the render
// runs this far behind the newest anchor, between the last two
// anchors, so delivery jitter cannot move the rendered path.
var INTERP_MS = 100;
var TICK_MS_CLIENT = 62.5;
function moverMode(node) {
  var c = ' ' + (node.className || '') + ' ';
  if (c.indexOf(' acrown ') >= 0) return 'crown';
  if (c.indexOf(' ashell ') >= 0 || c.indexOf(' aslime ') >= 0 || c.indexOf(' tgem ') >= 0 || c.indexOf(' ffly ') >= 0) return 'm';
  return 'c';
}
function writePos(e, rect) {
  var parent = e.el.parentElement;
  if (!parent) return;
  // The field's size is cached across frames: measuring it forces
  // a synchronous layout of the whole page, and doing that inside
  // the frame loop (or at every mover spawn) is a steady tax on
  // weak machines. The cache is dropped on window resize.
  rect = rect || (parent.id === 'afield' ? S.fieldRect : null) || parent.getBoundingClientRect();
  if (parent.id === 'afield' && rect.width) S.fieldRect = rect;
  if (!rect.width) return;
  var p = famPct(e.fam, e.x, e.y);
  var t = 'translate3d(' + (p[0] / 100 * rect.width).toFixed(1) + 'px,' + (p[1] / 100 * rect.height).toFixed(1) + 'px,0)';
  if (e.mode === 'c') t += ' translate(-50%,-50%)';
  else if (e.mode === 'crown') t += ' translate(-50%,-135%)';
  // Writing the same transform again still costs a style recalc on
  // weak GPUs; movers whose rendered position did not change since
  // the last write (idle players, paused balls, static pieces) skip
  // the write entirely.
  if (e._wt !== t) { e._wt = t; e.el.style.transform = t; }
}
// --- SMOOTH4: client-side prediction for the viewer's OWN character.
// A local keypress used to show on screen only after a full round
// trip to the Durable Object and back (pad POST -> tick -> push ->
// render), even though the pad is already known HERE, instantly.
// For the seven positional pad games below, rafLoop now steers the
// viewer's own blob with a LIVE velocity rebuilt from the currently
// held pad (same sign convention as every server stepper:
// x = r - l, y = d - u) at the last speed the server reported for
// that axis, and leads the anchor by the elapsed time plus a fixed
// 2.5 ticks (the one-way trip), under the same 400 ms cap as the
// plain dead reckoning. Other players, bots, projectiles and props
// keep the server velocity untouched. When the pad is released the
// prediction velocity is 0 and the mover settles on the anchor
// exactly as before. Scope is deliberately narrow: positional
// movers only (no gravity games, no shared blob, no soccer).
var PRED_GAMES = { 'day-ra': 1, 'ne-dan': 1, 'cuop-sao': 1, 'giu-vuong-mien': 1, 'son-san': 1, 'xe-tank': 1, 'thu-thanh': 1 };
function predPadFor(id) {
  if (!id || id.indexOf('ablob-') !== 0) return null;
  var v = S.view;
  if (!v || !v.game || !PRED_GAMES[v.game.id]) return null;
  var seat = +id.slice(6);
  if (!seat) return null;
  if (S.role === 'player') return seat === S.seat ? S.padState : null;
  if (S.role === 'host' && v.locals) {
    for (var i = 0; i < v.locals.length; i++) {
      if (v.locals[i].seat === seat) { var st = LK[seat]; return st ? st.pad : null; }
    }
  }
  // Remote human (phone/APK player): the view carries their last
  // held pad as a bitmask — predict from it exactly like a local
  // seat. It is at most one push cadence old, and the anchor
  // reconcile keeps it honest. Bots carry no mask and stay on the
  // interpolation path.
  var vb = v.game.blobs ? v.game.blobs[seat] : null;
  if (vb && typeof vb.pm === 'number') {
    return { up: !!(vb.pm & 1), down: !!(vb.pm & 2), left: !!(vb.pm & 4), right: !!(vb.pm & 8), a: !!(vb.pm & 16), b: !!(vb.pm & 32), x: !!(vb.pm & 64), y: !!(vb.pm & 128) };
  }
  return null;
}
function moveEl(node, x, y, fam, vx, vy) {
  if (!node) return;
  fam = fam || 'std';
  if (!RAF_OK || !node.id) {
    var p = famPct(fam, x, y);
    node.style.left = p[0] + '%'; node.style.top = p[1] + '%';
    return;
  }
  var e = S.raf[node.id];
  if (!e || e.el !== node) {
    node.style.left = '0px'; node.style.top = '0px';
    var at0 = (S._anchorT || serverNow());
    var cls0 = ' ' + (node.className || '') + ' ';
    e = S.raf[node.id] = { el: node, fam: fam, mode: moverMode(node), bal: (cls0.indexOf(' ashell ') >= 0 || cls0.indexOf(' aball ') >= 0), x: x, y: y, px: x, py: y, atP: at0, tx: x, ty: y, vx: vx || 0, vy: vy || 0, atS: at0, lastSpdX: vx ? Math.abs(vx) : null, lastSpdY: vy ? Math.abs(vy) : null };
    writePos(e);
    return;
  }
  var newAtS = (S._anchorT || serverNow());
  if (newAtS < e.atS) return; // stale / out-of-order view: anchors never run backward
  if (newAtS === e.atS && x === e.tx && y === e.ty) { e.vx = vx || 0; e.vy = vy || 0; e.fam = fam; return; } // the same view re-applied by tick/render is not a new anchor
  // Keep the previous anchor: non-predicted movers are rendered by
  // interpolating between the last two anchors on the server clock,
  // which is what makes their motion immune to delivery jitter.
  e.px = e.tx; e.py = e.ty; e.atP = e.atS;
  e.tx = x; e.ty = y; e.vx = vx || 0; e.vy = vy || 0; e.atS = newAtS; e.fam = fam;
  if (predPadFor(node.id)) {
    // Remember the last nonzero per-axis speed the server reported
    // (magnitude only — the held pad supplies the sign) for the
    // local integration in rafLoop, then reconcile softly: project
    // the fresh anchor to "now" along its own velocity and pull the
    // render a third of the way toward it. Only a true teleport
    // (ring-out respawn) snaps outright — the old hard snap at 2.5u
    // fired on ordinary jitter corrections too and read as a jerk.
    if (e.vx) e.lastSpdX = Math.abs(e.vx);
    if (e.vy) e.lastSpdY = Math.abs(e.vy);
    var ageT = Math.min(Math.max((serverNow() - e.atS) / TICK_MS_CLIENT, 0), 400 / TICK_MS_CLIENT);
    var projX = e.tx + e.vx * ageT, projY = e.ty + e.vy * ageT;
    var ddx = projX - e.x, ddy = projY - e.y;
    // Do not drag the render toward the projection here: an
    // instant pull once per push is a 16 Hz step train on the
    // player's own character (reads as vibration). Store the
    // correction; rafLoop applies it as a smooth spring.
    if (Math.abs(ddx) > 2.5 || Math.abs(ddy) > 2.5) { e.x = projX; e.y = projY; e.corrX = 0; e.corrY = 0; }
    else { e.corrX = ddx; e.corrY = ddy; }
  } else if (Math.abs(e.tx - e.px) > 3 || Math.abs(e.ty - e.py) > 3) {
    // Teleport (spawn / respawn): restart the interpolation history
    // here instead of gliding across the arena.
    e.px = e.tx; e.py = e.ty; e.atP = e.atS; e.x = e.tx; e.y = e.ty; e.corrX = 0; e.corrY = 0;
  } else {
    // Non-predicted mover (bots, other players): the new anchor's
    // projection almost never equals the position the render has
    // reached by extrapolating the PREVIOUS anchor — bot steering,
    // decaying knockback and wall bounces all bend the true path
    // between pushes. Snapping to the new projection at every push
    // is a ~15 Hz step train across the whole scene (the "frames
    // keep skipping" feel, worst in Day Ra where knockback velocity
    // decays every tick). Store the gap as an offset instead;
    // rafLoop adds it to the fresh projection and decays it over
    // ~85 ms, so the path bends smoothly into the new anchor.
    // Project on the RENDER clock (now minus the adaptive delay),
    // not wall-clock now: rafLoop draws at rt, so an offset measured
    // against "now" is wrong by vx * delay and the render jumps by
    // exactly that error whenever the delay is engaged.
    var rtN = serverNow() - (S._rDelayCur || 0) / 1000;
    var ageN = Math.min(Math.max((rtN - e.atS) / TICK_MS_CLIENT, 0), 400 / TICK_MS_CLIENT);
    e.corrX = e.x - (e.tx + e.vx * ageN);
    e.corrY = e.y - (e.ty + e.vy * ageN);
  }
}
function rafLoop(ts) {
  requestAnimationFrame(rafLoop);
  var nowMs = typeof ts === 'number' ? ts : performance.now();
  var dt = S.rafLast ? Math.min(100, nowMs - S.rafLast) : 16;
  S.rafLast = nowMs;
  // Adaptive lite mode: average the frame time over 50-frame
  // windows; if this device cannot hold ~45fps, shed the expensive
  // paint work (body.lite CSS) until frames recover for 3 straight
  // windows. Weak hardware feels "lag" no network fix can cure —
  // this makes the page itself cheaper exactly when it matters.
  S._ftAcc = (S._ftAcc || 0) + dt; S._ftN = (S._ftN || 0) + 1;
  if (dt > 25) S._ftSlow = (S._ftSlow || 0) + 1;
  if (dt > 25) { S._hitch = S._hitch || []; S._hitch.push({ t: Date.now(), d: Math.round(dt) }); if (S._hitch.length > 60) S._hitch.shift(); }
  if (dt > 120) S._ftBlock = true;
  if (S._ftN >= 50) {
    var avgF = S._ftAcc / S._ftN; var slowN = S._ftSlow || 0; var blocked = !!S._ftBlock; S._ftAcc = 0; S._ftN = 0; S._ftSlow = 0; S._ftBlock = false;
    S._fpsAvg = avgF;
    var bd = document.body;
    if (bd) {
      // Trigger on hitches, not just a low average: a page that
      // averages 58 fps but freezes 200 ms every few seconds FEELS
      // broken while its average still looks healthy — and a single
      // long block produces only ONE slow frame sample, so count
      // blocks explicitly.
      if ((avgF > 23 || slowN >= 8 || blocked) && !bd.classList.contains('lite')) bd.classList.add('lite');
      else if (avgF < 17 && slowN <= 2 && bd.classList.contains('lite')) { S._liteOk = (S._liteOk || 0) + 1; if (S._liteOk >= 3) { bd.classList.remove('lite'); S._liteOk = 0; } }
      else if (avgF >= 17) S._liteOk = 0;
    }
  }
  var field = el('afield');
  if (field && !field.classList.contains('raf-on')) field.classList.add('raf-on');
  var slow = !!(field && field.classList.contains('slowmo'));
  var ks = 1 - Math.exp(-dt / (RAF_TAU * 6));
  var nowS = serverNow();
  var rectCache = [];
  for (var id in S.raf) {
    var e = S.raf[id];
    if (e.el.isConnected === false) { delete S.raf[id]; continue; }
    var parent = e.el.parentElement;
    if (!parent) continue;
    var rect = null;
    for (var ci = 0; ci < rectCache.length; ci++) if (rectCache[ci][0] === parent) { rect = rectCache[ci][1]; break; }
    if (!rect) { rect = parent.getBoundingClientRect(); rectCache.push([parent, rect]); }
    var pp = predPadFor(id);
    if (pp) {
      // Own character — client-side prediction by INTEGRATION: each
      // frame advances the render by the live pad at the last speed
      // the server reported, so input answers on the very next frame
      // and no network swing can move the goalposts (the old
      // anchor-age extrapolation teleported its goal back and forth
      // whenever delivery jittered — the measured jerk). A free axis
      // follows the anchor velocity with a freshness fade: a stale
      // velocity is probably over, which is what keeps a released
      // key or a finished shove from drifting on. moveEl reconciles
      // softly each time a fresh anchor lands.
      var dtT = dt / TICK_MS_CLIENT;
      var pdx = (pp.r ? 1 : 0) - (pp.l ? 1 : 0), pdy = (pp.d ? 1 : 0) - (pp.u ? 1 : 0);
      var ageTk = Math.min(Math.max((nowS - (e.atS || nowS)) / TICK_MS_CLIENT, 0), 6);
      var fresh = Math.max(0, 1 - ageTk / 2.5);
      // Speed seed: every predicted game's stepper moves its blobs
      // at the arena step (STEP_X 0.167 / STEP_Y 0.094 per tick), so
      // a press from standstill predicts at that speed until the
      // first anchor reports the true one. Without the seed the
      // first press of every stop-and-go waited a full round trip
      // for an observed speed (measured 170 ms on a zero-delay rig).
      var spdX = e.lastSpdX != null ? e.lastSpdX : 0.167;
      var spdY = e.lastSpdY != null ? e.lastSpdY : 0.094;
      if (pdx !== 0) e.x += pdx * spdX * dtT; else e.x += (e.vx || 0) * fresh * dtT;
      if (pdy !== 0) e.y += pdy * spdY * dtT; else e.y += (e.vy || 0) * fresh * dtT;
      // Continuous reconcile spring (~80 ms): applies the stored
      // correction from the latest anchor gradually, every frame.
      if (e.corrX || e.corrY) {
        var cf3 = 1 - Math.exp(-dt / 80);
        var ax3 = (e.corrX || 0) * cf3, ay3 = (e.corrY || 0) * cf3;
        e.x += ax3; e.y += ay3; e.corrX -= ax3; e.corrY -= ay3;
      }
      writePos(e, rect);
      continue;
    }
    if (slow && field && field.contains(e.el)) {
      // The brief slow-mo celebration keeps its legacy glide.
      var leadS = Math.min(Math.max((nowS - (e.atS || nowS)) / TICK_MS_CLIENT, 0), 400 / TICK_MS_CLIENT);
      var sx = e.tx + e.vx * leadS - e.x, sy = e.ty + e.vy * leadS - e.y;
      e.x += sx * ks; e.y += sy * ks;
      writePos(e, rect);
      continue;
    }
    // Everyone else — snapshot interpolation on the server clock:
    // render the mover as it was INTERP_MS ago, between the last
    // two anchors. Delivery jitter changes WHEN anchors land, never
    // the rendered path. If render time runs past the newest anchor
    // (a push is late), extrapolate its velocity for at most 80 ms,
    // then hold until the next anchor arrives.
    // Ballistic movers (shells) get a much shorter delay — transit
    // plus a breath — because their extrapolation is exact: what
    // matters in a dodge game is that a shell is drawn where it IS,
    // not where it was a tenth of a second ago.
    // The render clock trails real time by a delay sized from the
    // MEASURED push cadence: while pushes arrive at tick rate
    // (~63 ms) the delay is zero and movers dead-reckon exactly as
    // before, but when the channel degrades (a measured median gap
    // of 118 ms on the user's own screen, with a fast 30 ms ping —
    // the alarm path, not the network) the delay grows to cover
    // the gap and the segment interpolation below takes over, so
    // the world glides across late pushes instead of snapping at
    // each one. The player's own blob is unaffected: it renders
    // from local prediction at ~now on a separate branch.
    // Size the render buffer from the gap DISTRIBUTION, not the
    // median: residential Wi-Fi delivers pushes in bunches (three
    // at once, then 250 ms of silence) while the median still reads
    // a healthy ~60 ms — a median-sized buffer is empty exactly
    // when the bunch gap hits, so the world extrapolated, decayed
    // and snapped all match long. The 90th-percentile gap is the
    // honest size of the hole the buffer must cover. On a truly
    // clean channel (p90 <= 85 ms) the delay stays zero.
    var gapHist = (S._gapWs && S._gapWs.length >= 6) ? S._gapWs : S._gapH;
    var gapP90 = pctOf(gapHist, 0.9) || medOf(gapHist) || 63;
    var rDelayT = gapP90 <= 85 ? 0 : Math.min(240, Math.max(40, (gapP90 - 15) * 0.9));
    // The delay itself must glide toward its target (<=2 ms per
    // frame): the rolling median steps as samples enter and leave,
    // and a stepping delay makes the render clock wobble, which is
    // visible as judder all by itself.
    if (S._rDelayCur === undefined) S._rDelayCur = rDelayT;
    else if (S._rDelayCur < rDelayT) S._rDelayCur = Math.min(rDelayT, S._rDelayCur + 2);
    else if (S._rDelayCur > rDelayT) S._rDelayCur = Math.max(rDelayT, S._rDelayCur - 2);
    var rt = nowS - S._rDelayCur / 1000;
    var gx, gy;
    if (e.atS == null || e.atP == null || e.atS <= e.atP || rt >= e.atS) {
      // Past the newest anchor: extrapolate the velocity.
      var extra = e.atS == null ? 0 : Math.min(Math.max(rt - e.atS, 0), e.bal ? 700 : 500);
      // Ballistic movers fly straight at constant speed FOREVER:
      // decaying their extrapolation (the old shared rule) made
      // shells visibly slow down then lurch forward whenever
      // delivery bunched — in a dodge game that reads as pure lag.
      // Other movers keep a gentle decay that only starts at
      // 200 ms, so a late push resumes from a closer position and
      // the catch-up correction stays small.
      var decay = e.bal ? 1 : (extra <= 200 ? 1 : Math.max(0.6, 1 - (extra - 200) / 750));
      var dist = (extra / TICK_MS_CLIENT) * decay;
      gx = e.tx + (e.vx || 0) * dist; gy = e.ty + (e.vy || 0) * dist;
    } else if (rt <= e.atP) { gx = e.px; gy = e.py; }
    else { var f = (rt - e.atP) / (e.atS - e.atP); gx = e.px + (e.tx - e.px) * f; gy = e.py + (e.ty - e.py) * f; }
    // Apply the anchor-arrival offset (see moveEl): the rendered
    // path starts from where the eye actually was and the offset
    // decays exponentially, so velocity changes between pushes
    // bend the path instead of stepping it.
    if (e.corrX || e.corrY) {
      var cfN = Math.exp(-dt / 85);
      e.corrX = (e.corrX || 0) * cfN; e.corrY = (e.corrY || 0) * cfN;
      if (Math.abs(e.corrX) < 0.004) e.corrX = 0;
      if (Math.abs(e.corrY) < 0.004) e.corrY = 0;
      gx += e.corrX; gy += e.corrY;
    }
    e.x = gx; e.y = gy;
    writePos(e, rect);
  }
}
// Position + label sync for every arena-style game (blobs, cannonballs,
// barrels, shells, slimes, stars, crown, paint grid, shared blob, crate,
// boat). tick() runs this every 150ms; render() ALSO runs it once via
// afterRender, because a full re-render rebuilds the field DOM with
// elements at their CSS default (left/top 50%) — without an immediate
// patch they would flash at the arena centre until the next tick.
// Everything here is a pure function of the current view (idempotent),
// and arenaFX keeps its own delta snapshot, so an extra call after a
// render can only fire a pending effect once, never twice.
// DOM write guards: patchPositions runs on every push (and every
// local tick); rewriting identical text/transforms still dirties
// layout on weak GPUs, so each element remembers its last value.
function setT(elm, txt) { if (!elm) return; txt = '' + txt; if (elm._tx !== txt) { elm._tx = txt; elm.textContent = txt; } }
function setTf(elm, tf) { if (!elm) return; if (elm._tf !== tf) { elm._tf = tf; elm.style.transform = tf; } }
function setOp(elm, op) { if (!elm) return; if (elm._op !== op) { elm._op = op; elm.style.opacity = op; } }
function patchPositions(v) {
  var g = v && v.game;
  if (!g) return;
  var t = serverNow();
  S._anchorT = (v && v.serverNow) || t; // anchors are stamped with the VIEW's server time, not the apply time
  if ((g.id === 'day-ra' || g.id === 'ne-dan') && g.blobs) {
    for (var bSeat in g.blobs) {
      var bb = g.blobs[bSeat];
      var bn = el('ablob-' + bSeat);
      if (bn) {
        moveEl(bn, bb.x, bb.y, 'std', bb.vx, bb.vy);
        bn.style.opacity = bb.alive ? '1' : '0.25';
      }
      var lv = el('alives-' + bSeat);
      if (lv) lv.textContent = '\u2764'.repeat(bb.lives);
    }
    var ring = el('aring');
    // Ring size rides a transform scale on the fixed full-field basis
    // (.aring.dynring is 100% x 100%): scale = (arenaR * 25/3)% / 100 —
    // the exact diameter the old width/height percentages produced,
    // without repainting the giant bordered circle on every patch.
    if (ring && g.arenaR) { ring.style.transform = 'translate(-50%, -50%) scale(' + (g.arenaR * 25 / 300) + ')'; }
    var ml = el('mylives');
    if (ml && g.blobs[S.seat]) ml.textContent = '\u2764'.repeat(g.blobs[S.seat].lives);
  }
  if (g.id === 'ne-dan' && g.balls) syncDynIdx(g.balls, 'nball-', 'aball');
  if ((g.id === 'day-ra' || g.id === 'ne-dan') && g.blobs) arenaFX(v, g);
  if (g.id === 'keo-co') {
    var kn9 = el('tugknot');
    if (kn9) kn9.style.left = Math.max(3, Math.min(97, 50 + (g.knot / 112) * 46)) + '%';
    if (g.presses) for (var pSeat in g.presses) { setT(el('tugpress-' + pSeat), g.presses[pSeat]); }
    var mp9 = el('mypull');
    if (g.presses) setT(mp9, g.presses[S.seat] || 0);
  }
  if ((g.id === 'xe-tank' || g.id === 'dat-bom' || g.id === 'thu-thanh') && g.blobs) {
    for (var wSeat in g.blobs) {
      var wb = g.blobs[wSeat];
      var wn = el('ablob-' + wSeat);
      if (wn) {
        moveEl(wn, wb.x, wb.y, 'std', wb.vx, wb.vy);
        setOp(wn, wb.alive ? '1' : '0.25');
      }
      var lv2 = el('alives-' + wSeat);
      setT(lv2, '\u2764'.repeat(Math.max(0, wb.lives)));
      var brl = el('barrel-' + wSeat);
      if (brl && g.facing && g.facing[wSeat]) setTf(brl, 'rotate(' + Math.round(Math.atan2(g.facing[wSeat].y, g.facing[wSeat].x) * 180 / Math.PI) + 'deg)');
    }
    var ml2 = el('mylives');
    if (g.blobs[S.seat]) setT(ml2, '\u2764'.repeat(Math.max(0, g.blobs[S.seat].lives)));
    if (g.shells) syncDyn(g.shells, 'shell-', 'ashell', null);
    if (g.id === 'xe-tank' || g.id === 'dat-bom') arenaFX(v, g);
  }
  if (g.id === 'dat-bom') {
    if (g.bombs) syncDyn(g.bombs, 'abomb-', 'abomb', function (n, it) { n.textContent = '\uD83D\uDCA3'; });
    if (g.soft) {
      var softSet = {};
      for (var sfI = 0; sfI < g.soft.length; sfI++) softSet[g.soft[sfI][0] + ',' + g.soft[sfI][1]] = 1;
      var softEls = document.querySelectorAll('.bsoft');
      for (var sfJ = 0; sfJ < softEls.length; sfJ++) {
        var sfKey = (softEls[sfJ].id || '').slice(6);
        softEls[sfJ].style.display = softSet[sfKey] ? '' : 'none';
      }
    }
    if (g.blasts) syncBlasts(g.blasts);
  }
  if (g.id === 'thu-thanh') {
    if (g.slimes) syncDyn(g.slimes, 'slime-', 'aslime', function (n, it) { n.className = 'aslime' + (it.big ? ' big' : ''); n.innerHTML = '<i></i><i></i>'; });
    var ch2 = el('crystalhp'); if (ch2 && g.crystal) ch2.textContent = g.crystal.hp;
    var chh = el('crystalhearts'); if (chh && g.crystal) chh.textContent = '\u2764'.repeat(Math.max(0, g.crystal.hp));
    var kn = el('killn'); if (kn) kn.textContent = g.kills || 0;
    var chp2 = el('crystalhp2'); if (chp2 && g.crystal) chp2.textContent = g.crystal.hp;
    var kn2 = el('killn2'); if (kn2) kn2.textContent = g.kills || 0;
  }
  if (g.id === 'nguoi-que' && g.blobs) {
    for (var qSeat in g.blobs) {
      var qb2 = g.blobs[qSeat];
      var qn = el('ablob-' + qSeat);
      if (qn) {
        moveEl(qn, qb2.x, qb2.y, 'std', qb2.vx, qb2.vy);
        qn.style.opacity = qb2.alive ? (qb2.invuln ? '0.55' : '1') : '0.2';
      }
      var dm = el('dmg-' + qSeat);
      if (dm) { dm.textContent = (qb2.dmg || 0) + '%'; dm.style.color = dmgColor(qb2.dmg || 0); }
      var lvq = el('alives-' + qSeat);
      if (lvq) lvq.textContent = '\u2665'.repeat(Math.max(0, qb2.lives));
      var fg = el('fig-' + qSeat);
      if (fg) {
        var poseKey = fightPose(qb2) + '|' + (qb2.face || 1);
        if (fg.dataset.pose !== poseKey) { fg.dataset.pose = poseKey; var plq = playerOf(v, +qSeat); fg.innerHTML = stickSVG(plq ? plq.color : 'blue', fightPose(qb2), qb2.face); }
      }
    }
    var mlq = el('mylives'); if (mlq && g.blobs[S.seat]) mlq.textContent = '\u2665'.repeat(Math.max(0, g.blobs[S.seat].lives));
    var mdq = el('mydmg'); if (mdq) mdq.textContent = (g.myDmg || 0) + '%';
    arenaFX(v, g);
  }
  if (g.id === 'den-lua-nuoc' && g.chars) {
    for (var cSeat in g.chars) {
      var cc2 = g.chars[cSeat];
      var cn = el('achar-' + cSeat);
      if (cn) {
        moveEl(cn, cc2.x, cc2.y, 'std', cc2.vx, cc2.vy);
        cn.className = 'achar' + (cc2.home ? ' home' : '');
      }
    }
    if (g.gems) syncDyn(g.gems, 'tgem-', 'tgem', function (n, it) { n.className = 'tgem ' + it.el + (it.taken ? ' taken' : ''); if (!n.firstChild) n.innerHTML = '<i></i>'; });
    (g.gates || []).forEach(function (gt2, gi2) { var gn = el('gate-' + gi2); if (gn) gn.className = 'tgate' + (g.gateOpen ? ' open' : ''); });
    var gl2 = el('gemlua'); if (gl2 && g.gemCount) gl2.textContent = g.gemCount.lua;
    var gw2 = el('gemnuoc'); if (gw2 && g.gemCount) gw2.textContent = g.gemCount.nuoc;
    var th2 = el('temphearts'); if (th2) th2.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var glp = el('gemluap'); if (glp && g.gemCount) glp.textContent = g.gemCount.lua;
    var gwp = el('gemnuocp'); if (gwp && g.gemCount) gwp.textContent = g.gemCount.nuoc;
    var thp = el('tempheartsp'); if (thp) thp.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    arenaFX(v, g);
  }
  if (g.id === 'da-bong') {
    if (g.blobs) {
      for (var sSeat in g.blobs) {
        var sbb = g.blobs[sSeat];
        var snn = el('ablob-' + sSeat);
        if (snn) moveEl(snn, sbb.x, sbb.y, 'soc', sbb.vx, sbb.vy);
      }
    }
    var sbl = el('sball');
    if (sbl && g.ball) moveEl(sbl, g.ball.x, g.ball.y, 'soc', g.ball.vx, g.ball.vy);
    var sd9 = el('scoredo'); if (sd9 && g.scoreboard) sd9.textContent = g.scoreboard.do;
    var sx9 = el('scorexanh'); if (sx9 && g.scoreboard) sx9.textContent = g.scoreboard.xanh;
    arenaFX(v, g);
  }
  if (g.id === 'ech-op') {
    if (g.frogs) {
      for (var fSeat in g.frogs) {
        var fb9 = g.frogs[fSeat];
        var fn9 = el('afrog-' + fSeat);
        if (!fn9) continue;
        if (fb9.state === 'in') { fn9.style.display = 'none'; continue; }
        fn9.style.display = '';
        moveEl(fn9, fb9.x, fb9.y, 'std', fb9.vx, fb9.vy);
        var stKey = fb9.state + ':' + (fb9.bellySeat || '');
        if (fn9.dataset.st !== stKey) {
          fn9.dataset.st = stKey;
          fn9.className = 'afrog' + (fb9.state === 'carry' ? ' carry' : '');
          var bp9 = fb9.bellySeat ? playerOf(v, fb9.bellySeat) : null;
          var me9 = playerOf(v, +fSeat);
          fn9.innerHTML = frogSVG(me9 ? me9.color : 'green', bp9 ? bp9.color : null) + '<div class="aname">' + esc(me9 ? me9.name : '') + '</div>';
        }
      }
    }
    if (g.crates) syncDyn(g.crates, 'fcrate-', 'fcrate', null);
    if (g.flies) {
      syncDyn(g.flies, 'ffly-', 'ffly', null);
      for (var flI = 0; flI < g.flies.length; flI++) {
        var flN = el('ffly-' + g.flies[flI].id);
        if (flN) flN.className = 'ffly' + (g.flies[flI].taken ? ' taken' : '');
      }
    }
    var fh9 = el('froghearts'); if (fh9) fh9.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var ff9 = el('frogflies'); if (ff9) ff9.textContent = g.fliesEaten || 0;
    var fc9 = el('frogcham'); if (fc9) fc9.textContent = g.chamber || 1;
    var fhp = el('frogheartsp'); if (fhp) fhp.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var ffp = el('frogfliesp'); if (ffp) ffp.textContent = g.fliesEaten || 0;
    arenaFX(v, g);
  }
  if (g.id === 'can-goc') {
    var shp = el('shellpt');
    if (shp && g.shell) moveEl(shp, g.shell.x, g.shell.y, 'std', g.shell.vx, g.shell.vy);
    var aa9 = el('aimangle'); if (aa9 && g.myCannon) aa9.textContent = g.myCannon.angle;
    var ap9 = el('aimpower'); if (ap9 && g.myCannon) ap9.textContent = g.myCannon.power;
    arenaFX(v, g);
  }
  if ((g.id === 'cuop-sao' || g.id === 'giu-vuong-mien' || g.id === 'son-san') && g.blobs) {
    for (var nSeat in g.blobs) {
      var nb2 = g.blobs[nSeat];
      var nn = el('ablob-' + nSeat);
      if (nn) {
        moveEl(nn, nb2.x, nb2.y, 'std', nb2.vx, nb2.vy);
        if (g.id === 'giu-vuong-mien') nn.className = 'ablob' + (g.crown && g.crown.holder === +nSeat ? ' holder' : '');
      }
    }
    if (g.id === 'cuop-sao') {
      var mb2 = el('mybank'); if (mb2) mb2.textContent = g.mine || 0;
      if (g.banked) for (var bkSeat in g.banked) { var bkn = el('bankn-' + bkSeat); if (bkn) bkn.textContent = g.banked[bkSeat]; }
      if (g.stars) syncDyn(g.stars, 'astar-', 'astar', function (n, it) { n.className = 'astar' + (it.gold ? ' gold' : ''); n.textContent = '\u2605'; });
    }
    if (g.id === 'giu-vuong-mien') {
      var cr2 = el('acrown');
      if (cr2 && g.crown) {
        var cx2 = g.crown.x, cy2 = g.crown.y;
        var cvx = g.crown.vx || 0, cvy = g.crown.vy || 0;
        if (g.crown.holder && g.blobs[g.crown.holder]) { cx2 = g.blobs[g.crown.holder].x; cy2 = g.blobs[g.crown.holder].y; cvx = g.blobs[g.crown.holder].vx || 0; cvy = g.blobs[g.crown.holder].vy || 0; }
        moveEl(cr2, cx2, cy2, 'std', cvx, cvy);
      }
      for (var hSeat in g.hold || {}) { var hn2 = el('holdn-' + hSeat); if (hn2) hn2.textContent = g.hold[hSeat]; }
      var mh2 = el('myhold'); if (mh2) mh2.textContent = g.mine || 0;
    }
    if (g.id === 'son-san' && g.grid) {
      for (var ci2 = 0; ci2 < 180; ci2++) {
        var cell2 = el('scell-' + ci2); if (!cell2) continue;
        var own2 = g.grid[ci2]; var cp2 = own2 ? playerOf(v, own2) : null;
        cell2.style.background = cp2 ? COLORS[cp2.color] : 'rgba(255,255,255,.07)';
      }
      for (var cSeat2 in g.counts || {}) { var sn2 = el('scount-' + cSeat2); if (sn2) sn2.textContent = g.counts[cSeat2]; }
      var mc2 = el('mycells'); if (mc2) mc2.textContent = g.mine || 0;
    }
    arenaFX(v, g);
  }
  if (g.id === 'chung-mot-than' && g.shared) {
    var sb = el('sharedblob');
    if (sb) moveEl(sb, g.shared.x, g.shared.y, 'std', g.shared.vx, g.shared.vy);
    var cs = el('cstar');
    if (cs && g.star) moveEl(cs, g.star.x, g.star.y, 'std', 0, 0);
    if (g.balls) syncDynIdx(g.balls, 'nball-', 'aball');
    var cn2 = el('checkn'); if (cn2) cn2.textContent = g.checks || 0;
    var th = el('teamhearts'); if (th) th.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var thp2 = el('teamheartsp'); if (thp2) thp2.textContent = '\u2764'.repeat(Math.max(0, g.hearts || 0));
    var cnp = el('checknp'); if (cnp) cnp.textContent = g.checks || 0;
  }
  if (g.id === 'day-hop' && g.blobs) {
    for (var xSeat in g.blobs) {
      var xb = g.blobs[xSeat];
      var xn = el('ablob-' + xSeat);
      if (xn) moveEl(xn, xb.x, xb.y, 'std', xb.vx, xb.vy);
    }
    var crt = el('acrate');
    if (crt && g.crate) moveEl(crt, g.crate.x, g.crate.y, 'std', g.crate.vx, g.crate.vy);
    var dv = el('delivn'); if (dv) dv.textContent = g.deliveries || 0;
    var dvp = el('delivp'); if (dvp) dvp.textContent = g.deliveries || 0;
  }
  if (g.id === 'cheo-thuyen' && g.phase === 'row') {
    var pctR = Math.max(0, Math.min(100, (g.distance || 0) / (g.course || 400) * 100));
    var rp4 = el('rowprog'); if (rp4) rp4.style.width = pctR + '%';
    var rd = el('rowdist'); if (rd) rd.textContent = Math.round(g.distance || 0);
    var bt = el('aboat'); if (bt) bt.style.left = (4 + pctR * 0.9) + '%';
    var rb2 = el('rowbeat'); if (rb2) rb2.textContent = g.beat || 1;
    for (var rhSeat in g.hits || {}) { var rh = el('rowhit-' + rhSeat); if (rh) rh.textContent = g.hits[rhSeat]; }
    var ring2 = el('beating');
    if (ring2 && g.nextBeatAt) {
      var toBeat = g.nextBeatAt - t;
      var pr = Math.max(0, Math.min(1, 1 - toBeat / 1000));
      ring2.style.opacity = (0.2 + 0.8 * pr).toFixed(2);
      ring2.style.transform = 'scale(' + (0.65 + 0.45 * pr).toFixed(2) + ')';
    }
    var rbtn = el('rowbtn');
    if (rbtn && g.nextBeatAt && g.rowStart != null) {
      var inWin = (g.nextBeatAt - t >= 0 && g.nextBeatAt - t <= 260) || (t - (g.nextBeatAt - 1000) <= 260 && g.nextBeatAt - 1000 >= g.rowStart);
      if (inWin) rbtn.classList.add('now'); else rbtn.classList.remove('now');
    }
    var rhm = el('rowhits'); if (rhm) rhm.textContent = g.mine || 0;
    var rsm = el('rowsplash'); if (rsm) rsm.textContent = g.mySplash || 0;
    var rbm = el('rowbeatm'); if (rbm) rbm.textContent = g.beat || 1;
    var rdm = el('rowdistm'); if (rdm) rdm.textContent = Math.round(g.distance || 0);
    var rpm = el('rowprogm'); if (rpm) rpm.style.width = pctR + '%';
  }
}

function tick() {
  watchdog();
  wsWatchdog();
  if (S.role === 'host' && S.code) engLoad();
  vchkN = (vchkN + 1) % 400; if (vchkN === 0) versionCheck();
  var v = S.view;
  if (!v || !S.role) return;
  var t = serverNow();
  var g = v.game;
  // Stall rescue: during play the server pushes state ~16x/s over
  // this socket. If pushes have been silent for >250 ms the alarm
  // driving the loop has stalled at the platform level — drive the
  // loop from here instead: a 'tick' message makes the server
  // advance and broadcast inside its message handler, which has
  // never shown the alarm path's multi-second stalls. Costs nothing
  // while pushes are healthy (the branch simply never fires).
  if (g && v.phase === 'playing' && S.lastWsAt && Date.now() - S.lastWsAt > 250 && wsOpen() && !wsStale()) {
    try { wsConn.send(JSON.stringify({ action: 'tick' })); } catch (e) {}
  }
  // On-screen meter while playing: real numbers from THIS device —
  // frame rate, socket round trip, push cadence — so a lag report
  // carries data instead of impressions. Click to hide.
  var nmEl = el('netmeter');
  if (v.phase === 'playing' && !S.meterOff) {
    if (!nmEl) {
      nmEl = document.createElement('div'); nmEl.id = 'netmeter'; nmEl.title = 'Số đo trên máy này — bấm để ẩn';
      nmEl.addEventListener('click', function () { S.meterOff = true; nmEl.style.display = 'none'; });
      document.body.appendChild(nmEl);
    }
    if (!S._pingAt || Date.now() - S._pingAt > 2000) {
      S._pingAt = Date.now();
      if (wsOpen()) { try { wsConn.send(JSON.stringify({ action: 'ping', t: Date.now() })); } catch (e) {} }
    }
    if (!S._nmAt || Date.now() - S._nmAt > 500) {
      S._nmAt = Date.now();
      var medM = function (a) { if (!a || !a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; };
      var fpsM = S._fpsAvg ? Math.round(1000 / S._fpsAvg) : null;
      var gapHistM = (S._gapWs && S._gapWs.length >= 6) ? S._gapWs : S._gapH;
      var rttM = medM(S._rttH), gapM = pctOf(gapHistM, 0.9) || medM(gapHistM);
      var hN = 0, hW = 0;
      if (S._hitch) { var cutH = Date.now() - 10000; S._hitch = S._hitch.filter(function (h) { return h.t > cutH; }); hN = S._hitch.length; for (var hi = 0; hi < hN; hi++) if (S._hitch[hi].d > hW) hW = S._hitch[hi].d; }
      if (S.localActive) nmEl.textContent = '⚡ ' + (fpsM ? fpsM + ' fps' : '— fps') + ' · TẠI CHỖ — không qua mạng' + (hN ? ' · khựng ' + hN + ' (nặng nhất ' + hW + 'ms)' : '') + (document.body.classList.contains('lite') ? ' · LITE' : '');
      else nmEl.textContent = '⚡ ' + (fpsM ? fpsM + ' fps' : '— fps') + ' · ping ' + (rttM != null ? rttM + 'ms' : '—') + ' · nhịp ' + (gapM != null ? gapM + 'ms' : '—') + (S._lastSrc ? ' · ' + S._lastSrc : '') + (hN ? ' · khựng ' + hN + ' (nặng nhất ' + hW + 'ms)' : '') + (document.body.classList.contains('lite') ? ' · LITE' : '');
      nmEl.style.display = '';
    }
  } else if (nmEl) nmEl.style.display = 'none';
  var cd = el('cdnum');
  if (g && g.phase === 'countdown' && cd) {
    var sec = Math.max(1, Math.ceil((g.endsAt - t) / 1000));
    if (String(sec) !== cd.textContent) {
      cd.textContent = sec;
      cd.classList.remove('punch'); void cd.offsetWidth; cd.classList.add('punch');
    }
    if (sec !== S.lastCd) { S.lastCd = sec; sfxCount(sec === 1); }
  } else S.lastCd = -1;
  var bars = document.querySelectorAll('.tbar i');
  for (var i = 0; i < bars.length; i++) {
    var start = +bars[i].getAttribute('data-start'); var end = +bars[i].getAttribute('data-end');
    var pct = Math.max(0, Math.min(100, (end - t) / (end - start) * 100));
    bars[i].style.width = pct + '%';
  }
  if (g && g.id === 'do-vui' && g.phase === 'question') {
    var rem = g.endsAt - t;
    if (rem <= 3000 && rem > 0) { var s2 = Math.ceil(rem / 1000); if (s2 !== S.lastTickSec) { S.lastTickSec = s2; beep(1150, 0.045, 'square', 0.09); } }
    else if (rem > 3000) S.lastTickSec = -1;
  }
  patchPositions(v);
  var rows = document.querySelectorAll('.rev');
  for (var ri = 0; ri < rows.length; ri++) {
    if (!rows[ri].classList.contains('shown') && t >= +rows[ri].getAttribute('data-reveal')) {
      rows[ri].classList.add('shown');
      beep(500 + ri * 110, 0.08, 'triangle', 0.11);
      countUp(rows[ri]);
    }
  }
}

function homeHTML() {
  var h = '<div class="card center" style="margin-top:26px">';
  h += '<div class="logo"><span class="word">nảy</span>' + blobSVG('blue', 'reo', 60) + blobSVG('pink', 'cuoi', 60) + '<span class="party"><span style="background:#4FA8E8">P</span><span style="background:#F77FB0">A</span><span style="background:#FFB35C">R</span><span style="background:#58C472">T</span><span style="background:#A78BFA">Y</span></span></div>';
  h += '<p class="tagline">Game tiệc trên màn hình lớn — điện thoại là tay cầm</p>';
  h += '<p><button class="btn blue" data-cmd="create" style="font-size:23px">Mở trên màn hình lớn (TV)</button></p>';
  if (!('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer:fine)').matches)) h += '<p><button class="btn green" data-cmd="createKb" style="font-size:20px">⌨️ Mở màn hình lớn & chủ phòng chơi bằng bàn phím</button></p>';
  h += '<p class="muted">Màn hình lớn tạo phòng và hiện mã 6 số. Bạn bè mở trang này trên điện thoại, nhập mã là chơi — không cần cài app, không cần tài khoản.</p>';
  h += '</div>';
  h += '<div class="card center" style="margin-top:16px"><h2 style="margin:0 0 8px">📱 Tạo phòng chơi trên điện thoại</h2>';
  h += '<p class="muted" style="margin:4px 0">Không cần TV — mỗi người chơi ngay trên điện thoại của mình. Bạn tạo phòng, ngồi vào một ghế chơi luôn, rồi gửi link mời cho bạn bè.</p>';
  h += '<p><input type="text" id="pmName" maxlength="14" placeholder="Tên của bạn" style="text-align:center"></p>';
  h += '<p><button class="btn green" data-cmd="createPhone" style="font-size:22px">Tạo phòng điện thoại</button></p></div>';
  var rec = npRecents();
  if (rec.length) {
    h += '<div class="card center" style="margin-top:16px"><h3 style="margin:0 0 8px">Phòng gần đây của máy này</h3><p style="margin:0">';
    for (var ri = 0; ri < rec.length; ri++) h += '<button class="chip cool recentchip" data-cmd="recent" data-i="' + ri + '">Vào lại phòng ' + esc(rec[ri].code) + (rec[ri].name ? ' · ' + esc(rec[ri].name) : '') + '</button> ';
    h += '</p></div>';
  }
  h += '<div class="card center" style="margin-top:16px"><h2 style="margin:0 0 8px">Vào bằng điện thoại (tay cầm)</h2>';
  h += '<div class="digits">';
  for (var i = 0; i < 6; i++) h += '<input class="digit" id="d' + i + '" type="tel" maxlength="1" inputmode="numeric">';
  h += '</div>';
  h += '<p><input type="text" id="joinName" maxlength="14" placeholder="Tên của bạn" style="text-align:center"></p>';
  h += '<p id="idNote" class="small" style="display:none;margin:2px 0 0"></p>';
  h += '<p><button class="btn pink" data-cmd="join" style="font-size:22px">Vào phòng</button></p></div>';
  h += '<p class="center muted small" style="margin-top:14px">25 game: Đố Vui Tốc Độ · Đẩy Ra Khỏi Sàn · Né Đạn · Kéo Co · Chia Hay Cướp · Cướp Sao · Giữ Vương Miện · Sơn Sàn · Cao Bồi · Xe Tăng Đấu Trường · Đặt Bom · Kẻ Giả Mạo · Ma Sói · Cờ Cá Ngựa · Tiến Lên Miền Nam · Người Que Đại Chiến · Đá Bóng Đầu To · Đại Bác Căn Góc · Chung Một Thân · Đẩy Hộp Về Đích · Chèo Thuyền · Thủ Thành · Giải Mã Chung · Đền Lửa & Nước · Ếch Ộp Phiêu Lưu — 18 game đấu + 7 game hợp tác! Phòng chứa tới 12 người chơi.</p>';
  return h;
}
function playerHTML(v) {
  var h = topbarHTML(v, false);
  var me = playerOf(v, S.seat);
  if (v.phase === 'lobby' || v.phase === 'choosing') {
    h += '<div class="card center"><span class="blobbob">' + blobSVG(me ? me.color : 'blue', 'reo', 120) + '</span>';
    h += '<h2 style="margin:6px 0">' + esc(me ? me.name : '') + ' đã vào phòng!</h2>';
    h += '<p class="muted">Đợi màn hình lớn chọn game… Trong phòng đang có:</p><p>';
    for (var i = 0; i < v.players.length; i++) { var p = v.players[i]; h += '<span class="chip' + (p.type === 'bot' ? ' hot' : ' cool') + '">' + esc(p.name) + (p.type === 'bot' ? ' (Máy)' : '') + '</span>'; }
    h += '</p></div>';
    return h;
  }
  if (v.phase === 'playing' && v.game) return h + playerGame(v) + kbHintHTML();
  if (v.phase === 'results') return h + resultsHTML(v, false);
  if (v.phase === 'podium') return h + podiumHTML(v, false);
  if (v.phase === 'final') return h + finalHTML(v, false);
  return h + '<div class="card center"><h2>Đang tải…</h2></div>';
}
// Mini live field for the phone player page (see the .pfield CSS
// note): the same static mover elements the host stage builds, so
// the shared patchPositions + rafLoop machinery animates them from
// the player's own view — including prediction of the player's own
// blob. Scenery that patchPositions only touches through guarded
// lookups is omitted; gameplay statics (ring, paint grid, crown,
// shared blob, crate + maze, soccer ball) are mirrored.
var PFIELD_PHASES = { 'day-ra': 'arena', 'ne-dan': 'dodge', 'cuop-sao': 'steal', 'giu-vuong-mien': 'crown', 'son-san': 'splat', 'xe-tank': 'tank', 'dat-bom': 'bomber', 'thu-thanh': 'defend', 'chung-mot-than': 'shared', 'day-hop': 'box', 'nguoi-que': 'fight', 'den-lua-nuoc': 'temple', 'ech-op': 'frog', 'da-bong': 'soccer', 'can-goc': 'shell' };
function pfieldHTML(v, g) {
  if (!g || PFIELD_PHASES[g.id] !== g.phase && !(g.id === 'da-bong' && g.phase === 'goal') && !(g.id === 'ech-op' && g.phase === 'frogClear') && !(g.id === 'can-goc' && g.phase === 'boom')) return '';
  var h = '<div class="afield pfield' + (g.id === 'da-bong' ? ' wide' : '') + '" id="afield">';
  if (g.id === 'day-ra' || g.id === 'ne-dan') h += '<div class="aring dynring" id="aring" style="transform:translate(-50%,-50%) scale(' + ((g.arenaR || 12) * 25 / 300) + ')"></div>';
  else h += '<div class="aring" id="aring"></div>';
  if (g.id === 'son-san' && g.grid) {
    h += '<div class="splatgrid">';
    for (var gi = 0; gi < 180; gi++) { var gs = g.grid[gi]; var gp = gs ? playerOf(v, gs) : null; h += '<div class="scell" id="scell-' + gi + '"' + (gp ? ' style="background:' + COLORS[gp.color] + '"' : '') + '></div>'; }
    h += '</div>';
  }
  if (g.id === 'giu-vuong-mien') h += '<div class="acrown" id="acrown" style="left:50%;top:50%">' + crownSVG(60) + '</div>';
  if (g.id === 'chung-mot-than' && g.star) h += '<div class="astar gold" id="cstar" style="left:' + PX(g.star.x) + '%;top:' + PY(g.star.y) + '%">★</div>';
  if (g.id === 'day-hop') {
    if (g.goal) h += '<div class="agoal" style="' + rectStyle(g.goal) + '">ĐÍCH</div>';
    if (g.walls) for (var wi = 0; wi < g.walls.length; wi++) h += '<div class="awallseg" style="' + rectStyle(g.walls[wi]) + '"></div>';
    h += '<div class="acrate" id="acrate" style="left:50%;top:50%">📦</div>';
  }
  if (g.id === 'da-bong' && g.ball) h += '<div class="sball" id="sball" style="left:' + ((g.ball.x + 19) / 38 * 100) + '%;top:' + ((g.ball.y + 9.6) / 19.2 * 100) + '%"></div>';
  if (g.id === 'chung-mot-than') {
    h += '<div class="ablob" id="sharedblob" style="left:50%;top:50%">' + sharedOrbSVG(v, 66) + '<div class="aname">CẢ ĐỘI</div></div>';
  } else if (g.id !== 'can-goc') {
    for (var i = 0; i < v.players.length; i++) {
      var p = v.players[i];
      if (g.id === 'den-lua-nuoc') { h += '<div class="achar" id="achar-' + p.seat + '" style="left:50%;top:50%">' + orbSVG(p.color, 52) + '<div class="aname">' + esc(p.name) + '</div></div>'; continue; }
      if (g.id === 'ech-op') { h += '<div class="afrog" id="afrog-' + p.seat + '" style="left:50%;top:50%">' + frogSVG(p.color, null) + '<div class="aname">' + esc(p.name) + '</div></div>'; continue; }
      if (g.id === 'nguoi-que') { h += '<div class="ablob" id="ablob-' + p.seat + '" style="left:50%;top:50%;color:' + COLORS[p.color] + '"><span id="fig-' + p.seat + '">' + orbSVG(p.color, 62) + '</span><div class="aname">' + esc(p.name) + '</div><div class="alives" id="alives-' + p.seat + '"></div><div id="dmg-' + p.seat + '"></div></div>'; continue; }
      if (g.id === 'xe-tank' || g.id === 'dat-bom') { h += '<div class="ablob" id="ablob-' + p.seat + '" style="left:50%;top:50%;color:' + COLORS[p.color] + '"><span class="orbwrap">' + orbSVG(p.color, 62) + '<span class="abarrel" id="barrel-' + p.seat + '"></span></span><div class="aname">' + esc(p.name) + '</div><div class="alives" id="alives-' + p.seat + '"></div></div>'; continue; }
      h += '<div class="ablob" id="ablob-' + p.seat + '" style="left:50%;top:50%;color:' + COLORS[p.color] + '">' + orbSVG(p.color, 62) + '<div class="aname">' + esc(p.name) + '</div><div class="alives" id="alives-' + p.seat + '"></div></div>';
    }
  }
  h += '</div>';
  return h;
}
function playerGame(v) {
  var g = v.game;
  var me = playerOf(v, S.seat);
  var h = '<div class="stage pstage g-' + g.id + (isActionGame(g.id) ? ' neon-stage' : '') + '">';
  if (g.phase === 'countdown') { h += '<div class="center baloo" style="font-size:26px">' + esc(g.name) + '</div>' + countdownHTML(g) + '</div>'; return h; }
  h += '<h2>' + esc(g.name) + (g.id === 'ma-soi' ? ' · Đêm ' + (g.night || g.round) : (g.id === 'ca-ngua' || g.id === 'tien-len') ? '' : ' · Vòng ' + g.round + '/' + g.totalRounds + (g.finalRound && !noX2(g.id) ? ' · ×2' : '')) + '</h2>';
  h += pfieldHTML(v, g);
  if (g.id === 'do-vui') {
    if (g.phase === 'question') {
      h += '<div class="baloo" style="font-size:22px">' + esc(g.question) + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - DUR['do-vui']) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.mine == null) {
        h += '<div class="optgrid">';
        for (var a = 0; a < 4; a++) h += '<button class="opt" data-cmd="answer" data-i="' + a + '">' + LETTERS[a] + '. ' + esc(g.options[a]) + '</button>';
        h += '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:26px">Đã trả lời! Đợi mọi người…</div>';
        if (g.myStreak >= 1) h += '<p class="center"><span class="chip hot">Chuỗi đúng ×' + (g.myStreak + 1) + ' đang chờ — đúng tiếp là cộng điểm chuỗi!</span></p>';
      }
    } else if (g.phase === 'reveal' && g.reveal) {
      var okAns = g.mine != null && g.mine === g.reveal.correct;
      h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, okAns ? 'reo' : 'buon', 100) + '</span>';
      h += '<div class="baloo" style="font-size:30px">' + (okAns ? 'ĐÚNG RỒI!' : 'Chưa đúng!') + '</div>';
      h += '<p>Đáp án đúng: <b>' + LETTERS[g.reveal.correct] + '. ' + esc(g.options[g.reveal.correct]) + '</b></p>';
      h += '<div class="baloo" style="font-size:24px">+' + fmt(g.reveal.points[S.seat] || 0) + ' điểm</div></div>';
    }
  } else if (g.id === 'day-ra' || g.id === 'ne-dan') {
    var myB = g.blobs ? g.blobs[S.seat] : null;
    if (g.phase === 'arena' || g.phase === 'dodge') {
      if (myB && !myB.alive) {
        h += '<div class="center"><div class="ko-big">K.O.!</div>' + orbSVG(me.color, 110, true) + '<div class="baloo" style="font-size:27px">Bạn đã bị loại!</div><p>Xem TV đợi kết quả nhé…</p></div>';
      } else {
        h += '<div class="center baloo" style="font-size:20px">Mạng của bạn: <span id="mylives" style="color:#FFD7DE">' + (myB ? '❤'.repeat(myB.lives) : '') + '</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'ĐẨY', 'Lướt') + '</div>';
        h += '<p class="center small">' + (g.id === 'ne-dan' ? 'Giữ D-pad để né đạn · B: lướt nhanh' : 'Giữ D-pad để di chuyển · A: đẩy đối thủ · B: lướt nhanh') + '</p>';
      }
    }
  } else if (g.id === 'cuop-sao' || g.id === 'giu-vuong-mien' || g.id === 'son-san') {
    if (g.phase === 'steal' || g.phase === 'crown' || g.phase === 'splat') {
      if (g.id === 'cuop-sao') {
        h += '<div class="center baloo" style="font-size:22px">Sao của bạn: ★ <span id="mybank">' + (g.mine || 0) + '</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'ĐẨY', 'Lướt') + '</div>';
        h += '<p class="center small">Bay qua sao là nhặt · A: xô mạnh, đối thủ rơi 1 sao · Sao lớn = 3 sao</p>';
      } else if (g.id === 'giu-vuong-mien') {
        var holderP = g.crown && g.crown.holder ? playerOf(v, g.crown.holder) : null;
        if (g.myCrown) h += '<div class="center baloo" style="font-size:23px;color:#FFC93D">👑 BẠN ĐANG GIỮ VƯƠNG MIỆN!</div>';
        else h += '<div class="center baloo" style="font-size:20px">' + (holderP ? 'Vương miện: ' + esc(holderP.name) + ' đang giữ' : 'Vương miện đang ở giữa sàn!') + '</div>';
        h += '<div class="center baloo" style="font-size:19px">Điểm giữ của bạn: <span id="myhold">' + (g.mine || 0) + '</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'ĐẨY', 'Lướt') + '</div>';
        h += '<p class="center small">Chạm vào vương miện là đội lên đầu · Giữ càng lâu càng nhiều điểm · A: xô người giữ cho rơi</p>';
      } else {
        h += '<div class="center baloo" style="font-size:22px">Ô của bạn: <span id="mycells">' + (g.mine || 0) + '</span>/180</div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'SƠN', 'Lướt') + '</div>';
        h += '<p class="center small">Chạy qua ô nào sơn ô đó · A: sơn bùng 3×3 (hồi 2 giây) · B: lướt nhanh</p>';
      }
    }
  } else if (g.id === 'cao-boi') {
    if (g.phase === 'wait') {
      if (g.mine === 'foul') h += '<div class="center"><div class="baloo" style="font-size:30px">KẸT SÚNG!</div><p>Bạn bắn trước hiệu lệnh — bị khoá và −100 điểm vòng này. Đợi vòng sau nhé.</p></div>';
      else h += '<button class="tapbtn wait" data-cmd="tap">ĐỢI…<br><span style="font-size:17px">Nghe hiệu lệnh BẮN!</span></button>';
    } else if (g.phase === 'go') {
      if (g.mine === 'fired') h += '<div class="center baloo" style="font-size:30px">ĐÃ BẮN! Đợi kết quả…</div>';
      else h += '<button class="tapbtn go" data-cmd="tap">BẮN!</button>';
    } else if (g.phase === 'roundEnd' && g.lastRound) {
      var e2 = null; for (var qI2 = 0; qI2 < g.lastRound.entries.length; qI2++) if (g.lastRound.entries[qI2].seat === S.seat) e2 = g.lastRound.entries[qI2];
      if (e2) {
        h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, e2.points > 0 ? 'reo' : 'buon', 100) + '</span>';
        h += '<div class="baloo" style="font-size:28px">' + (e2.status === 'fired' ? 'Bạn bắn trong ' + e2.reactionMs + ' ms — nhanh thứ ' + e2.order + '!' : e2.status === 'foul' ? 'Phạm quy! Bắn quá sớm' : 'Bạn chưa bắn') + '</div>';
        h += '<div class="baloo" style="font-size:24px">' + (e2.points > 0 ? '+' : '') + fmt(e2.points) + ' điểm</div></div>';
      }
    }
  } else if (g.id === 'keo-co') {
    var myTeam = S.seat % 2 === 1 ? 'A' : 'B';
    if (g.phase === 'pull') {
      h += '<div class="center baloo" style="font-size:24px">BẠN Ở ĐỘI ' + myTeam + ' — BẤM NÚT B LIÊN TỤC!</div>';
      var kpct2 = Math.max(3, Math.min(97, 50 + (g.knot / 112) * 46));
      h += '<div class="rope"><div class="mid"></div><div class="knot" id="tugknot" style="left:' + kpct2 + '%"></div></div>';
      h += '<div class="center baloo" style="font-size:21px">Bạn đã kéo: <span id="mypull">' + (g.presses ? (g.presses[S.seat] || 0) : 0) + '</span> lần</div>';
      h += '<div class="padwrap">' + discHTML()
        + '<div class="abtns"><button class="abtn" data-pad="b" style="background:#E84F4F;width:92px;height:92px;font-size:30px">B<span>KÉO!</span></button></div></div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'chia-cuop') {
    var inPair = g.pair && g.pair.indexOf(S.seat) >= 0;
    var foeSeat = inPair ? g.pair[g.pair[0] === S.seat ? 1 : 0] : null;
    var foe = foeSeat ? playerOf(v, foeSeat) : null;
    if (g.phase === 'talk') {
      h += '<div class="center baloo" style="font-size:23px">Nồi ' + fmt(g.pot || 400) + ' điểm' + (g.finalRound ? ' · VÒNG CUỐI ×2' : '') + '</div>';
      if (g.chat) for (var pI = 0; pI < g.chat.length; pI++) { var pp2 = playerOf(v, g.chat[pI].seat); h += '<div class="chatrow">' + blobSVG(pp2 ? pp2.color : 'blue', 'cuoi', 24) + ' <b>' + esc(pp2 ? pp2.name : '') + ':</b> ' + esc(g.chat[pI].text) + '</div>'; }
      if (inPair) {
        h += '<p class="center">Bạn đấu với <b>' + esc(foe ? foe.name : '') + '</b>. Nói gì cũng được — lát nữa chọn mới là thật!</p>';
        h += '<p class="center"><input type="text" id="chatText" maxlength="60" placeholder="Lời thương lượng…" style="width:min(70vw,300px)"> <button class="btn small blue" data-cmd="chatSend">Gửi</button></p>';
      } else {
        var w1 = g.pair ? playerOf(v, g.pair[0]) : null; var w2 = g.pair ? playerOf(v, g.pair[1]) : null;
        h += '<p class="center">Vòng này ' + esc(w1 ? w1.name : '') + ' và ' + esc(w2 ? w2.name : '') + ' thương lượng — bạn ngồi ngoài xem.</p>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 60000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'choose') {
      if (!inPair) {
        h += '<div class="center baloo" style="font-size:25px">Hai người kia đang chọn bí mật…</div><p class="center">Xem TV đoán thử ai sẽ cướp!</p>';
      } else if (g.mineChosen) {
        h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, 'ngacnhien', 100) + '</span><div class="baloo" style="font-size:26px">Đã khoá lựa chọn!</div><p>Bí mật đến phút công bố — đợi đối thủ…</p></div>';
      } else {
        h += '<div class="center baloo" style="font-size:25px">CHỌN BÍ MẬT ĐI!</div>';
        h += '<p class="center">Cả hai CHIA: mỗi người một nửa nồi · Một người CƯỚP: cướp hết · Cả hai CƯỚP: mất trắng!</p>';
        h += '<p class="center"><button class="btn green" data-cmd="choose" data-c="chia" style="font-size:23px">X · CHIA</button></p>';
        h += '<p class="center"><button class="btn pink" data-cmd="choose" data-c="cuop" style="font-size:23px">B · CƯỚP</button></p>';
        h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 15000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      }
    } else if (g.phase === 'reveal' && g.reveal) {
      var myE2 = null; for (var qI = 0; qI < g.reveal.entries.length; qI++) if (g.reveal.entries[qI].seat === S.seat) myE2 = g.reveal.entries[qI];
      h += '<div class="center"><span class="blobbob">' + orbSVG(me.color, 100, !!(myE2 && myE2.points <= 0)) + '</span>';
      if (myE2) h += '<div class="baloo" style="font-size:27px">Bạn đã ' + (myE2.choice === 'cuop' ? 'CƯỚP' : 'CHIA') + ' · +' + fmt(myE2.points) + ' điểm</div>';
      else h += '<div class="baloo" style="font-size:25px">Xem kết quả trên TV!</div>';
      h += '</div>';
    }
  } else if (g.id === 'chung-mot-than') {
    if (g.phase === 'shared') {
      var arrowOf = { u: '▲', r: '▶', d: '▼', l: '◀' };
      h += '<div class="center baloo" style="font-size:21px">⭐ Đội: <span id="checknp">' + (g.checks || 0) + '</span> điểm · Tim: <span id="teamheartsp" style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span></div>';
      h += '<div class="mydirs">Bạn giữ:';
      var md = g.myDirs || [];
      for (var dI4 = 0; dI4 < md.length; dI4++) h += '<span class="dirarrow">' + arrowOf[md[dI4]] + '</span>';
      h += '</div>';
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'Đẩy', 'Lướt') + '</div>';
      h += '<p class="center small">Cả đội lái CHUNG một quả bóng — chỉ hướng của bạn mới chạy theo tay bạn. Phối hợp đưa bóng chạm sao ⭐, né đạn!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - 60000) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'day-hop') {
    if (g.phase === 'box') {
      h += '<div class="center baloo" style="font-size:22px">📦 Đội đã giao: <span id="delivp">' + (g.deliveries || 0) + '</span> hộp</div>';
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'Đẩy', 'Lướt') + '</div>';
      h += '<p class="center small">Cùng một đồng đội áp sát hộp và đẩy cùng một hướng — một người đẩy hộp không đi đâu cả!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'cheo-thuyen') {
    if (g.phase === 'row') {
      h += '<div class="center baloo" style="font-size:22px">Nhịp <span id="rowbeatm">' + (g.beat || 1) + '</span>/' + (g.beats || 45) + ' · Thuyền đã đi <span id="rowdistm">' + Math.round(g.distance || 0) + '</span>/' + (g.course || 400) + ' m</div>';
      h += '<div class="racebar"><i id="rowprogm" style="background:#38BDF8;width:0%"></i><b>Về đích 🏁</b></div>';
      h += '<button class="tapbtn rowbtn" id="rowbtn" data-cmd="tap">CHÈO!<br><span style="font-size:17px">Bấm khi nút cháy VÀNG = đúng nhịp</span></button>';
      h += '<div class="center baloo" style="font-size:20px">Bạn trúng nhịp: <span id="rowhits">' + (g.mine || 0) + '</span> · Trượt (tạt nước): <span id="rowsplash">' + (g.mySplash || 0) + '</span></div>';
      h += '<div class="tbar"><i data-start="' + g.rowStart + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'xe-tank' || g.id === 'dat-bom' || g.id === 'thu-thanh') {
    var myB2 = g.blobs ? g.blobs[S.seat] : null;
    if (g.phase === 'tank' || g.phase === 'bomber' || g.phase === 'defend') {
      if (myB2 && !myB2.alive) {
        h += '<div class="center"><div class="ko-big">K.O.!</div>' + orbSVG(me.color, 110, true) + '<div class="baloo" style="font-size:27px">Bạn đã bị loại!</div><p>Xem TV đợi kết quả nhé…</p></div>';
      } else {
        if (g.id === 'thu-thanh') h += '<div class="center baloo" style="font-size:20px">💎 Pha lê: <span id="crystalhp2">' + (g.crystal ? g.crystal.hp : 10) + '</span>/10 · Đã hạ: <span id="killn2">' + (g.kills || 0) + '</span> slime</div>';
        else h += '<div class="center baloo" style="font-size:20px">Mạng của bạn: <span id="mylives" style="color:#FFD7DE">' + (myB2 ? '❤'.repeat(myB2.lives) : '') + '</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, (g.id === 'dat-bom' ? 'ĐẶT BOM' : 'BẮN'), 'Lướt') + '</div>';
        h += '<p class="center small">' + (g.id === 'xe-tank' ? 'Nòng súng hướng theo hướng di chuyển cuối · A: bắn (hồi 1 giây) · Núp sau thùng chắn' : g.id === 'dat-bom' ? 'A: đặt bom (mỗi người 1 quả một lúc) · Bom nổ sau 2 giây theo hình chữ thập — đặt xong chạy ngay!' : 'Bắn slime trước khi chúng chạm vào pha lê · Nòng súng hướng theo hướng di chuyển cuối') + '</p>';
      }
    }
  } else if (g.id === 'ke-gia-mao') {
    if (g.phase === 'answer') {
      h += '<div class="center"><span class="chip cool">Chủ đề: ' + esc(g.category || '') + '</span></div>';
      h += '<div class="baloo" style="font-size:22px">' + esc(g.myQuestion || '') + '</div>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.mine == null) {
        h += '<div class="optgrid">';
        for (var a2 = 0; a2 < 4; a2++) h += '<button class="opt" data-cmd="answer" data-i="' + a2 + '">' + LETTERS[a2] + '. ' + esc(g.options[a2]) + '</button>';
        h += '</div>';
        h += '<p class="center small">Trả lời bí mật — đừng đọc to câu hỏi hay đáp án của bạn!</p>';
      } else {
        h += '<div class="center baloo" style="font-size:26px">Đã trả lời! Đợi mọi người…</div>';
      }
    } else if (g.phase === 'discuss') {
      h += '<div class="baloo" style="font-size:22px">Bàn luận: ai đang giả vờ?</div>';
      if (g.chatLog) for (var pI6 = 0; pI6 < g.chatLog.length; pI6++) { var pp6 = playerOf(v, g.chatLog[pI6].seat); h += '<div class="chatrow">' + blobSVG(pp6 ? pp6.color : 'blue', 'cuoi', 24) + ' <b>' + esc(pp6 ? pp6.name : '') + ':</b> ' + esc(g.chatLog[pI6].text) + '</div>'; }
      h += '<p class="center"><input type="text" id="chatText" maxlength="60" placeholder="Nói gì đó…" style="width:min(70vw,300px)"> <button class="btn small blue" data-cmd="chatSend">Gửi</button></p>';
      h += '<p class="center small">Đừng lộ đáp án của bạn — kẻ giả mạo đang nghe đấy!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 45000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'vote') {
      if (g.myVote == null) {
        h += '<div class="baloo" style="font-size:23px">Bạn tố cáo ai là kẻ giả mạo?</div>';
        h += '<div class="optgrid">';
        for (var vI3 = 0; vI3 < v.players.length; vI3++) { var vp4 = v.players[vI3]; if (vp4.seat === S.seat) continue; h += '<button class="opt" data-cmd="vote" data-i="' + vp4.seat + '">' + esc(vp4.name) + '</button>'; }
        h += '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:26px">Đã tố cáo! Đợi công bố…</div>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 20000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'reveal' && g.reveal) {
      var rv2 = g.reveal; var iAmImp = rv2.impostor === S.seat;
      var iWon = (rv2.caught && !iAmImp) || (!rv2.caught && iAmImp);
      h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, iWon ? 'reo' : 'buon', 100) + '</span>';
      h += '<div class="baloo" style="font-size:27px">' + (rv2.caught ? 'Bắt được kẻ giả mạo!' : 'Kẻ giả mạo đã thoát!') + '</div>';
      var impP = playerOf(v, rv2.impostor);
      h += '<p>Kẻ giả mạo: <b>' + esc(impP ? impP.name : '') + '</b>' + (iAmImp ? ' — chính là BẠN!' : '') + '</p>';
      h += '<div class="baloo" style="font-size:24px">+' + fmt(rv2.points[S.seat] || 0) + ' điểm</div></div>';
    }
  } else if (g.id === 'giai-ma-chung') {
    if (g.phase === 'decode' || g.phase === 'levelup') {
      h += '<div class="center baloo" style="font-size:21px">Màn ' + (g.level || 1) + ' · Tim đội: <span style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span> · Đã qua ' + (g.levelsDone || 0) + ' màn</div>';
      h += '<div class="center baloo" style="font-size:20px">Tiến độ màn này: ' + (g.done || 0) + '/' + (g.total || 0) + ' bước</div>';
      if (g.phase === 'levelup') h += '<div class="center baloo" style="font-size:26px">QUA MÀN! 🎉</div>';
      h += '<div class="center"><b>Phần mật mã của bạn:</b><br>';
      var ms = g.mySteps || [];
      if (!ms.length) h += '<span class="mystep">Màn này bạn không giữ bước nào — cổ vũ đồng đội nhé!</span>';
      for (var sI6 = 0; sI6 < ms.length; sI6++) h += '<span class="mystep">Bước ' + ms[sI6].pos + ': <span style="color:' + SYMCOLORS[ms[sI6].sym] + '">' + ms[sI6].name + '</span></span>';
      h += '</div>';
      h += '<div class="symgrid">';
      for (var yI = 0; yI < 4; yI++) h += '<button class="symbtn" data-cmd="symbol" data-i="' + yI + '" style="background:' + SYMCOLORS[yI] + '">' + SYMNAMES[yI] + '</button>';
      h += '</div>';
      h += '<p class="center small">Chỉ bấm khi tới lượt bước của bạn và đúng ký hiệu của bước đó — bấm sai cả đội mất 1 tim!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 75000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'nguoi-que') {
    var myF = g.blobs ? g.blobs[S.seat] : null;
    if (g.phase === 'fight') {
      if (myF && !myF.alive) {
        h += '<div class="center"><div class="ko-big">K.O.!</div>' + orbSVG(me.color, 110, true) + '<div class="baloo" style="font-size:27px">Bạn đã bị loại!</div><p>Xem TV đợi kết quả nhé…</p></div>';
      } else {
        h += '<div class="center baloo" style="font-size:20px">Mạng: <span id="mylives" style="color:#FFD7DE">' + (myF ? '♥'.repeat(Math.max(0, myF.lives)) : '') + '</span> · Sát thương: <span id="mydmg">' + (g.myDmg || 0) + '%</span></div>';
        h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'ĐÁNH', 'LƯỚT') + '</div>';
        h += '<p class="center small">▲ hoặc Y: nhảy (nhấn 2 lần = nhảy đôi) · A: đánh — đối thủ % càng cao càng văng xa · X: ĐÁNH MẠNH (+16%, văng xa gấp rưỡi, hồi chiêu lâu hơn) · B: lướt · Bị đánh văng khỏi sàn thì về điểm hồi sinh trên bục cao.</p>';
        h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 90000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      }
    }
  } else if (g.id === 'den-lua-nuoc') {
    var myC = g.chars ? g.chars[S.seat] : null;
    if (g.phase === 'temple') {
      h += '<div class="center baloo" style="font-size:21px">Bạn là: ' + (g.myEl === 'lua' ? '🔥 LỬA' : '💧 NƯỚC') + '</div>';
      h += '<div class="center baloo" style="font-size:19px">Tim đội: <span id="tempheartsp" style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span> · 🔥 <span id="gemluap">' + (g.gemCount ? g.gemCount.lua : 0) + '</span>/5 · 💧 <span id="gemnuocp">' + (g.gemCount ? g.gemCount.nuoc : 0) + '</span>/5</div>';
      if (g.myHome) h += '<div class="center baloo" style="font-size:24px">🏠 Bạn đã về nhà! Đợi đồng đội…</div>';
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'NHẢY', '—') + '</div>';
      h += '<p class="center small">' + (g.myEl === 'lua' ? 'Bạn là LỬA: hồ đỏ an toàn, hồ xanh dương chết, hồ xanh lá chết! Chỉ bạn nhặt được ngọc đỏ.' : 'Bạn là NƯỚC: hồ xanh dương an toàn, hồ đỏ chết, hồ xanh lá chết! Chỉ bạn nhặt được ngọc xanh.') + ' Đứng lên nút vàng để mở cổng cho đồng đội. A hoặc Y: nhảy.</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 150000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'ma-soi') {
    var roleName = WOLF_ROLE_NAMES[g.myRole] || '';
    h += '<div class="center"><span class="chip ' + (g.myRole === 'soi' ? 'hot' : 'cool') + '" style="font-size:17px">Vai của bạn: ' + roleName + '</span></div>';
    if (!g.myAlive) {
      h += '<div class="center"><div class="ko-big">💀</div><div class="baloo" style="font-size:26px">Bạn đã chết — theo dõi tiếp nhé!</div><p>Xem mọi người bàn luận và bỏ phiếu trên TV. Vai của bạn sẽ được công bố khi game kết thúc.</p></div>';
    } else if (g.phase === 'night') {
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 45000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      if (g.myRole === 'soi') {
        h += '<div class="center baloo" style="font-size:21px">🐺 Bầy sói: ' + (g.wolfTeam || []).map(function (s2) { var wp2 = playerOf(v, s2); return esc(wp2 ? wp2.name : ''); }).join(', ') + '</div>';
        if (g.myWolfVote == null) {
          h += '<div class="baloo" style="font-size:21px">Chọn con mồi đêm nay:</div><div class="optgrid">';
          for (var wv = 0; wv < v.players.length; wv++) { var wvp = v.players[wv]; if (wvp.seat === S.seat || (g.aliveMap && !g.aliveMap[wvp.seat])) continue; var isMate = (g.wolfTeam || []).indexOf(wvp.seat) >= 0; h += '<button class="opt" data-cmd="wolfPick" data-kind="wolfVote" data-i="' + wvp.seat + '">' + esc(wvp.name) + (isMate ? ' 🐺 (đồng đội)' : '') + '</button>'; }
          h += '</div>';
        } else {
          var vt = playerOf(v, g.myWolfVote);
          h += '<div class="center baloo" style="font-size:23px">Đã chọn con mồi: ' + esc(vt ? vt.name : '') + '<br><span style="font-size:18px">Phiếu sói đã vào: ' + (g.wolfVotesIn || 0) + '/' + (g.wolfTeam || []).length + '</span></div>';
        }
      } else if (g.myRole === 'bao-ve') {
        if (g.myGuardPick == null) {
          h += '<div class="baloo" style="font-size:21px">Đêm nay bạn bảo vệ ai? (được bảo vệ chính mình; không trùng người đêm qua)</div><div class="optgrid">';
          for (var gv = 0; gv < v.players.length; gv++) { var gvp = v.players[gv]; if (g.aliveMap && !g.aliveMap[gvp.seat]) continue; var wasLast = g.myGuardLast === gvp.seat; h += '<button class="opt" data-cmd="wolfPick" data-kind="wolfGuard" data-i="' + gvp.seat + '"' + (wasLast ? ' disabled style="opacity:.45"' : '') + '>' + esc(gvp.name) + (gvp.seat === S.seat ? ' (bạn)' : '') + (wasLast ? ' · đêm qua đã bảo vệ' : '') + '</button>'; }
          h += '</div>';
        } else { var gp6 = playerOf(v, g.myGuardPick); h += '<div class="center baloo" style="font-size:23px">🛡️ Đang bảo vệ: ' + esc(gp6 ? gp6.name : '') + '</div>'; }
      } else if (g.myRole === 'tien-tri') {
        if (g.mySeerPick == null) {
          h += '<div class="baloo" style="font-size:21px">Đêm nay bạn soi ai?</div><div class="optgrid">';
          for (var sv2 = 0; sv2 < v.players.length; sv2++) { var svp = v.players[sv2]; if (svp.seat === S.seat || (g.aliveMap && !g.aliveMap[svp.seat])) continue; h += '<button class="opt" data-cmd="wolfPick" data-kind="wolfSeer" data-i="' + svp.seat + '">' + esc(svp.name) + '</button>'; }
          h += '</div>';
        } else { var sp7 = playerOf(v, g.mySeerPick); var seenWolf = (g.mySeerNotes || []).some(function (n2) { return n2.seat === g.mySeerPick && n2.wolf; }); h += '<div class="center baloo" style="font-size:23px">🔮 ' + esc(sp7 ? sp7.name : '') + (seenWolf ? ' LÀ SÓI! 🐺' : ' là dân lành ✅') + '</div>'; }
        if (g.mySeerNotes && g.mySeerNotes.length) {
          h += '<div class="rows"><div class="baloo" style="font-size:19px">📖 Sổ tay tiên tri (chỉ mình bạn thấy):</div>';
          for (var sn = 0; sn < g.mySeerNotes.length; sn++) { var np4 = playerOf(v, g.mySeerNotes[sn].seat); h += '<div class="rrow">' + blobSVG(np4 ? np4.color : 'blue', 'cuoi', 28) + ' ' + esc(np4 ? np4.name : '') + '<span class="pts">' + (g.mySeerNotes[sn].wolf ? '🐺 SÓI' : '✅ dân') + '</span></div>'; }
          h += '</div>';
        }
      } else if (g.myRole === 'phu-thuy') {
        if (g.myWitchDone) {
          h += '<div class="center baloo" style="font-size:23px">🧙 Đã quyết định xong — đi ngủ thôi!</div>';
        } else if (!g.wolvesIn) {
          h += '<div class="center baloo" style="font-size:22px">🧙 Đợi bầy sói chọn xong con mồi…</div><p class="center">Thuốc của bạn: 🧪 cứu ×' + (g.mySaveLeft || 0) + ' · ☠️ độc ×' + (g.myPoisonLeft || 0) + '</p>';
        } else {
          var vic = g.myVictim ? playerOf(v, g.myVictim) : null;
          h += '<div class="center baloo" style="font-size:22px">Con mồi của sói đêm nay: ' + (vic ? esc(vic.name) : '—') + (g.myVictim === S.seat ? ' (CHÍNH LÀ BẠN!)' : '') + '</div>';
          if (g.mySaveLeft > 0) h += '<p class="center"><button class="btn ' + (g.myWitchSave ? 'green' : 'ghost') + '" data-cmd="witchSave">' + (g.myWitchSave ? '🧪 ĐÃ CHỌN CỨU — bấm để huỷ' : '🧪 Dùng thuốc cứu người này') + '</button></p>';
          else h += '<p class="center muted">Thuốc cứu đã dùng hết.</p>';
          if (g.myPoisonLeft > 0) {
            h += '<div class="baloo" style="font-size:20px">☠️ Đầu độc ai? ' + (g.myWitchPoison ? '(đang chọn: ' + esc((playerOf(v, g.myWitchPoison) || {}).name || '') + ')' : '(chưa chọn)') + '</div><div class="optgrid">';
            for (var pv2 = 0; pv2 < v.players.length; pv2++) { var pvp = v.players[pv2]; if (pvp.seat === S.seat || (g.aliveMap && !g.aliveMap[pvp.seat])) continue; h += '<button class="opt" data-cmd="wolfPick" data-kind="wolfPoison" data-i="' + pvp.seat + '">' + esc(pvp.name) + '</button>'; }
            h += '</div>';
            if (g.myWitchPoison) h += '<p class="center"><button class="btn small ghost" data-cmd="witchPoisonClear">Bỏ chọn đầu độc</button></p>';
          } else h += '<p class="center muted">Thuốc độc đã dùng hết.</p>';
          h += '<p class="center"><button class="btn pink" data-cmd="witchDone" style="font-size:21px">Xác nhận — đi ngủ</button></p>';
        }
      } else {
        h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, 'ngu', 100) + '</span><div class="baloo" style="font-size:24px">Bạn là dân làng — ngủ ngon nhé…</div><p>Đợi trời sáng trên TV.</p></div>';
      }
    } else if (g.phase === 'dawn') {
      if (g.dawnDeaths && g.dawnDeaths.length) {
        h += '<div class="center baloo" style="font-size:24px">☀️ Đêm qua làng mất: ' + g.dawnDeaths.map(function (d3) { var dp6 = playerOf(v, d3.seat); return esc(dp6 ? dp6.name : ''); }).join(', ') + '</div>';
      } else h += '<div class="center baloo" style="font-size:24px">☀️ Đêm qua bình yên — không ai ra đi!</div>';
    } else if (g.phase === 'discuss') {
      h += '<div class="baloo" style="font-size:21px">Bàn luận: ai là sói?</div>';
      if (g.chatLog) for (var pI7 = 0; pI7 < g.chatLog.length; pI7++) { var pp7 = playerOf(v, g.chatLog[pI7].seat); h += '<div class="chatrow">' + blobSVG(pp7 ? pp7.color : 'blue', 'cuoi', 24) + ' <b>' + esc(pp7 ? pp7.name : '') + ':</b> ' + esc(g.chatLog[pI7].text) + '</div>'; }
      h += '<p class="center"><input type="text" id="chatText" maxlength="60" placeholder="Nói gì đó…" style="width:min(70vw,300px)"> <button class="btn small blue" data-cmd="chatSend">Gửi</button></p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 60000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'vote') {
      if (g.voted && g.voted[S.seat]) {
        h += '<div class="center baloo" style="font-size:25px">Đã bỏ phiếu! Đợi kết quả…</div>';
      } else {
        h += '<div class="baloo" style="font-size:22px">Treo cổ ai? Chọn một người bạn nghi là sói:</div><div class="optgrid">';
        for (var vv = 0; vv < v.players.length; vv++) { var vvp = v.players[vv]; if (vvp.seat === S.seat || (g.aliveMap && !g.aliveMap[vvp.seat])) continue; h += '<button class="opt" data-cmd="vote" data-i="' + vvp.seat + '">' + esc(vvp.name) + '</button>'; }
        h += '</div>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.phase === 'execute') {
      if (g.exec && g.exec.seat) { var ep3 = playerOf(v, g.exec.seat); h += '<div class="center baloo" style="font-size:25px">⚖️ ' + esc(ep3 ? ep3.name : '') + ' bị treo cổ — là ' + (WOLF_ROLE_NAMES[g.exec.role] || '') + '</div>'; }
      else h += '<div class="center baloo" style="font-size:24px">⚖️ Hôm nay không ai bị treo cổ.</div>';
    } else if (g.phase === 'wolfEnd') {
      var iWon2 = (g.winner === 'soi') === (g.myRole === 'soi');
      h += '<div class="center"><span class="blobbob">' + blobSVG(me.color, iWon2 ? 'reo' : 'buon', 100) + '</span>';
      h += '<div class="baloo" style="font-size:27px">' + (g.winner === 'soi' ? '🐺 Bầy sói thắng!' : '🎉 Dân làng thắng!') + '</div>';
      h += '<p>Bạn là ' + roleName + ' · +' + fmt(g.points[S.seat] || 0) + ' điểm</p>';
      if (g.roles) { h += '<div class="rows">'; for (var wr2 = 0; wr2 < v.players.length; wr2++) { var wrp = v.players[wr2]; h += '<div class="rrow">' + blobSVG(wrp.color, wrp.mood, 30) + ' ' + esc(wrp.name) + '<span class="chip ' + (g.roles[wrp.seat] === 'soi' ? 'hot' : 'cool') + '">' + (WOLF_ROLE_NAMES[g.roles[wrp.seat]] || '') + '</span></div>'; } h += '</div>'; }
      h += '</div>';
    }
  } else if (g.id === 'ca-ngua') {
    var myHs = g.horses ? (g.horses[S.seat] || []) : [];
    var turnP2 = g.turn ? playerOf(v, g.turn) : null;
    if (g.phase === 'ngWin') {
      var winP2 = g.winner ? playerOf(v, g.winner) : null;
      h += '<div class="center"><div class="baloo" style="font-size:27px">🏆 ' + esc(winP2 ? winP2.name : '') + ' thắng!</div><p>Bạn về hạng theo tiến độ — xem bảng điểm trên TV nhé.</p></div>';
    } else if (g.myTurn && g.phase === 'roll') {
      h += '<div class="center baloo" style="font-size:25px">🎲 LƯỢT CỦA BẠN!</div>';
      h += '<p class="center"><button class="btn pink" data-cmd="roll" style="font-size:26px;padding:18px 34px">THẢY XÚC XẮC</button></p>';
      h += '<p class="center small">Thảy 6 để xuất chuồng và được thảy tiếp · Ba lần 6 liên tiếp là mất lượt!</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else if (g.myTurn && g.phase === 'pick') {
      h += '<div class="center baloo" style="font-size:24px">Bạn thảy được: <span class="diceface">' + DICE_FACES[g.dice] + '</span> ' + g.dice + ' chấm</div>';
      if (g.myLegal && g.myLegal.length) {
        h += '<div class="baloo" style="font-size:21px">Chọn ngựa để đi:</div><div class="optgrid">';
        for (var ml = 0; ml < g.myLegal.length; ml++) { var mle = g.myLegal[ml]; h += '<button class="opt" data-cmd="move" data-i="' + mle.horse + '">🐴 Ngựa ' + (mle.horse + 1) + '<br><span style="font-size:16px">' + esc(mle.hint) + '</span></button>'; }
        h += '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:22px">Không có nước đi nào — đợi qua lượt…</div>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else {
      h += '<div class="center baloo" style="font-size:22px">Lượt của ' + esc(turnP2 ? turnP2.name : '') + (g.dice ? ' · vừa thảy ' + DICE_FACES[g.dice] : '') + '</div>';
      h += '<div class="rows">';
      for (var mh = 0; mh < myHs.length; mh++) h += '<div class="rrow">🐴 Ngựa ' + (mh + 1) + '<span class="muted">' + (myHs[mh] === 0 ? 'đang trong chuồng' : myHs[mh] === 58 ? 'ĐÃ VỀ ĐÍCH 🏆' : myHs[mh] >= 52 ? 'đường về chuồng ' + (myHs[mh] - 51) + '/6' : 'ô ' + myHs[mh] + '/51') + '</span></div>';
      h += '</div>';
      h += '<p class="center">Xem bàn cờ trên TV nhé!</p>';
    }
  } else if (g.id === 'tien-len') {
    if (!S.tlSel) S.tlSel = [];
    var hand9 = g.myHand || [];
    var hsig = hand9.join(',');
    if (S.tlSig !== hsig) { S.tlSig = hsig; S.tlSel = []; }
    var turnP9 = g.turn ? playerOf(v, g.turn) : null;
    if (g.phase === 'tlWin') {
      var winP9 = g.winner ? playerOf(v, g.winner) : null;
      h += '<div class="center"><div class="baloo" style="font-size:27px">🏆 ' + esc(winP9 ? winP9.name : '') + ' thắng!</div>'
        + (g.instantWin ? '<p class="baloo" style="font-size:20px;color:#FFC93D">⚡ TỚI TRẮNG — ' + (TL_IW_NAMES[g.instantWin.kind] || '') + '!</p>' : '')
        + (g.myRank ? '<p>Bạn về hạng ' + g.myRank + ' · +' + fmt(g.points[S.seat] || 0) + ' điểm</p>' : '')
        + '<p>Xem bảng điểm trên TV nhé.</p></div>';
    } else if (g.phase === 'cards') {
      if (g.table) {
        var tabP9 = playerOf(v, g.table.seat);
        h += '<div class="center baloo" style="font-size:18px">Trên bàn — ' + esc(tabP9 ? tabP9.name : '') + ' · ' + (TL_KIND_NAMES[g.table.kind] || '') + '</div>';
        h += '<div class="tlchips">' + tlChipsHTML(g.table.cards, true) + '</div>';
      } else {
        h += '<div class="center baloo" style="font-size:18px">🃏 Bàn trống</div>';
      }
      if (g.myRank) {
        h += '<div class="center baloo" style="font-size:24px">🏆 Bạn đã hết bài — về hạng ' + g.myRank + '!</div><p class="center">Xem mọi người đánh tiếp trên TV nhé…</p>';
      } else {
        if (g.myTurn) {
          h += '<div class="center baloo" style="font-size:22px">' + (g.table ? '⚔️ LƯỢT CỦA BẠN — chọn bài để CHẶN!' : '👑 LƯỢT CỦA BẠN — bạn cầm cái, chọn bài để đánh!') + '</div>';
          if (g.mustInclude3) h += '<p class="center"><span class="chip hot">Lượt đầu tiên của trận: bộ bạn đánh phải có lá 3♠!</span></p>';
        } else if (g.myPassed) {
          h += '<div class="center baloo" style="font-size:20px">✋ Bạn đã bỏ lượt vòng này — đợi vòng mới…</div>';
        } else {
          h += '<div class="center baloo" style="font-size:20px">Lượt của ' + esc(turnP9 ? turnP9.name : '') + ' — chuẩn bị bài của bạn…</div>';
        }
        h += tlHandHTML(hand9, S.tlSel, 'tl');
        h += tlBtnsHTML(g, S.tlSel, 'tl');
        h += '<p class="center small">Chạm vào lá bài để chọn / bỏ chọn — lá được chọn sẽ nhô lên. Bộ không hợp lệ sẽ bị báo lỗi và lựa chọn của bạn vẫn được giữ nguyên.</p>';
      }
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
      h += '<div class="scorebar">';
      for (var sI9 = 0; sI9 < v.players.length; sI9++) { var sp9 = v.players[sI9]; h += '<span class="scorechip">' + blobSVG(sp9.color, sp9.mood, 24) + ' ' + esc(sp9.name) + ' · 🂠 × ' + (g.counts ? (g.counts[sp9.seat] || 0) : 0) + ((g.finished || []).indexOf(sp9.seat) >= 0 ? ' 🏆' : '') + '</span>'; }
      h += '</div>';
    }
  } else if (g.id === 'da-bong') {
    var sbp = g.scoreboard || { do: 0, xanh: 0 };
    h += '<div class="center baloo" style="font-size:21px">Bạn: ' + (g.myTeam === 'do' ? '🔴 ĐỘI ĐỎ' : '🔵 ĐỘI XANH') + ' · Đỏ ' + sbp.do + ' — ' + sbp.xanh + ' Xanh</div>';
    if (g.phase === 'goal') {
      h += '<div class="center baloo" style="font-size:30px">⚽ GÔÔÔL! ' + (g.goalInfo && g.goalInfo.team === 'do' ? '🔴' : '🔵') + '</div><p class="center">Đá lại từ giữa sân sau vài giây…</p>';
    } else if (g.phase === 'soccer') {
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'SÚT', 'LƯỚT') + '</div>';
      h += '<p class="center small">Chạy theo bóng, đến gần thì A = SÚT về phía bạn đang quay mặt (giữ ▲ khi bấm A = sút bổng, ▼ = sút sệt) · ▲/Y = nhảy đánh đầu · B = lướt.</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 90000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'ech-op') {
    h += '<div class="center baloo" style="font-size:20px">Màn ' + (g.chamber || 1) + '/' + (g.chambersTotal || 3) + ' · Tim đội: <span id="frogheartsp" style="color:#FFD7DE">' + '❤'.repeat(Math.max(0, g.hearts || 0)) + '</span> · 🪰 <span id="frogfliesp">' + (g.fliesEaten || 0) + '</span>/' + (g.fliesTotal || 9) + '</div>';
    if (g.phase === 'frogClear') {
      h += '<div class="center baloo" style="font-size:27px">🎉 QUA MÀN! Chuẩn bị…</div>';
    } else if (g.myState === 'in') {
      var carrierP = g.myCarrierSeat ? playerOf(v, g.myCarrierSeat) : null;
      h += '<div class="center"><div class="baloo" style="font-size:25px">🫃 Bạn đang trong bụng ' + esc(carrierP ? carrierP.name : '') + '!</div><p>Đồng đội đang vác bạn qua đoạn khó — thả bạn ra ở bờ an toàn ngay thôi.</p></div>';
    } else {
      if (g.myState === 'carry') {
        var pasP = g.myPassengerSeat ? playerOf(v, g.myPassengerSeat) : null;
        h += '<div class="center baloo" style="font-size:22px">🫃 Đang vác ' + esc(pasP ? pasP.name : '') + ' trong bụng — bạn nhảy cao và xa hơn hẳn! Bấm B/X để nhả bạn ra.</div>';
      } else if (g.myDoor) {
        h += '<div class="center baloo" style="font-size:23px">🚪 Bạn đã vào cửa! Đợi cả đội…</div>';
      }
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'NHẢY', 'NUỐT / NHẢ') + '</div>';
      h += '<p class="center small">Đứng cạnh đồng đội rồi bấm B/X: NUỐT bạn vào bụng (nhả ra cũng B/X). Ếch đang vác bạn nhảy qua được hàng gai dài mà một mình nhảy không tới. A/Y = nhảy.</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 120000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    }
  } else if (g.id === 'can-goc') {
    var mc = g.myCannon;
    if (!mc || !mc.alive) {
      h += '<div class="center"><div class="ko-big">💥</div><div class="baloo" style="font-size:26px">Pháo của bạn đã bị phá huỷ!</div><p>Xem mọi người căn góc trên TV, đợi kết quả nhé…</p></div>';
    } else if (g.phase === 'aim' && g.myTurn) {
      h += '<div class="center baloo" style="font-size:24px">🎯 LƯỢT CỦA BẠN! 🌬️ Gió: ' + (!g.wind ? 'không gió' : (g.wind > 0 ? '→ ' + g.wind : '← ' + (-g.wind))) + '</div>';
      h += '<div class="center baloo" style="font-size:27px">Góc: <span id="aimangle">' + mc.angle + '</span>° · Lực: <span id="aimpower">' + mc.power + '</span> · Hướng: ' + (mc.face > 0 ? '▶' : '◀') + '</div>';
      h += '<div class="padwrap">' + discHTML() + abtnsHTML(g.id, 'BẮN', '') + '</div>';
      h += '<p class="center small">Giữ ▲▼ để chỉnh GÓC · giữ ◀▶ để chỉnh LỰC · X = đổi hướng nòng · A = BẮN! Đạn bay theo vòng cung và bị gió đẩy — căn cho khéo.</p>';
      h += '<div class="tbar"><i data-start="' + (g.endsAt - (g.phaseDur || 30000)) + '" data-end="' + g.endsAt + '" style="width:100%"></i></div>';
    } else {
      var turnP4 = g.turn ? playerOf(v, g.turn) : null;
      h += '<div class="center baloo" style="font-size:23px">' + (g.phase === 'shell' || g.phase === 'boom' ? '💥 Đạn đang bay… / Vừa nổ!' : 'Lượt của ' + esc(turnP4 ? turnP4.name : '') + ' — đợi tới lượt bạn') + '</div>';
      h += '<p class="center">Pháo của bạn: ❤️ ' + mc.hp + '/100 · Xem địa hình và gió trên TV để tính trước phát bắn của mình.</p>';
    }
  }
  return h + '</div>';
}
// ---------------------------------------------------------------------
// Device identity + recent rooms (phone mode convenience). The web
// remembers WHO this device is (np_identity: the name it last played
// under) so the join form is prefilled and friends recognize each
// other by name + seat colour with zero accounts; np_recent keeps up
// to 5 rooms this device created or joined (with the session token —
// this device's own credential, the same thing sessionStorage already
// holds) so rejoining is one tap.
// ---------------------------------------------------------------------
function npIdentity() {
  try { var o = JSON.parse(localStorage.getItem('np_identity') || 'null'); if (o && typeof o.name === 'string' && o.name) return o; } catch (e) {}
  return null;
}
function npSaveIdentity(name) {
  if (!name) return;
  try { localStorage.setItem('np_identity', JSON.stringify({ name: name })); } catch (e) {}
}
function npRecents() {
  try { var a = JSON.parse(localStorage.getItem('np_recent') || '[]'); if (Array.isArray(a)) return a.filter(function (r) { return r && r.code && r.token; }); } catch (e) {}
  return [];
}
function npSaveRecent(entry) {
  try {
    var a = npRecents().filter(function (r) { return !(r.code === entry.code && r.role === entry.role); });
    entry.at = Date.now();
    a.unshift(entry);
    localStorage.setItem('np_recent', JSON.stringify(a.slice(0, 5)));
  } catch (e) {}
}
function npDropRecent(code) {
  try { localStorage.setItem('np_recent', JSON.stringify(npRecents().filter(function (r) { return r.code !== code; }))); } catch (e) {}
}
// The host's own seat number in this view, or null. The hostSeat flag
// rides the players list (additive view field), so every client can
// find it; only the host page acts on it.
function mySeatOf(v) {
  if (!v || !v.players) return null;
  for (var i = 0; i < v.players.length; i++) if (v.players[i].hostSeat) return v.players[i].seat;
  return null;
}
// Home-screen defaults, applied right after homeHTML() paints: the
// remembered name fills both name inputs, a code= in the URL fills the
// join digits (friends tap the invite link and land one tap from the
// room — no auto-join without that tap), and the recognition note
// shows when this device is already known.
function fillHomeDefaults() {
  var idn = npIdentity();
  var jn = el('joinName'); if (jn && idn && !jn.value) jn.value = idn.name;
  var pm = el('pmName'); if (pm && idn && !pm.value) pm.value = idn.name;
  var note = el('idNote');
  if (note && idn) { note.textContent = 'Máy này đã nhớ bạn là ' + idn.name + ' 👋'; note.style.display = ''; }
  var qs = location.search || ''; var qi = qs.indexOf('code=');
  if (qi >= 0) {
    var cd = qs.slice(qi + 5, qi + 11); var cdOk = cd.length === 6;
    for (var ci = 0; ci < cd.length; ci++) if ('0123456789'.indexOf(cd.charAt(ci)) < 0) cdOk = false;
    if (cdOk) { for (var i = 0; i < 6; i++) { var d = el('d' + i); if (d) d.value = cd.charAt(i); } }
  }
}
function saveSession() {
  try { sessionStorage.setItem('np_session', JSON.stringify({ role: S.role, code: S.code, token: S.token, seat: S.seat, phoneMode: S.phoneMode ? true : undefined })); } catch (e) {}
}
function clearSession() {
  wsDrop();
  try { sessionStorage.removeItem('np_session'); } catch (e) {}
  S.role = null; S.code = null; S.token = null; S.seat = null; S.view = null; S.sig = ''; S.phoneMode = false; render();
}
// A room created seconds ago may briefly be invisible to a phone whose
// request lands somewhere the fresh room has not reached yet, and the
// join then answers "room not found". Retry ONLY that error every 2s
// for ~20s before bothering the user; every other error (room playing,
// room full, name problems) surfaces immediately.
var JOIN_RETRY_MS = 2000, JOIN_RETRY_MAX = 10;
function tryJoin(code, name, attempt) {
  api('/api/rooms/' + code + '/join', { name: name }, function (v) {
    if (v && v.ok) { S.role = 'player'; S.code = code; S.token = v.playerToken; S.seat = v.seat; npSaveIdentity(name); npSaveRecent({ code: code, role: 'player', name: name, token: v.playerToken, seat: v.seat }); noteOk(); saveSession(); S.sig = ''; poll(); return; }
    var err = v && v.error ? v.error : '';
    if (err.indexOf('Không thấy phòng này') >= 0 && attempt < JOIN_RETRY_MAX) {
      toast('Đang tìm phòng…');
      setTimeout(function () { tryJoin(code, name, attempt + 1); }, JOIN_RETRY_MS);
      return;
    }
    toast(err || 'Không vào được phòng.');
  });
}
// ---------------------------------------------------------------------
// Input dispatch. A mouse click is atomic, but a real finger press is
// not: 'click' only fires on release, and only if the touch did not
// drift, scroll, or straddle a re-render — rapid mashing on a phone
// lost presses exactly that way ("bấm phím không ăn"). Gameplay
// commands therefore fire on pointerdown (finger contact), with a
// per-signature guard that swallows the synthetic click trailing each
// press exactly once. Non-gameplay commands (lobby, settings,
// navigation) keep the plain click path, as do clicks with no press
// before them (keyboard / assistive tech).
// ---------------------------------------------------------------------
var GAME_CMDS = { tap: 1, answer: 1, choose: 1, vote: 1, symbol: 1, roll: 1, move: 1, wolfPick: 1, witchSave: 1, witchDone: 1, witchPoisonClear: 1, tlCard: 1, tlPlay: 1, tlPass: 1, tlClear: 1, myAnswer: 1, myVote: 1, myWolf: 1, myWitchSave: 1, myWitchDone: 1, myWitchClear: 1, myRoll: 1, myMove: 1, mySymbol: 1, myChoose: 1, myTlCard: 1, myTlPlay: 1, myTlPass: 1, myTlClear: 1 };
var cmdGuard = {};
function findCmdNode(node) {
  while (node && node !== document.body) { if (node.getAttribute && node.getAttribute('data-cmd')) return node; node = node.parentNode; }
  return null;
}
function findPadNode(node) {
  while (node && node !== document.body) { if (node.getAttribute && node.getAttribute('data-pad')) return node; node = node.parentNode; }
  return null;
}
function cmdSig(node, cmd) {
  return cmd + '|' + (node.getAttribute('data-i') || '') + '|' + (node.getAttribute('data-k') || '') + '|' + (node.getAttribute('data-c') || '');
}
function markCmdGuard(node, cmd) {
  var s = cmdSig(node, cmd); var r = cmdGuard[s]; var t = Date.now();
  if (!r || t - r.at > 700) cmdGuard[s] = { n: 1, at: t };
  else { r.n += 1; r.at = t; }
}
function pressFx(node) {
  if (!node || !node.classList) return;
  node.classList.add('pressed');
  setTimeout(function () { node.classList.remove('pressed'); }, 220);
}
function clearPadFx() {
  var pb = document.querySelectorAll('.dbtn.pressed, .abtn.pressed');
  for (var i = 0; i < pb.length; i++) pb[i].classList.remove('pressed');
}
function runCmd(node) {
  var cmd = node.getAttribute('data-cmd');
  if (cmd === 'create') {
    api('/api/rooms', {}, function (v) {
      if (v && v.ok) { S.role = 'host'; S.code = v.code; S.token = v.hostToken; S.seat = null; S.phoneMode = false; S.hostKb = false; npSaveRecent({ code: v.code, role: 'host', name: '', token: v.hostToken, seat: null }); noteOk(); saveSession(); S.sig = ''; poll(); }
      else toast(v && v.error ? v.error : 'Không tạo được phòng.');
    });
  } else if (cmd === 'createKb') {
    // Same big-screen create, plus the host sits down at a keyboard
    // seat the moment the lobby lands (hostKbAutoSeat, on poll).
    api('/api/rooms', {}, function (v) {
      if (v && v.ok) { S.role = 'host'; S.code = v.code; S.token = v.hostToken; S.seat = null; S.phoneMode = false; S.hostKb = true; npSaveRecent({ code: v.code, role: 'host', name: '', token: v.hostToken, seat: null }); noteOk(); saveSession(); S.sig = ''; poll(); }
      else toast(v && v.error ? v.error : 'Không tạo được phòng.');
    });
  } else if (cmd === 'createPhone') {
    // Phone mode: create the room AND sit the creator down in it —
    // one flow, landing in the lobby with the seat taken and the
    // invite link on screen. The name comes from the card's input
    // (prefilled from the remembered identity); the server defaults
    // it to 'Chủ phòng' when empty.
    var pmEl = el('pmName'); var pmName = pmEl ? pmEl.value.trim() : '';
    api('/api/rooms', {}, function (v) {
      if (!(v && v.ok)) { toast(v && v.error ? v.error : 'Không tạo được phòng.'); return; }
      S.role = 'host'; S.code = v.code; S.token = v.hostToken; S.seat = null; S.phoneMode = true;
      api('/api/rooms/' + S.code + '/action', { role: 'host', token: S.token, action: 'hostJoin', name: pmName }, function (v2) {
        if (v2 && v2.ok) { S.view = v2; noteServerTime(v2.serverNow); }
        else if (v2 && v2.error) toast(v2.error);
        if (pmName) npSaveIdentity(pmName);
        npSaveRecent({ code: S.code, role: 'host', name: pmName, token: S.token, seat: null, phone: true });
        noteOk(); saveSession(); S.sig = ''; poll(); render();
      });
    });
  } else if (cmd === 'recent') {
    // One-tap rejoin from the home screen: probe the saved session —
    // adopt it when the room still exists, drop the chip when it is
    // gone (same not-found feedback the poll path uses).
    var rc = npRecents()[+node.getAttribute('data-i')];
    if (!rc) return;
    api('/api/rooms/' + rc.code + '/state?role=' + rc.role + '&token=' + encodeURIComponent(rc.token), null, function (v) {
      if (v && v.ok) {
        S.role = rc.role; S.code = rc.code; S.token = rc.token; S.seat = rc.seat || null; S.phoneMode = !!rc.phone;
        S.view = v; noteServerTime(v.serverNow); noteOk(); saveSession(); S.sig = ''; poll(); render();
      } else if (v && v.error && !v.net && v.error.indexOf('Không thấy phòng này') >= 0) {
        npDropRecent(rc.code);
        toast('Phòng đã đóng hoặc hết hạn, tạo phòng mới nhé.');
        S.sig = ''; render();
      } else toast(v && v.error ? v.error : 'Không vào lại được phòng.');
    });
  } else if (cmd === 'copyLink') {
    var liEl = el('shareLink');
    if (liEl) {
      var linkUrl = liEl.value;
      var copied = function () { toast('Đã sao chép link mời! Gửi cho bạn bè nhé.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(linkUrl).then(copied, function () { liEl.focus(); liEl.select(); toast('Link đã được bôi đen — sao chép rồi gửi cho bạn bè nhé.'); });
      } else { liEl.focus(); liEl.select(); toast('Link đã được bôi đen — sao chép rồi gửi cho bạn bè nhé.'); }
    }
  } else if (cmd === 'hostJoinBtn') {
    var idn2 = npIdentity();
    act({ action: 'hostJoin', name: idn2 ? idn2.name : '' });
  } else if (cmd === 'hostLeave') {
    act({ action: 'hostLeave' });
  } else if (cmd === 'join') {
    var code = '';
    for (var i = 0; i < 6; i++) { var d = el('d' + i); code += d ? d.value.trim() : ''; }
    var nameEl = el('joinName'); var name = nameEl ? nameEl.value.trim() : '';
    if (code.length !== 6) { toast('Nhập đủ mã phòng 6 số nhé.'); return; }
    if (!name) { toast('Nhập tên của bạn trước nhé.'); return; }
    tryJoin(code, name, 0);
  } else if (cmd === 'sound') {
    S.muted = !S.muted;
    try { localStorage.setItem('np_muted', S.muted ? '1' : '0'); } catch (e) {}
    S.sig = ''; render();
  } else if (cmd === 'fs') {
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  } else if (cmd === 'reload') {
    clearSession();
    location.reload();
  } else if (cmd === 'hostPlayKb') {
    sfxTap();
    act({ action: 'addLocal', seat: +node.getAttribute('data-seat') });
  } else if (cmd === 'hostPhone') {
    sfxTap();
    S.phoneHelp = true; S.sig = ''; render();
  } else if (cmd === 'addBot' || cmd === 'removeBot' || cmd === 'cycleBot' || cmd === 'addLocal' || cmd === 'cycleScheme') {
    act({ action: cmd, seat: +node.getAttribute('data-seat') });
  } else if (cmd === 'start') {
    sfxTap();
    act({ action: 'startGame', game: node.getAttribute('data-game') });
  } else if (cmd === 'quickStart') {
    sfxTap();
    act({ action: 'quickStart', game: node.getAttribute('data-game') });
  } else if (cmd === 'startLocked') {
    var lgm = gameMeta(S.view, node.getAttribute('data-game'));
    if (lgm && S.view) toast(lgm.name + ' chơi được với ' + lgm.min + '–' + lgm.max + ' người — phòng đang có ' + S.view.players.length + ' người. Thêm/xoá Máy hoặc rủ thêm bạn nhé.');
  } else if (cmd === 'quitGame') {
    sfxTap();
    act({ action: 'quitToChoosing' });
  } else if (cmd === 'plStop') {
    sfxTap();
    act({ action: 'playlistStop' });
  } else if (cmd === 'plMode') {
    S.plMode = !S.plMode;
    if (!S.plMode) S.plQueue = [];
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'plToggle') {
    var pgid = node.getAttribute('data-game');
    var pgm = gameMeta(S.view, pgid);
    var pqi = S.plQueue.indexOf(pgid);
    if (pqi >= 0) S.plQueue.splice(pqi, 1);
    else {
      if (pgm && S.view && seatLocked(pgm, S.view.players.length)) { toast(pgm.name + ' chơi được với ' + pgm.min + '–' + pgm.max + ' người — phòng đang có ' + S.view.players.length + ' người.'); return; }
      S.plQueue.push(pgid);
    }
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'plRandom') {
    var pool = [];
    for (var rpi = 0; rpi < S.view.games.length; rpi++) { var rgm = S.view.games[rpi]; if (!seatLocked(rgm, S.view.players.length)) pool.push(rgm.id); }
    var picked = [];
    while (picked.length < 5 && pool.length) { var rix = Math.floor(Math.random() * pool.length); picked.push(pool.splice(rix, 1)[0]); }
    S.plQueue = picked;
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'plAll') {
    S.plQueue = [];
    for (var api2 = 0; api2 < S.view.games.length; api2++) { var agm = S.view.games[api2]; if (!seatLocked(agm, S.view.players.length)) S.plQueue.push(agm.id); }
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'plStart') {
    if (S.plQueue.length < 2) { toast('Chọn ít nhất 2 game cho liên hoàn nhé.'); return; }
    var pq = S.plQueue.slice();
    S.plQueue = []; S.plMode = false;
    sfxTap();
    act({ action: 'playlistStart', games: pq });
  } else if (cmd === 'continue' || cmd === 'replay' || cmd === 'toChoosing' || cmd === 'finish' || cmd === 'playAgain') {
    sfxTap();
    act({ action: cmd });
  } else if (cmd === 'tap') {
    sfxTap();
    act({ action: 'tap' });
  } else if (cmd === 'answer') {
    sfxTap();
    act({ action: 'answer', choice: +node.getAttribute('data-i') });
  } else if (cmd === 'roll') {
    sfxTap();
    act({ action: 'roll' });
  } else if (cmd === 'move') {
    sfxTap();
    act({ action: 'move', horse: +node.getAttribute('data-i') });
  } else if (cmd === 'tlCard') {
    sfxTap();
    if (!S.tlSel) S.tlSel = [];
    var tcid = +node.getAttribute('data-i');
    var tix = S.tlSel.indexOf(tcid);
    if (tix >= 0) S.tlSel.splice(tix, 1); else S.tlSel.push(tcid);
    S.sig = ''; render();
  } else if (cmd === 'tlPlay') {
    if (!S.tlSel || !S.tlSel.length) { toast('Chọn ít nhất một lá bài trước đã.'); return; }
    sfxTap();
    tlSend({ action: 'play', cards: S.tlSel.slice() });
  } else if (cmd === 'tlPass') {
    sfxTap();
    tlSend({ action: 'pass' });
  } else if (cmd === 'tlClear') {
    S.tlSel = [];
    sfxTap(); S.sig = ''; render();
  } else if (cmd === 'myAnswer' || cmd === 'myVote' || cmd === 'myWolf' || cmd === 'myWitchSave' || cmd === 'myWitchDone' || cmd === 'myWitchClear'
    || cmd === 'myRoll' || cmd === 'myMove' || cmd === 'mySymbol' || cmd === 'myChoose' || cmd === 'myChatSend'
    || cmd === 'myTlCard' || cmd === 'myTlPlay' || cmd === 'myTlPass' || cmd === 'myTlClear') {
    // My-seat commands (phone mode): all sends ride the forSeat relay
    // via localAct, which stamps host credentials + forSeat and never
    // clears the session on a rules error.
    var mySeat = mySeatOf(S.view);
    if (mySeat == null) return;
    sfxTap();
    if (cmd === 'myAnswer') localAct(mySeat, { action: 'answer', choice: +node.getAttribute('data-i') });
    else if (cmd === 'myVote') localAct(mySeat, { action: 'vote', seat: +node.getAttribute('data-i') });
    else if (cmd === 'myWolf') {
      var mk = node.getAttribute('data-kind');
      var mi = +node.getAttribute('data-i');
      if (mk === 'wolfPoison') localAct(mySeat, { action: 'wolfWitch', poison: mi });
      else localAct(mySeat, { action: mk, seat: mi });
    }
    else if (cmd === 'myWitchSave') {
      var msv = S.view && S.view.myView ? !!S.view.myView.myWitchSave : false;
      localAct(mySeat, { action: 'wolfWitch', save: !msv });
    }
    else if (cmd === 'myWitchClear') localAct(mySeat, { action: 'wolfWitch', poison: null });
    else if (cmd === 'myWitchDone') localAct(mySeat, { action: 'wolfWitch', done: true });
    else if (cmd === 'myRoll') localAct(mySeat, { action: 'roll' });
    else if (cmd === 'myMove') localAct(mySeat, { action: 'move', horse: +node.getAttribute('data-i') });
    else if (cmd === 'mySymbol') { var msy = +node.getAttribute('data-i'); beep(320 + msy * 130, 0.1, 'triangle', 0.14); localAct(mySeat, { action: 'symbol', sym: msy }); }
    else if (cmd === 'myChoose') localAct(mySeat, { action: 'choose', choice: node.getAttribute('data-c') });
    else if (cmd === 'myChatSend') {
      var mct = el('myChatText'); var mtxt = mct ? mct.value.trim() : '';
      if (!mtxt) { toast('Nhập lời nhắn trước đã.'); return; }
      if (mct) mct.value = '';
      localAct(mySeat, { action: 'chat', text: mtxt });
    }
    else if (cmd === 'myTlCard') {
      if (!S.myTlSel) S.myTlSel = [];
      var mtc = +node.getAttribute('data-i');
      var mtx = S.myTlSel.indexOf(mtc);
      if (mtx >= 0) S.myTlSel.splice(mtx, 1); else S.myTlSel.push(mtc);
      S.mySeatSig = ''; S.sig = ''; render();
    }
    else if (cmd === 'myTlPlay') {
      if (!S.myTlSel || !S.myTlSel.length) { toast('Chọn ít nhất một lá bài trước đã.'); return; }
      localAct(mySeat, { action: 'play', cards: S.myTlSel.slice() });
    }
    else if (cmd === 'myTlPass') localAct(mySeat, { action: 'pass' });
    else if (cmd === 'myTlClear') { S.myTlSel = []; S.mySeatSig = ''; S.sig = ''; render(); }
  } else if (cmd === 'wolfPick') {
    sfxTap();
    var wk = node.getAttribute('data-kind');
    var wi = +node.getAttribute('data-i');
    if (wk === 'wolfPoison') act({ action: 'wolfWitch', poison: wi });
    else act({ action: wk, seat: wi });
  } else if (cmd === 'witchSave') {
    sfxTap();
    var wsv = S.view && S.view.game ? !!S.view.game.myWitchSave : false;
    act({ action: 'wolfWitch', save: !wsv });
  } else if (cmd === 'witchPoisonClear') {
    sfxTap();
    act({ action: 'wolfWitch', poison: null });
  } else if (cmd === 'witchDone') {
    sfxTap();
    act({ action: 'wolfWitch', done: true });
  } else if (cmd === 'choose') {
    sfxTap();
    act({ action: 'choose', choice: node.getAttribute('data-c') });
  } else if (cmd === 'vote') {
    sfxTap();
    act({ action: 'vote', seat: +node.getAttribute('data-i') });
  } else if (cmd === 'symbol') {
    var sy = +node.getAttribute('data-i');
    beep(320 + sy * 130, 0.1, 'triangle', 0.14);
    act({ action: 'symbol', sym: sy });
  } else if (cmd === 'chatSend') {
    var ct = el('chatText'); var txt = ct ? ct.value.trim() : '';
    if (!txt) { toast('Nhập lời nhắn trước đã.'); return; }
    if (ct) ct.value = '';
    act({ action: 'chat', text: txt });
  }
}
document.addEventListener('click', function (ev) {
  var node = findCmdNode(ev.target);
  if (!node) return;
  var cmd = node.getAttribute('data-cmd');
  if (GAME_CMDS[cmd]) {
    // This click is the synthetic tail of a press that already fired on
    // pointerdown: swallow it once per recorded press.
    var s = cmdSig(node, cmd); var r = cmdGuard[s];
    if (r && r.n > 0 && Date.now() - r.at < 700) { r.n -= 1; return; }
  }
  runCmd(node);
});
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.classList && t.classList.contains('digit') && t.value.length >= 1) {
    var idx = +t.id.slice(1);
    var next = el('d' + (idx + 1));
    if (next) next.focus();
    else if (idx === 5) {
      // Last digit in and the name is already filled (it is
      // remembered between visits): join right away, no extra tap.
      var jn2 = el('joinName');
      if (jn2 && jn2.value.trim()) { var jb = document.querySelector('[data-cmd="join"]'); if (jb) jb.click(); }
    }
  }
});
// Per-game action-button sets for the phone gamepad (mirrors the
// Android controller's table): games not listed here get exactly the
// classic A/B pair; listed games add X/Y (or swap B out) with their
// own labels. nguoi-que uses a diamond layout (Y top, X left, A
// right, B bottom, like a console pad); den-lua-nuoc a plain row.
var PAD_SPEC = {
  'nguoi-que': { layout: 'diamond', btns: { a: 'ĐÁNH', b: 'LƯỚT', x: 'ĐÁNH MẠNH', y: 'NHẢY' } },
  'den-lua-nuoc': { layout: 'row', order: ['y', 'a'], btns: { a: 'NHẢY', y: 'NHẢY' } },
  'da-bong': { layout: 'row', order: ['y', 'b', 'a'], btns: { y: 'NHẢY', b: 'LƯỚT', a: 'SÚT' } },
  'ech-op': { layout: 'row', order: ['y', 'a', 'b'], btns: { y: 'NHẢY', a: 'NHẢY', b: 'NUỐT / NHẢ' } },
  'can-goc': { layout: 'row', order: ['x', 'a'], btns: { x: 'HƯỚNG', a: 'BẮN' } }
};
function abtnsHTML(gid, aLabel, bLabel) {
  var spec = PAD_SPEC[gid];
  if (!spec) return '<div class="abtns"><button class="abtn bbtn" data-pad="b">B<span>' + bLabel + '</span></button><button class="abtn abtnA" data-pad="a">A<span>' + aLabel + '</span></button></div>';
  if (spec.layout === 'diamond') {
    return '<div class="abtns dia">'
      + '<span></span><button class="abtn ybtn" data-pad="y">Y<span>' + spec.btns.y + '</span></button><span></span>'
      + '<button class="abtn xbtn" data-pad="x">X<span>' + spec.btns.x + '</span></button><span></span><button class="abtn abtnA" data-pad="a">A<span>' + spec.btns.a + '</span></button>'
      + '<span></span><button class="abtn bbtn" data-pad="b">B<span>' + spec.btns.b + '</span></button><span></span></div>';
  }
  var h = '<div class="abtns">';
  for (var i = 0; i < spec.order.length; i++) {
    var k = spec.order[i];
    h += '<button class="abtn ' + (k === 'a' ? 'abtnA' : k === 'x' ? 'xbtn' : k === 'y' ? 'ybtn' : 'bbtn') + '" data-pad="' + k + '">' + k.toUpperCase() + '<span>' + spec.btns[k] + '</span></button>';
  }
  return h + '</div>';
}
// The circular direction disc that replaces the 3x3 D-pad grid: one
// round target; the thumb's offset from centre picks the directions
// (axis thresholds, so sliding diagonally gives a real diagonal) and
// the active segments light up through data-u/d/l/r attributes.
function discHTML() {
  return '<div class="disc" data-disc="1" data-u="0" data-d="0" data-l="0" data-r="0"><svg viewBox="0 0 100 100">'
    + '<path class="seg seg-u" d="M50 50 L16.8 16.8 A47 47 0 0 1 83.2 16.8 Z"/>'
    + '<path class="seg seg-r" d="M50 50 L83.2 16.8 A47 47 0 0 1 83.2 83.2 Z"/>'
    + '<path class="seg seg-d" d="M50 50 L83.2 83.2 A47 47 0 0 1 16.8 83.2 Z"/>'
    + '<path class="seg seg-l" d="M50 50 L16.8 83.2 A47 47 0 0 1 16.8 16.8 Z"/>'
    + '<polygon class="segarr arr-u" points="50,13 42.5,25 57.5,25"/>'
    + '<polygon class="segarr arr-r" points="87,50 75,42.5 75,57.5"/>'
    + '<polygon class="segarr arr-d" points="50,87 42.5,75 57.5,75"/>'
    + '<polygon class="segarr arr-l" points="13,50 25,42.5 25,57.5"/>'
    + '<circle class="hub" cx="50" cy="50" r="14"/>'
    + '</svg></div>';
}
function findDiscNode(node) {
  while (node && node !== document.body) { if (node.getAttribute && node.getAttribute('data-disc')) return node; node = node.parentNode; }
  return null;
}
S.discPointers = {};
function discBits(node, cx, cy) {
  var r = node.getBoundingClientRect();
  var R = r.width / 2; if (!R) return '';
  var dx = cx - (r.left + R), dy = cy - (r.top + R);
  if (Math.sqrt(dx * dx + dy * dy) <= R * 0.18) return '';
  var th = R * 0.25, bits = '';
  if (dx > th) bits += 'r'; else if (dx < -th) bits += 'l';
  if (dy > th) bits += 'd'; else if (dy < -th) bits += 'u';
  return bits;
}
// A disc pointer drives up to two pad bits at once; each bit rides
// the ordinary padSet machinery under its own synthetic pointer id
// ("<pid>:<bit>"), so the multi-touch bookkeeping (padPointers holds
// exactly one bit per id) and the stuck-release recovery keep working
// unchanged, and other fingers on A/B/X/Y stay fully independent.
function discApply(pid, bits) {
  var rec = S.discPointers[pid]; if (!rec) return;
  if (rec.bits === bits) return;
  var old = rec.bits; rec.bits = bits;
  var dirs = ['u', 'd', 'l', 'r'];
  for (var i = 0; i < dirs.length; i++) {
    var b = dirs[i], was = old.indexOf(b) >= 0, is = bits.indexOf(b) >= 0;
    if (is && !was) padSet(b, true, pid + ':' + b);
    else if (was && !is) padSet(b, false, pid + ':' + b);
  }
}
function discDown(pid, node, cx, cy) {
  S.discPointers[pid] = { node: node, bits: '' };
  discApply(pid, discBits(node, cx, cy));
  paintDiscs();
}
function discUp(pid) {
  if (!S.discPointers[pid]) return;
  discApply(pid, '');
  delete S.discPointers[pid];
  paintDiscs();
}
function paintDiscs() {
  var ds = document.querySelectorAll('.disc');
  for (var i = 0; i < ds.length; i++) {
    ds[i].setAttribute('data-u', S.padState.u ? '1' : '0');
    ds[i].setAttribute('data-d', S.padState.d ? '1' : '0');
    ds[i].setAttribute('data-l', S.padState.l ? '1' : '0');
    ds[i].setAttribute('data-r', S.padState.r ? '1' : '0');
  }
}
S.padState = { u: false, d: false, l: false, r: false, a: false, b: false, x: false, y: false };
S.padPointers = {};
function sendPad() {
  if (!S.code || S.role !== 'player') return;
  paintDiscs();
  // The live channel carries pad snapshots with no HTTP round trip per
  // press; the HTTP send (tiny-ack path) remains the exact fallback
  // whenever the socket is down, stale (SMOOTH5), or a send throws.
  if (wsOpen() && !wsStale()) {
    try { wsConn.send(JSON.stringify({ action: 'pad', pad: S.padState })); return; } catch (e) {}
  }
  api('/api/rooms/' + S.code + '/action', { role: 'player', token: S.token, action: 'pad', pad: S.padState }, function () {});
}
function padBitHeld(bit) {
  for (var k in S.padPointers) if (S.padPointers[k] === bit) return true;
  return false;
}
function padSet(bit, val, pid) {
  if (val) {
    if (S.padPointers[pid] === bit) return;
    var wasHeld = !!S.padState[bit];
    S.padPointers[pid] = bit;
    if (wasHeld) {
      // The bit already reads as held, but not by THIS pointer: the
      // earlier holder's release never arrived (its button was rebuilt
      // mid-touch) or a second finger joined on the same button. Cycle
      // the bit so this press produces a fresh rising edge on the
      // server instead of being swallowed by the stuck state.
      S.padState[bit] = false; sendPad();
    }
    S.padState[bit] = true; sendPad();
  } else {
    delete S.padPointers[pid];
    if (S.padState[bit] && !padBitHeld(bit)) { S.padState[bit] = false; sendPad(); }
  }
}
function padPressFx(bit) {
  // Kéo Co no longer re-renders for my own press count (player
  // signature), so the on-screen counter is bumped locally on contact.
  if (bit === 'b' && S.view && S.view.game && S.view.game.id === 'keo-co' && S.view.game.phase === 'pull') {
    var mp = el('mypull'); if (mp) mp.textContent = (+mp.textContent || 0) + 1;
  }
}
document.addEventListener('pointerdown', function (ev) {
  var discNode = findDiscNode(ev.target);
  if (discNode) {
    ev.preventDefault();
    discDown(ev.pointerId, discNode, ev.clientX, ev.clientY);
    return;
  }
  var padNode = findPadNode(ev.target);
  if (padNode) {
    ev.preventDefault();
    pressFx(padNode);
    padSet(padNode.getAttribute('data-pad'), true, ev.pointerId);
    padPressFx(padNode.getAttribute('data-pad'));
    return;
  }
  var node = findCmdNode(ev.target);
  if (node && GAME_CMDS[node.getAttribute('data-cmd')]) {
    ev.preventDefault();
    pressFx(node);
    vibrate(10);
    markCmdGuard(node, node.getAttribute('data-cmd'));
    runCmd(node);
  }
});
document.addEventListener('pointermove', function (ev) {
  var rec = S.discPointers[ev.pointerId];
  if (rec) discApply(ev.pointerId, discBits(rec.node, ev.clientX, ev.clientY));
});
function padRelease(ev) {
  discUp(ev.pointerId);
  var bit = S.padPointers[ev.pointerId];
  if (bit) padSet(bit, false, ev.pointerId);
  clearPadFx();
}
document.addEventListener('pointerup', padRelease);
document.addEventListener('pointercancel', padRelease);
window.addEventListener('blur', function () {
  S.padPointers = {};
  S.discPointers = {};
  var changed = false;
  for (var k in S.padState) if (S.padState[k]) { S.padState[k] = false; changed = true; }
  if (changed) sendPad();
  paintDiscs();
});
// Fallbacks for engines without Pointer Events (older browsers and
// in-app webviews such as Zalo/Facebook): without these, the gamepad
// would be completely dead there and gameplay buttons would fall back
// to fragile clicks. Registered ONLY when Pointer Events are missing,
// so the two input stacks can never double-fire; the cmdGuard above
// additionally swallows any emulated click that still gets through.
if (!window.PointerEvent) {
  document.addEventListener('touchstart', function (ev) {
    for (var i = 0; i < ev.changedTouches.length; i++) {
      var t = ev.changedTouches[i];
      var discNode = findDiscNode(t.target);
      if (discNode) {
        ev.preventDefault();
        discDown('t' + t.identifier, discNode, t.clientX, t.clientY);
        continue;
      }
      var padNode = findPadNode(t.target);
      if (padNode) {
        ev.preventDefault();
        pressFx(padNode);
        padSet(padNode.getAttribute('data-pad'), true, 't' + t.identifier);
        padPressFx(padNode.getAttribute('data-pad'));
        continue;
      }
      var node = findCmdNode(t.target);
      if (node && GAME_CMDS[node.getAttribute('data-cmd')]) {
        ev.preventDefault();
        pressFx(node);
        vibrate(10);
        markCmdGuard(node, node.getAttribute('data-cmd'));
        runCmd(node);
      }
    }
  }, { passive: false });
  document.addEventListener('touchmove', function (ev) {
    for (var i = 0; i < ev.changedTouches.length; i++) {
      var t = ev.changedTouches[i];
      var rec = S.discPointers['t' + t.identifier];
      if (rec) { ev.preventDefault(); discApply('t' + t.identifier, discBits(rec.node, t.clientX, t.clientY)); }
    }
  }, { passive: false });
  function touchEnd(ev) {
    for (var i = 0; i < ev.changedTouches.length; i++) {
      var pid = 't' + ev.changedTouches[i].identifier;
      discUp(pid);
      var bit = S.padPointers[pid];
      if (bit) padSet(bit, false, pid);
    }
    clearPadFx();
  }
  document.addEventListener('touchend', touchEnd);
  document.addEventListener('touchcancel', touchEnd);
  document.addEventListener('mousedown', function (ev) {
    var discNode = findDiscNode(ev.target);
    if (discNode) {
      ev.preventDefault();
      discDown('mouse', discNode, ev.clientX, ev.clientY);
      return;
    }
    var padNode = findPadNode(ev.target);
    if (padNode) {
      pressFx(padNode);
      padSet(padNode.getAttribute('data-pad'), true, 'mouse');
      padPressFx(padNode.getAttribute('data-pad'));
      return;
    }
    var node = findCmdNode(ev.target);
    if (node && GAME_CMDS[node.getAttribute('data-cmd')]) {
      pressFx(node);
      markCmdGuard(node, node.getAttribute('data-cmd'));
      runCmd(node);
    }
  });
  document.addEventListener('mousemove', function (ev) {
    var rec = S.discPointers.mouse;
    if (rec) discApply('mouse', discBits(rec.node, ev.clientX, ev.clientY));
  });
  document.addEventListener('mouseup', function () {
    discUp('mouse');
    if (S.padPointers.mouse) padSet(S.padPointers.mouse, false, 'mouse');
    clearPadFx();
  });
}
// ---------------------------------------------------------------------
// Player-page keyboard (role 'player', this device's own keyboard):
// a player alone on their own computer needs NO configuration — the
// WASD set and the arrow set are both live at once (schemes 0 and 1
// in LK_SCHEMES below share no key codes), and the merged result
// drives the player's own seat through the ordinary pad machinery.
// Merge design: the keyboard is one more input source riding padSet
// under the synthetic pointer id 'kb:<bit>', exactly like each disc
// direction does, so the sent pad state is the OR of the touch
// claims and the keyboard claims — releasing a key never clears a
// bit a finger still holds, and lifting a finger never clears a bit
// a key still holds. Two physical keys can map to one bit (KeyW and
// ArrowUp are both 'u'); KB_DOWN tracks keys, and a bit only counts
// as keyboard-held while at least one of its keys is down. The
// page's own blur handler (registered with the touch stack) already
// zeroes padState + padPointers; this engine additionally forgets
// which keys were down so a later keyup cannot resurrect a bit.
// Discrete presses reuse the exact payloads the on-screen buttons
// send through act() (see runCmd: answer / symbol / tap / roll),
// including their answer-once gating on the view's mine field.
// The host page is untouched — the multi-seat engine below owns it.
// ---------------------------------------------------------------------
var KB_MAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyF: 'a', Comma: 'a', KeyG: 'b', Period: 'b', KeyQ: 'x', KeyM: 'x', KeyE: 'y', Slash: 'y' };
var KB_BITS = ['u', 'd', 'l', 'r', 'a', 'b', 'x', 'y'];
var KB_DOWN = {};
function pkActive() {
  var v = S.view;
  return S.role === 'player' && !!v && v.phase === 'playing' && !!v.game;
}
function kbBitHeld(bit) {
  for (var c in KB_DOWN) if (KB_DOWN[c] === bit) return true;
  return false;
}
function kbSync(bit) {
  var on = kbBitHeld(bit);
  var claimed = S.padPointers['kb:' + bit] === bit;
  if (on !== claimed) padSet(bit, on, 'kb:' + bit);
}
function pkTranslate(bit) {
  var v = S.view; var g = v && v.game; if (!g) return;
  var ci = bit === 'a' ? 0 : bit === 'b' ? 1 : bit === 'x' ? 2 : bit === 'y' ? 3 : -1;
  if (ci < 0) return;
  if (g.id === 'do-vui' && g.phase === 'question') { if (g.mine == null) { sfxTap(); act({ action: 'answer', choice: ci }); } }
  else if (g.id === 'ke-gia-mao' && g.phase === 'answer') { if (g.mine == null) { sfxTap(); act({ action: 'answer', choice: ci }); } }
  else if (g.id === 'giai-ma-chung') { beep(320 + ci * 130, 0.1, 'triangle', 0.14); act({ action: 'symbol', sym: ci }); }
  else if (g.id === 'cao-boi') { if (bit === 'a') { sfxTap(); act({ action: 'tap' }); } }
  else if (g.id === 'cheo-thuyen' && g.phase === 'row') { if (bit === 'a') { sfxTap(); act({ action: 'tap' }); } }
  else if (g.id === 'ca-ngua' && g.phase === 'roll') { if (bit === 'a' && g.myTurn) { sfxTap(); act({ action: 'roll' }); } }
}
window.addEventListener('keydown', function (ev) {
  if (!pkActive()) return;
  var t = ev.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  var bit = KB_MAP[ev.code]; if (!bit) return;
  ev.preventDefault();
  var was = kbBitHeld(bit);
  KB_DOWN[ev.code] = bit;
  if (!was) { kbSync(bit); if (!ev.repeat) pkTranslate(bit); }
});
window.addEventListener('keyup', function (ev) {
  var bit = KB_MAP[ev.code]; if (!bit) return;
  if (!KB_DOWN[ev.code]) return;
  delete KB_DOWN[ev.code];
  if (pkActive()) ev.preventDefault();
  if (!kbBitHeld(bit)) kbSync(bit);
});
window.addEventListener('blur', function () {
  if (!Object.keys(KB_DOWN).length) return;
  KB_DOWN = {};
  for (var ki = 0; ki < KB_BITS.length; ki++) kbSync(KB_BITS[ki]);
});
function kbHintHTML() {
  if ('ontouchstart' in window) return '';
  return '<p class="center small muted" style="margin:8px 0 0">⌨️ WASD hoặc phím mũi tên để di chuyển · F/G/Q/E = A/B/X/Y</p>';
}
// ---------------------------------------------------------------------
// Local keyboard mode (host screen only): up to four players play on
// THIS screen, each with their own keyboard scheme — no phone needed.
// The server marks those seats local:true; the host view carries
// locals (seat -> scheme, every phase) and, during a game,
// localViews (each local seat's own player view — their secret
// question / wolf role / legal moves — because this screen IS that
// player's screen). Input relays back as host actions with forSeat.
// Panels are display-only overlays inside #localpanels, a fixed
// container appended to <body> (outside #app, whose innerHTML render()
// rebuilds): peek + cursor state lives in LK keyed by seat, never in
// the DOM, so repaints cannot lose it. Nothing here runs for the
// phone role. NOTE (brief conflict, resolved): in Kẻ Giả Mạo the Y key
// is both "hold to peek at your question" and "answer 4" — a quick TAP
// of Y answers 4, a HOLD (>= 300ms) only peeks, so the question can
// always be read before deciding.
// ---------------------------------------------------------------------
var LK_SCHEMES = [
  { name: 'WASD', u: 'KeyW', d: 'KeyS', l: 'KeyA', r: 'KeyD', a: 'KeyF', b: 'KeyG', x: 'KeyQ', y: 'KeyE' },
  { name: 'Mũi tên', u: 'ArrowUp', d: 'ArrowDown', l: 'ArrowLeft', r: 'ArrowRight', a: 'Comma', b: 'Period', x: 'KeyM', y: 'Slash' },
  { name: 'Numpad', u: 'Numpad8', d: 'Numpad5', l: 'Numpad4', r: 'Numpad6', a: 'Numpad0', b: 'NumpadEnter', x: 'Numpad7', y: 'Numpad9' },
  { name: 'IJKL', u: 'KeyI', d: 'KeyK', l: 'KeyJ', r: 'KeyL', a: 'KeyO', b: 'KeyP', x: 'KeyU', y: 'Semicolon' }
];
var LK_SCHEME_SUMMARY = ['WASD · A=F B=G X=Q Y=E', 'Mũi tên · A=, B=. X=M Y=/', 'Numpad · A=0 B=Enter X=7 Y=9', 'IJKL · A=O B=P X=U Y=;'];
var LK_BITS = ['u', 'd', 'l', 'r', 'a', 'b', 'x', 'y'];
var LK_PAD_GAMES = { 'day-ra': 1, 'ne-dan': 1, 'cuop-sao': 1, 'giu-vuong-mien': 1, 'son-san': 1, 'chung-mot-than': 1, 'day-hop': 1, 'xe-tank': 1, 'dat-bom': 1, 'thu-thanh': 1, 'nguoi-que': 1, 'den-lua-nuoc': 1, 'da-bong': 1, 'ech-op': 1, 'can-goc': 1 };
var LK = {};
function lkState(seat) {
  if (!LK[seat]) LK[seat] = { pad: { u: false, d: false, l: false, r: false, a: false, b: false, x: false, y: false }, peek: false, yAt: 0, cur: 0, sig: '' };
  return LK[seat];
}
function lkActive() {
  var v = S.view;
  return S.role === 'host' && !!v && v.phase === 'playing' && !!v.game && !!v.locals && v.locals.length > 0;
}
function lkFind(code) {
  var v = S.view; if (!v || !v.locals) return null;
  for (var i = 0; i < v.locals.length; i++) {
    var sc = LK_SCHEMES[v.locals[i].scheme || 0]; if (!sc) continue;
    for (var b = 0; b < LK_BITS.length; b++) if (sc[LK_BITS[b]] === code) return { seat: v.locals[i].seat, bit: LK_BITS[b] };
  }
  return null;
}
function lkPlayerName(v, seat) { var p = playerOf(v, seat); return p ? p.name : ''; }
// One-shot helper for the home screen's "play by keyboard" create:
// once the freshly created room's lobby view lands, sit the host
// down in the first free keyboard seat automatically.
function hostKbAutoSeat(v) {
  if (!S.hostKb || S.role !== 'host' || !v || v.phase !== 'lobby') return;
  S.hostKb = false;
  for (var hl = 0; hl < v.players.length; hl++) if (v.players[hl].local) return;
  for (var ks2 = 2; ks2 <= 12; ks2++) if (!playerOf(v, ks2)) { act({ action: 'addLocal', seat: ks2 }); return; }
}
function sendLocalPad(seat) {
  // Mirror of sendPad() for a local seat: WS bare object when the live
  // channel is open, else the HTTP tiny-ack path; replies are ignored.
  var st = LK[seat]; if (!st || !S.code) return;
  if (S.localActive && L.room) {
    var E = window.__NP_ENGINE;
    for (var pi = 0; pi < L.room.players.length; pi++) { var pl = L.room.players[pi]; if (pl.seat === seat) { try { E.playerAction(L.room, pl, { action: 'pad', pad: st.pad }); } catch (e) {} break; } }
    return;
  }
  if (wsOpen() && !wsStale()) { try { wsConn.send(JSON.stringify({ action: 'pad', forSeat: seat, pad: st.pad })); return; } catch (e) {} }
  api('/api/rooms/' + S.code + '/action', { role: 'host', token: S.token, action: 'pad', forSeat: seat, pad: st.pad }, function () {});
}
function localAct(seat, body) {
  // act() for a local seat: stamps host credentials + forSeat and
  // applies the returned host view. Deliberately NOT act() itself:
  // act() clears the session when an error contains 'không hợp lệ',
  // and a mistimed local press (e.g. a symbol sent a frame after the
  // phase turned) must never kick the big screen out of its own room.
  if (S.localActive) {
    body.forSeat = seat;
    var lerr2 = null;
    try { lerr2 = localDispatch(body); } catch (e) { lerr2 = null; }
    if (lerr2) toast(lerr2);
    return;
  }
  body.role = 'host'; body.token = S.token; body.forSeat = seat;
  api('/api/rooms/' + S.code + '/action', body, function (v) {
    if (v && v.ok && !viewStale(v)) { S.view = v; noteServerTime(v.serverNow); S.sig = ''; noteOk(); render(); }
    else if (v && v.error) toast(v.error);
  });
}
function lkOptions(v, seat) {
  // The seat's current pick list, or null. Options carry ready-to-send
  // action bodies (localAct stamps forSeat). Building the list also
  // owns cursor housekeeping: a changed signature (game + phase +
  // option actions) resets the cursor to the first row.
  var g = v.game; if (!g || !v.localViews) return null;
  var lv = v.localViews[seat]; if (!lv) return null;
  var opts = null;
  function aliveOthers() {
    var out = [];
    for (var i = 0; i < v.players.length; i++) { var p = v.players[i]; if (p.seat !== seat && g.aliveMap && g.aliveMap[p.seat]) out.push(p); }
    return out;
  }
  if (g.id === 'ma-soi' && lv.myAlive) {
    if (g.phase === 'night') {
      if (lv.myRole === 'soi' && lv.myWolfVote == null) {
        opts = aliveOthers().map(function (p) { return { label: esc(p.name) + ((lv.wolfTeam || []).indexOf(p.seat) >= 0 ? ' 🐺 đồng đội' : ''), act: { action: 'wolfVote', seat: p.seat } }; });
      } else if (lv.myRole === 'bao-ve' && lv.myGuardPick == null) {
        opts = [];
        for (var gi = 0; gi < v.players.length; gi++) { var gp = v.players[gi]; if (!g.aliveMap || !g.aliveMap[gp.seat]) continue; if (gp.seat === lv.myGuardLast) continue; opts.push({ label: esc(gp.name) + (gp.seat === seat ? ' (bạn)' : ''), act: { action: 'wolfGuard', seat: gp.seat } }); }
      } else if (lv.myRole === 'tien-tri' && lv.mySeerPick == null) {
        opts = aliveOthers().map(function (p) { return { label: esc(p.name), act: { action: 'wolfSeer', seat: p.seat } }; });
      } else if (lv.myRole === 'phu-thuy' && !lv.myWitchDone && lv.wolvesIn) {
        opts = [];
        if (lv.myVictim && (lv.mySaveLeft || 0) > 0) opts.push({ label: '🧪 Cứu ' + esc(lkPlayerName(v, lv.myVictim)) + (lv.myWitchSave ? ' ✓ đang chọn' : ''), act: { action: 'wolfWitch', save: true } });
        if ((lv.myPoisonLeft || 0) > 0) {
          var ao = aliveOthers();
          for (var pi = 0; pi < ao.length; pi++) opts.push({ label: '☠️ Độc: ' + esc(ao[pi].name) + (lv.myWitchPoison === ao[pi].seat ? ' ✓ đang chọn' : ''), act: { action: 'wolfWitch', poison: ao[pi].seat } });
        }
        opts.push({ label: '✔ Xong — đi ngủ', act: { action: 'wolfWitch', done: true } });
      }
    } else if (g.phase === 'vote' && !(g.voted && g.voted[seat])) {
      opts = aliveOthers().map(function (p) { return { label: esc(p.name), act: { action: 'vote', seat: p.seat } }; });
    }
  } else if (g.id === 'ke-gia-mao' && g.phase === 'vote' && lv.myVote == null) {
    opts = [];
    for (var vi = 0; vi < v.players.length; vi++) { var vp = v.players[vi]; if (vp.seat !== seat) opts.push({ label: esc(vp.name), act: { action: 'vote', seat: vp.seat } }); }
  } else if (g.id === 'ca-ngua' && g.phase === 'pick' && lv.myTurn && lv.myLegal && lv.myLegal.length) {
    opts = lv.myLegal.map(function (e) { return { label: '🐴 Ngựa ' + (e.horse + 1) + ' · ' + esc(e.hint), act: { action: 'move', horse: e.horse } }; });
  }
  if (!opts || !opts.length) return null;
  var sig = g.id + '|' + g.phase + '|' + opts.map(function (o) { return JSON.stringify(o.act); }).join(',');
  var st = lkState(seat);
  if (st.sig !== sig) { st.sig = sig; st.cur = 0; }
  if (st.cur >= opts.length) st.cur = opts.length - 1;
  if (st.cur < 0) st.cur = 0;
  return { options: opts };
}
function lkPickHTML(v, seat) {
  var got = lkOptions(v, seat);
  if (!got) return '';
  var st = lkState(seat);
  var h = '<div class="lplist">';
  for (var i = 0; i < got.options.length; i++) h += '<div class="lprow' + (i === st.cur ? ' cur' : '') + '">' + got.options[i].label + '</div>';
  h += '</div><div class="lpfoot">Phím lên/xuống: chọn · A: xác nhận</div>';
  return h;
}
// Tiến Lên local panel state: the seat's card selection + cursor,
// kept in LK (outside the rendered HTML) and reset whenever the hand
// signature changes — the same discipline as the phone's S.tlSel.
function lkTlSync(seat, lv) {
  var st = lkState(seat);
  var hand = (lv && lv.myHand) || [];
  var sig = hand.join(',');
  if (st.tlSig !== sig) { st.tlSig = sig; st.tlSel = []; st.tlCur = 0; }
  if (!st.tlSel) st.tlSel = [];
  if (st.tlCur == null || st.tlCur < 0) st.tlCur = 0;
  if (st.tlCur >= hand.length) st.tlCur = Math.max(0, hand.length - 1);
  return hand;
}
function lkTienLenKey(seat, bit, fresh, repeat) {
  var v = S.view; var g = v && v.game;
  if (!g || g.id !== 'tien-len' || g.phase !== 'cards') return false;
  var lv = (v.localViews || {})[seat]; if (!lv) return false;
  var st = lkState(seat);
  var hand = lkTlSync(seat, lv);
  if (bit === 'l' || bit === 'r') {
    if (hand.length) {
      var nc = Math.max(0, Math.min(hand.length - 1, st.tlCur + (bit === 'l' ? -1 : 1)));
      if (nc !== st.tlCur) { st.tlCur = nc; renderLocalPanels(); }
    }
    return true;
  }
  if (!fresh || repeat) return true;
  if (bit === 'a') {
    if (hand.length) {
      var cid = hand[st.tlCur];
      var ix = st.tlSel.indexOf(cid);
      if (ix >= 0) st.tlSel.splice(ix, 1); else st.tlSel.push(cid);
      renderLocalPanels();
    }
    return true;
  }
  if (bit === 'b') {
    if (st.tlSel.length) localAct(seat, { action: 'play', cards: st.tlSel.slice() });
    return true;
  }
  if (bit === 'x') { localAct(seat, { action: 'pass' }); return true; }
  if (bit === 'u' || bit === 'd' || bit === 'y') return true;
  return false;
}
function lkPanelBody(v, seat) {
  var g = v.game; var lv = (v.localViews || {})[seat] || {}; var st = lkState(seat);
  if (g.phase === 'countdown') return '<div class="lpline">⏳ Chuẩn bị… sẵn sàng trên bộ phím của bạn!</div>';
  if (g.id === 'ke-gia-mao') {
    if (g.phase === 'answer') {
      var kh = '';
      if (lv.mine != null) kh += '<div class="lpline">✅ Đã trả lời — đợi mọi người…</div>';
      if (st.peek && lv.myQuestion) {
        kh += '<div class="lpsecret"><b>' + esc(lv.myQuestion) + '</b>';
        if (lv.options) for (var oi = 0; oi < lv.options.length; oi++) kh += '<div>' + (oi + 1) + '. ' + esc(lv.options[oi]) + '</div>';
        kh += '</div><div class="lpfoot">A/B/X: đáp án 1–3 · chạm nhanh Y: đáp án 4</div>';
      } else if (lv.mine == null) kh += '<div class="lpline">🤫 Giữ phím Y của bạn để xem câu hỏi</div>';
      return kh;
    }
    if (g.phase === 'discuss') return '<div class="lpline">🗣️ Thảo luận trực tiếp với nhau!</div>';
    if (g.phase === 'vote') {
      if (lv.myVote != null) return '<div class="lpline">✅ Đã tố cáo — đợi kết quả…</div>';
      return '<div class="lpline">🕵️ Tố cáo ai là kẻ giả mạo?</div>' + lkPickHTML(v, seat);
    }
    if (g.phase === 'reveal') return '<div class="lpline">🧐 Xem kẻ giả mạo lộ diện trên màn hình!</div>';
    return '';
  }
  if (g.id === 'ma-soi') {
    if (lv.myAlive === false) return '<div class="lpline">💀 Bạn đã chết — theo dõi trên TV</div>';
    var mh = '';
    if (lv.myRole) {
      if (st.peek) {
        mh += '<div class="lpsecret">Vai của bạn: <b>' + (WOLF_ROLE_NAMES[lv.myRole] || '') + '</b>';
        if (lv.myRole === 'soi' && lv.wolfTeam) mh += '<div>Bầy sói: ' + lv.wolfTeam.map(function (s2) { return esc(lkPlayerName(v, s2)); }).join(', ') + '</div>';
        if (lv.myRole === 'tien-tri' && lv.mySeerNotes && lv.mySeerNotes.length) mh += '<div>Sổ tay: ' + lv.mySeerNotes.map(function (n2) { return esc(lkPlayerName(v, n2.seat)) + (n2.wolf ? ' 🐺' : ' ✅'); }).join(' · ') + '</div>';
        mh += '</div>';
      } else mh += '<div class="lpline">🤫 Giữ phím Y để xem vai trò</div>';
    }
    if (g.phase === 'night' && lv.myAlive) {
      if (lv.myRole === 'soi') mh += (lv.myWolfVote != null) ? '<div class="lpline">✅ Đã chọn con mồi: ' + esc(lkPlayerName(v, lv.myWolfVote)) + '</div>' : '<div class="lpline">🐺 Chọn con mồi đêm nay:</div>' + lkPickHTML(v, seat);
      else if (lv.myRole === 'bao-ve') mh += (lv.myGuardPick != null) ? '<div class="lpline">🛡️ Đang bảo vệ: ' + esc(lkPlayerName(v, lv.myGuardPick)) + '</div>' : '<div class="lpline">🛡️ Đêm nay bạn bảo vệ ai?</div>' + lkPickHTML(v, seat);
      else if (lv.myRole === 'tien-tri') {
        if (lv.mySeerPick != null) { var seen1 = (lv.mySeerNotes || []).filter(function (n3) { return n3.seat === lv.mySeerPick; })[0]; mh += '<div class="lpline">🔮 ' + esc(lkPlayerName(v, lv.mySeerPick)) + (seen1 && seen1.wolf ? ' LÀ SÓI! 🐺' : ' là dân lành ✅') + '</div>'; }
        else mh += '<div class="lpline">🔮 Đêm nay bạn soi ai?</div>' + lkPickHTML(v, seat);
      } else if (lv.myRole === 'phu-thuy') {
        if (lv.myWitchDone) mh += '<div class="lpline">🧙 Đã quyết định xong — đi ngủ thôi!</div>';
        else if (!lv.wolvesIn) mh += '<div class="lpline">🧙 Đợi bầy sói chọn xong con mồi…</div>';
        else mh += '<div class="lpline">Con mồi của sói: ' + (lv.myVictim ? esc(lkPlayerName(v, lv.myVictim)) : '—') + ' · 🧪 cứu ×' + (lv.mySaveLeft || 0) + ' · ☠️ độc ×' + (lv.myPoisonLeft || 0) + '</div>' + lkPickHTML(v, seat);
      } else if (lv.myRole === 'dan') mh += '<div class="lpline">😴 Bạn là dân làng — ngủ ngon, đợi trời sáng…</div>';
    } else if (g.phase === 'vote' && lv.myAlive) {
      if (g.voted && g.voted[seat]) mh += '<div class="lpline">✅ Đã bỏ phiếu! Đợi kết quả…</div>';
      else mh += '<div class="lpline">⚖️ Treo cổ ai? Chọn người bạn nghi là sói:</div>' + lkPickHTML(v, seat);
    } else if (g.phase === 'discuss') {
      mh += '<div class="lpline">🗣️ Bàn luận trực tiếp: ai là sói?</div>';
    }
    return mh;
  }
  if (g.id === 'ca-ngua') {
    if (g.phase === 'roll') return lv.myTurn ? '<div class="lpline">🎲 Lượt của bạn — nhấn phím A để thảy xúc xắc!</div>' : '';
    if (g.phase === 'pick') {
      if (!lv.myTurn) return '';
      return '<div class="lpline">🎲 Bạn thảy được ' + (g.dice || '') + ' chấm — chọn ngựa để đi:</div>' + lkPickHTML(v, seat);
    }
    return '';
  }
  if (g.id === 'tien-len') {
    if (g.phase === 'tlWin') {
      var winL = g.winner ? playerOf(v, g.winner) : null;
      return '<div class="lpline">🏆 ' + esc(winL ? winL.name : '') + ' thắng Tiến Lên!' + (lv.myRank ? ' Bạn về hạng ' + lv.myRank + '.' : '') + '</div>';
    }
    if (g.phase !== 'cards') return '';
    if (lv.myRank) return '<div class="lpline">🏆 Bạn đã hết bài — về hạng ' + lv.myRank + '! Xem TV đợi kết quả…</div>';
    var handL = lkTlSync(seat, lv);
    var stl = lkState(seat);
    var th = '';
    if (g.table) {
      var tpL = playerOf(v, g.table.seat);
      th += '<div class="lpline">Trên bàn: ' + tlChipsHTML(g.table.cards, true) + ' <span class="lpfoot">(' + esc(tpL ? tpL.name : '') + ' · ' + (TL_KIND_NAMES[g.table.kind] || '') + ')</span></div>';
    } else {
      th += '<div class="lpline">🃏 Bàn trống</div>';
    }
    th += '<div class="lpline">';
    for (var tci = 0; tci < handL.length; tci++) {
      var tcd = handL[tci];
      th += '<span class="tlp' + (tlCardRed(tcd) ? ' red' : '') + (stl.tlSel.indexOf(tcd) >= 0 ? ' sel' : '') + (tci === stl.tlCur ? ' cur' : '') + '">' + tlCardLabel(tcd) + '</span>';
    }
    th += '</div>';
    if (lv.myTurn) {
      th += '<div class="lpline">' + (g.table ? '⚔️ Lượt của bạn — đã chọn ' + stl.tlSel.length + ' lá để chặn' : '👑 Bạn cầm cái — đã chọn ' + stl.tlSel.length + ' lá') + (lv.mustInclude3 ? ' · <b>phải có lá 3♠!</b>' : '') + '</div>';
    } else if (lv.myPassed) {
      th += '<div class="lpline">✋ Bạn đã bỏ lượt vòng này — đợi vòng mới…</div>';
    } else {
      var tnL = g.turn ? playerOf(v, g.turn) : null;
      th += '<div class="lpline">Đợi lượt… (đang là lượt của ' + esc(tnL ? tnL.name : '') + ')</div>';
    }
    th += '<div class="lpfoot">◀▶ chọn lá · A lật chọn · B đánh · X bỏ lượt</div>';
    return th;
  }
  if (g.id === 'do-vui') {
    if (g.phase === 'question') return '<div class="lpline">' + (lv.mine != null ? '✅ Đã trả lời — đợi kết quả…' : '⌨️ A/B/X/Y = chọn đáp án 1–4') + '</div>';
    return '';
  }
  if (g.id === 'giai-ma-chung') return '<div class="lpline">⌨️ A/B/X/Y = bấm ký hiệu của bạn</div>';
  if (g.id === 'cao-boi') return '<div class="lpline">🔫 Nghe hiệu lệnh… phím A = BẮN!</div>';
  if (g.id === 'chia-cuop') {
    if (g.phase === 'choose') return '<div class="lpline">🤝 Phím A = Chia · B = Cướp (chọn bí mật)</div>';
    if (g.phase === 'talk') return '<div class="lpline">🗣️ Thương lượng trực tiếp với nhau!</div>';
    return '';
  }
  if (g.id === 'cheo-thuyen' && g.phase === 'row') return '<div class="lpline">🚣 Phím A = chèo theo nhịp!</div>';
  if (g.id === 'keo-co') return '<div class="lpline">🪢 Nhấn liên tục phím B để KÉO!</div>';
  // Pad games need no panel body while playing: the header chip
  // (name + key set) is the whole panel. The repeated "move with
  // your key set" sentence was on every panel, in every game, all
  // the time — pure clutter over the field corners.
  if (LK_PAD_GAMES[g.id]) return '';
  return '';
}
function lkPanelHTML(v, loc, idx) {
  var p = playerOf(v, loc.seat);
  var sc = LK_SCHEMES[loc.scheme || 0] || LK_SCHEMES[0];
  var h = '<div class="lpanel lp' + idx + '">';
  h += '<div class="lphead"><span class="lpdot" style="background:' + (COLORS[p ? p.color : 'blue'] || '#888888') + '"></span><b>' + esc(p ? p.name : '') + '</b><span class="lpscheme">' + esc(sc.name) + '</span></div>';
  h += lkPanelBody(v, loc.seat);
  return h + '</div>';
}
function renderLocalPanels() {
  var box = el('localpanels');
  if (!box) { box = document.createElement('div'); box.id = 'localpanels'; document.body.appendChild(box); }
  var v = S.view;
  // Scheme watch: a seat whose layout was just rotated in the lobby
  // (Đổi bộ phím) must not keep pad bits pressed under the OLD mapping
  // — drop its snapshot and push the cleared state before anything
  // else reads it. Runs in every phase because the rotation itself
  // happens in the lobby.
  if (S.role === 'host' && v && v.locals) {
    for (var swi = 0; swi < v.locals.length; swi++) {
      var swl = v.locals[swi]; var sws = LK[swl.seat]; if (!sws) continue;
      var swScheme = swl.scheme || 0;
      if (sws.schemeSeen === undefined) { sws.schemeSeen = swScheme; continue; }
      if (sws.schemeSeen !== swScheme) {
        sws.schemeSeen = swScheme;
        var swDirty = false;
        for (var swb = 0; swb < LK_BITS.length; swb++) if (sws.pad[LK_BITS[swb]]) { sws.pad[LK_BITS[swb]] = false; swDirty = true; }
        sws.peek = false;
        if (swDirty) sendLocalPad(swl.seat);
      }
    }
  }
  if (S.role !== 'host' || !v || v.phase !== 'playing' || !v.game || !v.locals || !v.locals.length) { if (S._panelH) { S._panelH = ''; box.innerHTML = ''; } return; }
  var h = '';
  for (var i = 0; i < v.locals.length && i < 4; i++) h += lkPanelHTML(v, v.locals[i], i);
  // Compare against the stored string, not box.innerHTML: reading
  // innerHTML back serializes the subtree on every 150 ms tick.
  if (S._panelH !== h) { S._panelH = h; box.innerHTML = h; }
}
function lkTranslate(seat, bit) {
  var v = S.view; var g = v.game; if (!g) return;
  var lv = (v.localViews || {})[seat] || {};
  var ci = bit === 'a' ? 0 : bit === 'b' ? 1 : bit === 'x' ? 2 : bit === 'y' ? 3 : -1;
  if (g.id === 'do-vui' && g.phase === 'question') { if (ci >= 0 && lv.mine == null) localAct(seat, { action: 'answer', choice: ci }); }
  else if (g.id === 'ke-gia-mao' && g.phase === 'answer') { if (ci >= 0 && ci < 3 && lv.mine == null) localAct(seat, { action: 'answer', choice: ci }); }
  else if (g.id === 'giai-ma-chung') { if (ci >= 0) localAct(seat, { action: 'symbol', sym: ci }); }
  else if (g.id === 'cao-boi') { if (bit === 'a') localAct(seat, { action: 'tap' }); }
  else if (g.id === 'cheo-thuyen' && g.phase === 'row') { if (bit === 'a') localAct(seat, { action: 'tap' }); }
  else if (g.id === 'ca-ngua' && g.phase === 'roll') { if (bit === 'a' && lv.myTurn) localAct(seat, { action: 'roll' }); }
}
window.addEventListener('keydown', function (ev) {
  if (!lkActive()) return;
  var t = ev.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  var hit = lkFind(ev.code); if (!hit) return;
  ev.preventDefault();
  var seat = hit.seat, bit = hit.bit, st = lkState(seat);
  var fresh = !st.pad[bit];
  if (bit === 'y' && fresh) { st.peek = true; st.yAt = Date.now(); renderLocalPanels(); }
  // A visible pick list claims up/down (cursor, repeats welcome) and A
  // (confirm, fresh presses only); every other fresh press falls to
  // the per-game discrete translations. Pad state below tracks ALL
  // mapped keys regardless — the server ignores pads in list games.
  // Tiến Lên claims its own keys first (card cursor + toggle + play +
  // pass live in lkTienLenKey); its pick list is a hand of cards, not
  // an lkOptions list.
  var tlHandled = lkTienLenKey(seat, bit, fresh, ev.repeat);
  var opts = tlHandled ? null : lkOptions(S.view, seat);
  if (opts && (bit === 'u' || bit === 'd')) {
    if (fresh || ev.repeat) { st.cur = (st.cur + (bit === 'u' ? opts.options.length - 1 : 1)) % opts.options.length; renderLocalPanels(); }
  } else if (opts && bit === 'a') {
    if (fresh && !ev.repeat) { var o = opts.options[st.cur]; if (o) localAct(seat, o.act); }
  } else if (!tlHandled && fresh && !ev.repeat) {
    lkTranslate(seat, bit);
  }
  if (!st.pad[bit]) { st.pad[bit] = true; sendLocalPad(seat); }
});
window.addEventListener('keyup', function (ev) {
  if (S.role !== 'host') return;
  var hit = lkFind(ev.code); if (!hit) return;
  var seat = hit.seat, bit = hit.bit, st = lkState(seat);
  if (st.pad[bit]) { st.pad[bit] = false; sendLocalPad(seat); }
  if (bit === 'y' && st.peek) {
    st.peek = false;
    var v = S.view;
    if (v && v.game && v.game.id === 'ke-gia-mao' && v.game.phase === 'answer' && Date.now() - st.yAt < 300) {
      var lv = (v.localViews || {})[seat] || {};
      if (lv.mine == null) localAct(seat, { action: 'answer', choice: 3 });
    }
    renderLocalPanels();
  }
});
window.addEventListener('blur', function () {
  // Never leave a local pad bit stuck on the server when the TV window
  // loses focus mid-hold: clear every seat's snapshot and push it.
  for (var seat in LK) {
    var st = LK[seat]; var dirty = false;
    for (var b = 0; b < LK_BITS.length; b++) if (st.pad[LK_BITS[b]]) { st.pad[LK_BITS[b]] = false; dirty = true; }
    st.peek = false;
    if (dirty && S.role === 'host' && S.view && S.view.locals) sendLocalPad(+seat);
  }
  renderLocalPanels();
});
(function init() {
  try {
    var raw = sessionStorage.getItem('np_session');
    if (raw) { var s = JSON.parse(raw); if (s && s.code && s.token) { S.role = s.role; S.code = s.code; S.token = s.token; S.seat = s.seat; S.phoneMode = !!s.phoneMode; S.lastOkAt = Date.now(); } }
  } catch (e) {}
  wsEnsure();
  render();
  if (RAF_OK) requestAnimationFrame(rafLoop);
  window.addEventListener('resize', function () { S.fieldRect = null; });
  setInterval(poll, 800);
  setInterval(tick, 150);
  // Tick pump: while a game is playing, the host page drives the
  // server loop over the WebSocket every ~50 ms. The platform alarm
  // that normally drives the loop measured ~118 ms per cycle on the
  // user's own room (their ping is only 30 ms — the message path is
  // fast, the alarm path is not), so state arrived in ~118 ms lumps
  // and the world juddered at that rhythm in every game. Driving
  // the loop from inside the message handler restores a ~60 ms
  // cadence. The alarm stays armed as a backstop; advance() is
  // time-based, so pump + alarm together can never double-step
  // the simulation.
  setInterval(function () {
    if (S.role !== 'host' || !S.view || S.view.phase !== 'playing' || !S.view.game) return;
    if (!wsOpen() || wsStale()) return;
    var nowP = Date.now();
    if (S._pumpAt && nowP - S._pumpAt < 30) return;
    if (S.lastStateAt && nowP - S.lastStateAt < 25) return;
    S._pumpAt = nowP;
    try { wsConn.send(JSON.stringify({ action: 'tick' })); } catch (e) {}
  }, 30);
  setInterval(function () {
    var v = S.view;
    if (v && v.game && ((v.game.id === 'cao-boi' && (v.game.phase === 'wait' || v.game.phase === 'go')) || (v.game.id === 'day-ra' && v.game.phase === 'arena') || (v.game.id === 'ne-dan' && v.game.phase === 'dodge') || (v.game.id === 'keo-co' && v.game.phase === 'pull') || (v.game.id === 'cuop-sao' && v.game.phase === 'steal') || (v.game.id === 'giu-vuong-mien' && v.game.phase === 'crown') || (v.game.id === 'son-san' && v.game.phase === 'splat') || (v.game.id === 'chung-mot-than' && v.game.phase === 'shared') || (v.game.id === 'day-hop' && v.game.phase === 'box') || (v.game.id === 'cheo-thuyen' && v.game.phase === 'row') || (v.game.id === 'xe-tank' && v.game.phase === 'tank') || (v.game.id === 'dat-bom' && v.game.phase === 'bomber') || (v.game.id === 'thu-thanh' && v.game.phase === 'defend') || (v.game.id === 'nguoi-que' && v.game.phase === 'fight') || (v.game.id === 'den-lua-nuoc' && v.game.phase === 'temple') || (v.game.id === 'da-bong' && (v.game.phase === 'soccer' || v.game.phase === 'goal')) || (v.game.id === 'ech-op' && (v.game.phase === 'frog' || v.game.phase === 'frogClear')) || (v.game.id === 'can-goc' && (v.game.phase === 'shell' || v.game.phase === 'boom')))) { if (!wsOpen() || wsStale()) poll(); }
  }, 120);
})();
</script>
</body>
</html>`;

