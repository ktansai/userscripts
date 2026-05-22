// ==UserScript==
// @name         GitHub Issue/PR Title Copy Button
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Add a "🔗 Copy with Link" button to GitHub issue/PR pages and Projects v2 issue panes. Copies "Title #number" to the clipboard, with #number as a hyperlink so pasting into Slack / Notion / Google Docs keeps the link.
// @author       Keisuke Kawahara (@ktansai)
// @match        https://github.com/*/*/issues/*
// @match        https://github.com/*/*/pull/*
// @match        https://github.com/orgs/*/projects/*
// @match        https://github.com/users/*/projects/*
// @match        https://github.com/*/*/projects/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_CLASS = 'userscript-copy-issue-button';
    const LABEL_DEFAULT = '🔗 Copy with Link';
    const LABEL_DONE = '✅ Copied!';
    const LABEL_FAIL = '⚠️ Failed';

    // Issue/PR タイトルの h1 を持つホストを全て収集する。
    // 通常の issue/PR ページの本体ヘッダーに加えて、Projects v2 の
    // サイドパネル (pane=issue) で開かれた issue/PR ヘッダーも対象。
    function findTitleHosts() {
        const hosts = [];
        const seen = new Set();

        // 新レイアウト (React, Primer PageHeader)
        document.querySelectorAll('h1[data-component="PH_Title"]').forEach(h1 => {
            if (!seen.has(h1) && h1.textContent.trim()) {
                seen.add(h1);
                hosts.push(h1);
            }
        });

        // 旧レイアウト
        document.querySelectorAll('h1.gh-header-title, h1 .js-issue-title, h1 bdi.js-issue-title').forEach(el => {
            const h1 = el.closest('h1') || el.parentElement;
            if (h1 && !seen.has(h1) && h1.textContent.trim()) {
                seen.add(h1);
                hosts.push(h1);
            }
        });

        return hosts;
    }

    function findTitleTextEl(host) {
        return host.querySelector('.markdown-title')
            || host.querySelector('bdi.js-issue-title')
            || host.querySelector('[data-testid="issue-title"]')
            || host.querySelector('[data-testid="pull-request-title"]')
            || host.querySelector('bdi')
            || host.querySelector('span');
    }

    function extractInfoFromHost(host) {
        const titleEl = findTitleTextEl(host);
        const title = titleEl ? titleEl.textContent.trim() : '';
        if (!title) return null;

        // 1) ホスト内に issue/PR への絶対リンクがあれば最優先
        //    (Projects v2 のサイドパネルでは h1 内に canonical な issue URL が入っている)
        const link = host.querySelector('a[href*="/issues/"], a[href*="/pull/"]');
        if (link && link.href) {
            try {
                const u = new URL(link.href, location.origin);
                const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
                if (m) {
                    const [, owner, repo, type, number] = m;
                    return { title, number, url: `${u.origin}/${owner}/${repo}/${type}/${number}` };
                }
            } catch (e) { /* fallthrough */ }
        }

        // 2) 通常の issue/PR ページ
        const pm = location.pathname.match(/^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
        if (pm) {
            const [, owner, repo, type, number] = pm;
            return { title, number, url: `${location.origin}/${owner}/${repo}/${type}/${number}` };
        }

        // 3) Projects v2 のサイドパネルのクエリ (?pane=issue&issue=owner|repo|number)
        const params = new URLSearchParams(location.search);
        const issueParam = params.get('issue') || params.get('pull_request') || params.get('pullRequest');
        if (issueParam) {
            const parts = issueParam.split('|');
            if (parts.length === 3 && /^\d+$/.test(parts[2])) {
                const [owner, repo, number] = parts;
                const type = params.has('pull_request') || params.has('pullRequest') ? 'pull' : 'issues';
                return { title, number, url: `${location.origin}/${owner}/${repo}/${type}/${number}` };
            }
        }

        return null;
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
        btn.className = BUTTON_CLASS;
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
            // タイトルがクリック前に変わるケース (パネル切替) に備えて、押下時に再抽出
            const host = btn.parentElement;
            const info = host ? extractInfoFromHost(host) : null;
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

    function injectAll() {
        for (const host of findTitleHosts()) {
            if (host.querySelector(':scope > .' + BUTTON_CLASS)) continue;
            if (!extractInfoFromHost(host)) continue;
            host.appendChild(createButton());
        }
    }

    const observer = new MutationObserver(() => injectAll());
    observer.observe(document.body, { childList: true, subtree: true });

    injectAll();
})();
