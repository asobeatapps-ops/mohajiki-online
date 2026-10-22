# 検証レポート / もはじき 2.2

実施日: 2026-10-22

**37項目中37項目通過。** ただし、実写真の配信・実回線のオンライン接続・Safari実機の合格を意味しません。

## 方法

- Playwright + ヘッドレスChromium (Linux)。端末画面サイズは390x844、844x390、1366x900。
- 外部通信・ローカルURLのナビゲーションに環境制限があるため、同一のゲームコードをHTMLに内包しpage.set_contentで実行。HTTP配信・GitHub Pages公開の検証ではありません。
- マルチタッチはChromium DevTools ProtocolのInput.dispatchTouchEventで入力。両方の指を離す順番も入れ替えて確認。
- 物理テストは位置を固定したテスト用盤面で実行。テスト用の状態書き換えフックは配布用game.jsには含めていません。
- 通信はPeerJSと同じ形式の模擬通信路を用意。ゲーム本体の受信・検証・同期処理をそのまま2画面で通しました。実際のPeerJSサーバーへは接続していません。
- 写真ルートの検証には合成した色・縞模様の画像を利用。実際の動物写真の確認ではありません。

## テスト結果

| 範囲 | 検証項目 | 結果 |
|---|---|---|
| Local browser | mobile initial render/no horizontal overflow | PASS |
| Local browser | v2.2 configuration | PASS |
| Local browser | second touch cancels outside=False original-first | PASS |
| Local browser | no shot/no turn consumed outside=False original-first | PASS |
| Local browser | second touch cancels outside=True second-first | PASS |
| Local browser | no shot/no turn consumed outside=True second-first | PASS |
| Local browser | second touch cancels outside=True original-first | PASS |
| Local browser | no shot/no turn consumed outside=True original-first | PASS |
| Local browser | return-to-origin cancels even with off-center grab | PASS |
| Local browser | normal touch release fires exactly once | PASS |
| Local browser | high-speed collision transfers velocity without tunneling | PASS |
| Local browser | high-speed solid wall reflects | PASS |
| Local browser | real letter collision fuses and scores | PASS |
| Local browser | all 21 fusion effects run with finite state | PASS |
| Local browser | local game completes after 12 shots | PASS |
| Local browser | rematch resets scores and shots | PASS |
| Local browser | CPU chooses and fires on its turn | PASS |
| Local browser | landscape no horizontal overflow | PASS |
| Local browser | no runtime JavaScript errors | PASS |
| Mock transport / two pages | mock transport room join | PASS |
| Mock transport / two pages | both clients share distinct companion profiles | PASS |
| Mock transport / two pages | both clients share power configuration | PASS |
| Mock transport / two pages | host shot/turn reaches guest | PASS |
| Mock transport / two pages | guest second-finger cancel sends no shot message | PASS |
| Mock transport / two pages | host accepts guest 1690 max-power shot | PASS |
| Mock transport / two pages | scores and remaining synchronized | PASS |
| Mock transport / two pages | both online clients finish 12 turns | PASS |
| Mock transport / two pages | two-party online rematch resets correctly | PASS |
| Mock transport / two pages | no online runtime errors | PASS |
| Synthetic image fixtures | companion image cards draw loaded fixture images | PASS |
| Synthetic image fixtures | white cat selection uses white-cat asset | PASS |
| Synthetic image fixtures | distinct combo photo asset requests | PASS |
| Synthetic image fixtures | terrain photo aliases resolve and draw | PASS |
| Synthetic image fixtures | companion choices frozen during match | PASS |
| Synthetic image fixtures | 37 companion variant effect paths run | PASS |
| Synthetic image fixtures | empty board auto-passes to result | PASS |
| Synthetic image fixtures | no photo-branch runtime errors | PASS |

## 未検証・残る課題

実写真の通信取得・実写真の切り抜き位置、iPhone Safari/Android Chrome実機、実回線のWebRTC/NAT/TURN、再接続の実回線動作、カメラ権限と実映像、実ドメインでのlocalStorage再読込後の復元、継続的な60fps、先後手の勝率・バランスの大規模検証は未実施です。

改修後の実際の公開URLは本作業では発行・更新していません。
