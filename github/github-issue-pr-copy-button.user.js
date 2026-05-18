// ==UserScript==
// @name         GitHub Issue/PR Title Copy Button
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add a "Copy for Slack" button to GitHub issue/PR pages. Copies "Title #number" with the #number linked to the issue/PR, so pasting into Slack keeps the hyperlink.
// @author       Keisuke Kawahara (@ktansai)
// @match        https://github.com/*/*/issues/*
// @match        https://github.com/*/*/pull/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_ID = 'userscript-copy-issue-button';
    const LABEL_DEFAULT = 'Copy for Slack';
    const LABEL_DONE = 'Copied!';
    const LABEL_FAIL = 'Failed';

    function getIssueInfo() {
        const match = location.pathname.match(/^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
        if (!match) return null;
        const [, owner, repo, type, number] = match;
        const url = `${location.origin}/${owner}/${repo}/${type}/${number}`;

        const titleEl =
            document.querySelector('bdi.js-issue-title') ||
            document.querySelector('[data-testid="issue-title"]') ||
            document.querySelector('h1.gh-header-title .js-issue-title');
        if (!titleEl) return null;

        const title = titleEl.textContent.trim();
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

    function injectButton() {
        if (document.getElementById(BUTTON_ID)) return;
        if (!getIssueInfo()) return;

        const titleEl =
            document.querySelector('bdi.js-issue-title') ||
            document.querySelector('[data-testid="issue-title"]') ||
            document.querySelector('h1.gh-header-title .js-issue-title');
        if (!titleEl) return;

        const host = titleEl.closest('h1') || titleEl.parentElement;
        if (!host) return;

        host.appendChild(createButton());
    }

    const observer = new MutationObserver(() => injectButton());
    observer.observe(document.body, { childList: true, subtree: true });

    injectButton();
})();
