# 表情符號疊加器 Emoji Overlay App

一個簡單的網頁應用程式，讓您可以將表情符號疊加在您上傳的圖片上，並調整表情符號的大小和位置。

## 特點

- 上傳圖片（拖曳或點擊上傳按鈕）
- 從側邊欄選擇表情符號
- 調整表情符號的大小和位置
- 下載合成後的圖片

## 版權聲明

本專案使用的表情符號 SVG 檔案來自 Google Noto Emoji：

```
Copyright 2013 Google, Inc. All Rights Reserved.
Licensed under the Apache License, Version 2.0
```

即使是私人用途，也請在使用的 SVG 或其伴隨的檔案中保留上述版權與授權聲明。本程式碼已在 SVG 加載過程中自動保留這些資訊。

## 部署至 GitHub Pages

1. **創建一個 GitHub 儲存庫**

   在 GitHub 上創建一個新的儲存庫。

2. **將檔案上傳至儲存庫**

   將這個專案的檔案上傳至您的儲存庫，包括：
   - HTML, CSS, JavaScript 檔案
   - LICENSE 和 NOTICE 檔案（保留著作權資訊）

3. **設置 emojis_svg 目錄**

   將您的 SVG 表情符號文件複製到 `emojis_svg` 目錄中，確保保留版權資訊。

4. **生成表情符號清單**

   使用 Node.js 運行以下命令生成表情符號清單：

   ```bash
   node create-manifest.js
   ```

   這將生成 `emoji-manifest.json` 文件，其中包含所有表情符號文件的路徑。

5. **啟用 GitHub Pages**

   前往儲存庫的「Settings」頁面，找到「Pages」部分，然後從 `main` 分支的根目錄啟用 GitHub Pages。

## 本地開發

1. **克隆儲存庫**

   ```bash
   git clone <your-repository-url>
   cd emoji-overlay
   ```

2. **設置 emojis_svg 目錄**

   將您的 SVG 表情符號文件複製到 `emojis_svg` 目錄中。

3. **生成表情符號清單**

   ```bash
   node create-manifest.js
   ```

4. **啟動本地伺服器**

   您可以使用任何靜態文件服務器來測試應用程式，例如：

   ```bash
   npx http-server
   ```

   然後在瀏覽器中訪問 `http://localhost:8080`。

## 自訂

- **更改顏色主題**：編輯 `styles.css` 文件中的顏色變數。
- **添加更多功能**：您可以通過編輯 `editor.js` 文件來添加更多功能，例如濾鏡或文字疊加。

## 注意事項

- 此應用程式在現代瀏覽器（Chrome、Firefox、Safari、Edge）上運行最佳。
- 所有處理都是在客戶端進行的，不會上傳您的圖片到任何伺服器。
- SVG 表情符號採用懶加載方式，以提高性能。

## 授權

- 應用程式程式碼採用 MIT License
- SVG 表情符號採用 Apache License, Version 2.0

請參閱 LICENSE 和 NOTICE 檔案了解完整的授權資訊。