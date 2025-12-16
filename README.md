# SmartShift

[rshift.jp](https://rshift.jp) のシフト管理 UX を改善する Chrome 拡張機能。

## ✨ 機能

- **設定ボタン** - ワンクリックでシフト/休日を設定
- **曜日一括設定ボタン** - 曜日ごとに一括でシフト/休日を設定
- **プリセット管理** - 複数のシフトパターンを保存・切り替え

## 📦 インストール

### 開発版

1. リポジトリをクローン

   ```bash
   git clone https://github.com/yourusername/smartshift.git
   cd smartshift
   ```

2. 依存関係をインストール

   ```bash
   bun install
   ```

3. ビルド

   ```bash
   bun run build
   ```

4. Chrome に読み込み
   - `chrome://extensions` を開く
   - 「デベロッパーモード」を有効化
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist` フォルダを選択

## 🛠️ 開発

### 必要な環境

- [Bun](https://bun.sh) (ランタイム・パッケージマネージャー)

## 📝 ライセンス

MIT
