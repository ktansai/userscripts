// ==UserScript==
// @name         GitHub Generic Snippet Replacer
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Replace custom shortcuts with predefined snippets in any textarea on GitHub.
// @author       Keisuke Kawahara (@ktansai)
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- スニペット設定 ---
    // ここにショートカットと対応するスニペットを追加してください。
    // キーは入力するショートカット（例: "/video"）、値は置換されるテキストです。
    // カーソルを移動させたい場合は、`|` をカーソルを置きたい位置に含めてください。
    // 例: { "/video": "<video src=\"|\" />" }
    const snippets = {
        "/video ": "<video src=\"|\" />",
        "/img ": "<img width=\"\" src=\"|\" />"
    };
    // ----------------------

    const CURSOR_PLACEHOLDER = '|';

    function applySnippet(textarea, shortcut, snippetContent) {
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        const textAfterCursor = textarea.value.substring(cursorPosition);

        // ショートカットが入力された部分を正確に特定し、置換
        const shortcutStartIndex = textBeforeCursor.lastIndexOf(shortcut);
        if (shortcutStartIndex === -1) {
            return; // ショートカットが見つからない場合は何もしない
        }

        const textBeforeShortcut = textBeforeCursor.substring(0, shortcutStartIndex);

        let newText;
        let newCursorOffset = 0;

        // カーソルプレースホルダーがある場合
        if (snippetContent.includes(CURSOR_PLACEHOLDER)) {
            const parts = snippetContent.split(CURSOR_PLACEHOLDER);
            newText = textBeforeShortcut + parts[0] + parts[1] + textAfterCursor;
            newCursorOffset = parts[0].length; // カーソルは最初の部分の長さ分移動
        } else {
            // カーソルプレースホルダーがない場合、スニペットの末尾にカーソルを置く
            newText = textBeforeShortcut + snippetContent + textAfterCursor;
            newCursorOffset = snippetContent.length;
        }

        textarea.value = newText;

        // カーソル位置を設定
        const newCursorPosition = textBeforeShortcut.length + newCursorOffset;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }

    function observeTextareas() {
        // ページ上の全ての textarea 要素を選択
        const textareas = document.querySelectorAll('textarea');

        textareas.forEach(box => {
            // 既にイベントリスナーが追加されていないかチェック
            if (!box.dataset.snippetListenerAdded) {
                box.addEventListener('input', function() {
                    const currentCursorPosition = this.selectionStart;
                    const textBeforeCursor = this.value.substring(0, currentCursorPosition);

                    // 定義されたすべてのショートカットをチェック
                    for (const shortcut in snippets) {
                        if (textBeforeCursor.endsWith(shortcut)) {
                            // ショートカットが入力されたら置換処理を実行
                            applySnippet(this, shortcut, snippets[shortcut]);
                            break; // 複数のショートカットが同時にマッチしないように、最初に見つかったもので終了
                        }
                    }
                });
                box.dataset.snippetListenerAdded = 'true'; // フラグを設定
            }
        });
    }

    // MutationObserverを使って、DOMの変更を監視し、動的に追加される textarea にも対応
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // 追加されたノードの中に textarea が含まれる可能性があるため、再度すべての textarea を監視
            if (mutation.addedNodes.length > 0) {
                observeTextareas();
            }
        });
    });

    // ドキュメント全体を監視対象とする
    observer.observe(document.body, { childList: true, subtree: true });

    // 初期ロード時にも textarea を監視
    observeTextareas();
})();