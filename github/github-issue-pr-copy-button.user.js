// ==UserScript==
// @name         GitHub Issue/PR Title Copy Button
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add a "🔗 Copy with Link" button to GitHub issue/PR pages. Copies "Title #number" to the clipboard, with #number as a hyperlink so pasting into Slack / Notion / Google Docs keeps the link.
// @author       Keisuke Kawahara (@ktansai)
// @match        https://github.com/*/*/issues/*
// @match        https://github.com/*/*/pull/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_ID = 'userscript-copy-issue-button';
    const LABEL_DEFAULT = '🔗 Copy with Link';
    const LABEL_DONE = '✅ Copied!';
    const LABEL_FAIL = '⚠️ Failed';

    const TITLE_SELECTORS = [
        // 新レイアウト (React, Primer PageHeader): PR と一部 issue で使用される
        'h1[data-component="PH_Title"] .markdown-title',
        'h1[data-component="PH_Title"] > span:first-child',
        // 旧レイアウト
        'bdi.js-issue-title',
        '[data-testid="issue-title"]',
        '[data-testid="pull-request-title"]',
        'h1.gh-header-title .js-issue-title',
        'h1 .js-issue-title',
        '.js-issue-title',
        'h1 bdi'
    ];

    function findTitleElement() {
        for (const sel of TITLE_SELECTORS) {
            const el = document.querySelector(sel);
            if (el && el.textContent.trim()) return el;
        }
        return null;
    }

    function extractTitleFromDocTitle() {
        // 例: "Title · Issue #1 · owner/repo" / "Title by user · Pull Request #1 · owner/repo"
        const m = document.title.match(/^(.+?)(?:\s+by\s+\S+)?\s+·\s+(?:Issue|Pull Request)\s+#\d+/);
        return m ? m[1].trim() : null;
    }

    function getIssueInfo() {
        const match = location.pathname.match(/^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
        if (!match) return null;
        const [, owner, repo, type, number] = match;
        const url = `${location.origin}/${owner}/${repo}/${type}/${number}`;

        const titleEl = findTitleElement();
        const title = (titleEl && titleEl.textContent.trim()) || extractTitleFromDocTitle();
        if (!title) return null;

        return { title, number, url };
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    async function copyToClipboard(info) {
        const plainText = `${info.title} #${info.number}`;
        const htmlText = `${escapeHtml(info.title)} <a href="${info.url}">#${info.number}</a>`;

        try {
            const item = new ClipboardItem({
                'text/html': new Blob([htmlText], { type: 'text/html' }),
                'text/plain': new Blob([plainText], { type: 'text/plain' })
            });
            await navigator.clipboard.write([item]);
            return true;
        } catch (e) {
            try {
                await navigator.clipboard.writeText(plainText);
                return true;
            } catch (e2) {
                console.error('[copy-button] clipboard write failed', e, e2);
                return false;
            }
        }
    }

    function createButton() {
        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.type = 'button';
        btn.textContent = LABEL_DEFAULT;
        btn.title = 'Copy "Title #number" with hyperlink to clipboard';
        btn.style.cssText = [
            'margin-left: 8px',
            'padding: 3px 10px',
            'font-size: 12px',
            'line-height: 20px',
            'border-radius: 6px',
            'border: 1px solid var(--borderColor-default, #d0d7de)',
            'background: var(--bgColor-muted, #f6f8fa)',
            'color: var(--fgColor-default, #24292f)',
            'cursor: pointer',
            'vertical-align: middle',
            'white-space: nowrap'
        ].join(';');

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const info = getIssueInfo();
            if (!info) {
                flash(btn, LABEL_FAIL);
                return;
            }
            const ok = await copyToClipboard(info);
            flash(btn, ok ? LABEL_DONE : LABEL_FAIL);
        });
        return btn;
    }

    function flash(btn, label) {
        btn.textContent = label;
        setTimeout(() => { btn.textContent = LABEL_DEFAULT; }, 1500);
    }

    function findHost() {
        const titleEl = findTitleElement();
        if (!titleEl) return null;
        return titleEl.closest('h1') || titleEl.parentElement;
    }

    function injectButton() {
        if (document.getElementById(BUTTON_ID)) return;
        if (!getIssueInfo()) return;

        const host = findHost();
        if (!host) return;

        host.appendChild(createButton());
    }

    const observer = new MutationObserver(() => injectButton());
    observer.observe(document.body, { childList: true, subtree: true });

    injectButton();
})();
