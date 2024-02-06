// ==UserScript==
// @name         GitHub Markdown Edit Shortcut
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Press 'E' to edit GitHub issues and PRs
// @author       Keisuke Kawhara (@ktansai)
// @match        https://github.com/*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  document.addEventListener('keydown', function(e) {
      // 'e' キーが押された時のみ実行
      if (e.key === 'e') {
          // 編集ボタンのセレクタを定義 (GitHubの構造に依存)
          let editButtonSelector = '.js-comment-edit-button';

          // 編集ボタンを探す
          let editButtons = document.querySelectorAll(editButtonSelector);

          // 最初の編集ボタンにフォーカスし、クリックイベントを発火
          if (editButtons.length > 0) {
              editButtons[0].focus();
              editButtons[0].click();
          }
      }
  });
})();
