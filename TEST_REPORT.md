# Ver.2.3 Test Report

実施日: 2026-10-22

## 確認済み
- JavaScript構文チェック: PASS
- Ver.2.3表記とOVERDRIVE設定の読み込み: PASS
- 旧 wallFX / drawGate 関数が存在しない: PASS
- 物理壁係数: 0
- 左側OUT: PASS
- 右側OUT: PASS
- 上側OUT: PASS
- 下側OUT: PASS
- 発射した本人の駒が場外: 0点（PASS）
- 発射駒が別の通常文字を押し出す: +10点（PASS）
- LEVEL 1衝突: 小火花 + 小衝撃波（PASS）
- LEVEL 2衝突: 粒子増加 + ヒットストップ + 画面揺れ（PASS）
- LEVEL 3衝突: 多重衝撃波 + 大量火花 + BANG/CRASH + 強い画面揺れ（PASS）
- 連続衝突: HITカウント増加（PASS）
- 盤面3枚の状態から自動補充: 9枚へ補充 / 補充6枚（PASS）
- 画面揺れ設定: 初期ON、OFF可能なUIを追加（PASS）
- オンラインプロトコル番号: 23へ更新（静的確認PASS）

## 未検証
- 実際の2台・別回線でのWebRTC対戦
- iPhone Safari / Android Chrome実機での長時間60fps
- 低スペック端末で大量の連続衝突が起きた際の実測fps
- 外部写真素材すべてのURL読み込み成功
