// ==UserScript==
// @name         GitHub Video Snippet Replacer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Replace /video with <video src="" /> in GitHub comment boxes
// @author       Your Name
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // コメント入力欄を監視する関数
    function observeCommentBoxes() {
        // GitHubのコメント入力欄のセレクタを特定
        // これはGitHubのUI変更により変わる可能性があるため、必要に応じて調整してください。
        const commentBoxes = document.querySelectorAll('textarea[id^="issuecomment-new-body"], textarea[id^="pull_request_comment_body"], textarea[name="comment[body]"]');

        commentBoxes.forEach(box => {
            box.addEventListener('input', function() {
                const cursorPosition = this.selectionStart;
                const textBeforeCursor = this.value.substring(0, cursorPosition);
                const textAfterCursor = this.value.substring(cursorPosition);

                // `/video` が入力されたかチェック
                if (textBeforeCursor.endsWith('/video')) {
                    const newText = textBeforeCursor.slice(0, -6) + '<video src="" />' + textAfterCursor;
                    this.value = newText;

                    // カーソルを src="" の中に移動させる
                    const newCursorPosition = textBeforeCursor.slice(0, -6).length + '<video src="'.length;
                    this.setSelectionRange(newCursorPosition, newCursorPosition);
                }
            });
        });
    }

    // MutationObserverを使って、DOMの変更を監視し、動的に追加されるコメント入力欄にも対応
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                // 新しく追加されたノードの中にコメントボックスがあるかチェック
                observeCommentBoxes();
            }
        });
    });

    // ドキュメント全体を監視対象とする
    observer.observe(document.body, { childList: true, subtree: true });

    // 初期ロード時にもコメントボックスを監視
    observeCommentBoxes();
})();