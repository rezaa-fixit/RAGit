export function renderWebUi() {
  return `<!doctype html>
<html lang="da">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ombudsmanden RAG</title>
    <style>
      :root {
        --bg: #f4f1ea;
        --surface-muted: rgba(245, 240, 232, 0.88);
        --ink: #152321;
        --muted: #61706d;
        --muted-strong: #42504d;
        --line: rgba(21, 35, 33, 0.1);
        --line-strong: rgba(21, 35, 33, 0.16);
        --accent: #103a35;
        --accent-soft: #deece7;
        --accent-strong: #0f4f47;
        --shadow: 0 24px 80px rgba(47, 41, 32, 0.1);
        --radius-xl: 30px;
      }

      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ink);
        font-family: "Georgia", "Times New Roman", serif;
        background:
          radial-gradient(circle at 0% 0%, rgba(213, 182, 138, 0.24), transparent 28rem),
          radial-gradient(circle at 100% 0%, rgba(16, 58, 53, 0.12), transparent 26rem),
          linear-gradient(180deg, #f7f3ec 0%, #f1ece2 38%, var(--bg) 100%);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(21, 35, 33, 0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(21, 35, 33, 0.025) 1px, transparent 1px);
        background-size: 36px 36px;
        mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 90%);
      }

      main {
        max-width: 1380px;
        margin: 0 auto;
        padding: 28px 18px 48px;
      }

      .frame {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 34px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(255, 252, 247, 0.88));
        box-shadow: var(--shadow);
        backdrop-filter: blur(16px);
      }

      .frame::before,
      .frame::after {
        content: "";
        position: absolute;
        border-radius: 999px;
        filter: blur(4px);
        opacity: 0.7;
        pointer-events: none;
      }

      .frame::before {
        top: -120px;
        right: -40px;
        width: 320px;
        height: 320px;
        background: radial-gradient(circle, rgba(213, 182, 138, 0.32), transparent 68%);
      }

      .frame::after {
        bottom: -140px;
        left: -100px;
        width: 360px;
        height: 360px;
        background: radial-gradient(circle, rgba(16, 58, 53, 0.18), transparent 72%);
      }

      .topbar {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 22px;
        border-bottom: 1px solid var(--line);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 14px;
        background: linear-gradient(145deg, var(--accent), var(--accent-strong));
        color: white;
        font-size: 1.1rem;
        letter-spacing: 0.08em;
      }

      .brand-copy {
        display: grid;
        gap: 2px;
      }

      .brand-kicker,
      .topbar-note,
      .eyebrow,
      .section-kicker,
      .card-kicker,
      .panel-heading,
      .stat-value,
      .stat-label,
      .tag,
      .label,
      .label-hint,
      .status,
      .results-count,
      .hero-item span,
      .panel-subtitle,
      .link-button,
      button {
        font-family: "Arial", sans-serif;
      }

      .brand-kicker,
      .eyebrow,
      .section-kicker,
      .card-kicker {
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent-strong);
      }

      .brand-title {
        font-size: 0.95rem;
        color: var(--muted-strong);
      }

      .topbar-note {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--muted-strong);
        font-size: 0.82rem;
      }

      .topbar-note::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #1d8b6f;
        box-shadow: 0 0 0 6px rgba(29, 139, 111, 0.14);
      }

      .hero {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
        gap: 24px;
        padding: 28px 22px 20px;
      }

      .hero-copy {
        display: grid;
        gap: 16px;
        align-content: start;
      }

      h1 {
        margin: 0;
        max-width: 12ch;
        font-size: clamp(2.7rem, 6vw, 5.8rem);
        line-height: 0.92;
        letter-spacing: -0.05em;
      }

      .hero-text {
        max-width: 62ch;
        color: var(--muted-strong);
        font-size: 1.03rem;
        line-height: 1.7;
      }

      .hero-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 8px;
      }

      .stat {
        padding: 16px 18px;
        border: 1px solid rgba(255, 255, 255, 0.55);
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(247, 242, 235, 0.92));
      }

      .stat-value {
        font-size: 1.55rem;
        font-weight: 700;
        color: var(--accent);
      }

      .stat-label {
        margin-top: 6px;
        color: var(--muted);
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .hero-card {
        align-self: stretch;
        padding: 22px;
        border: 1px solid var(--line);
        border-radius: 26px;
        background: linear-gradient(180deg, rgba(17, 42, 39, 0.96), rgba(16, 58, 53, 0.92));
        color: rgba(255, 255, 255, 0.92);
      }

      .hero-card h2 {
        margin: 0 0 12px;
        font-size: 1.25rem;
      }

      .hero-card p {
        margin: 0;
        color: rgba(255, 255, 255, 0.76);
        line-height: 1.65;
      }

      .hero-list {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }

      .hero-item {
        display: grid;
        gap: 2px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
      }

      .hero-item strong {
        font-size: 0.98rem;
        font-weight: 600;
      }

      .hero-item span {
        color: rgba(255, 255, 255, 0.68);
        font-size: 0.85rem;
      }

      .layout {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
        gap: 18px;
        padding: 0 22px 22px;
      }

      .panel {
        border: 1px solid var(--line);
        border-radius: var(--radius-xl);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(250, 247, 241, 0.9));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(10px);
      }

      .controls {
        position: sticky;
        top: 18px;
        align-self: start;
        padding: 22px;
      }

      .panel-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
      }

      .panel-heading h2,
      .results-head h2,
      .results-head h3 { margin: 0; }
      .panel-heading h2,
      .results-head h2 { font-size: 1.18rem; }

      .panel-subtitle {
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .form-grid {
        display: grid;
        gap: 14px;
      }

      label {
        display: grid;
        gap: 8px;
      }

      .label-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }

      .label {
        color: var(--muted);
        font-size: 0.82rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .label-hint {
        color: var(--muted);
        font-size: 0.75rem;
      }

      textarea,
      select,
      button {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 18px;
        font: inherit;
        color: inherit;
      }

      textarea,
      select {
        background: rgba(255, 255, 255, 0.84);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
      }

      textarea {
        min-height: 148px;
        padding: 16px 18px;
        resize: vertical;
        line-height: 1.6;
      }

      select {
        appearance: none;
        padding: 14px 44px 14px 16px;
        background-image:
          linear-gradient(45deg, transparent 50%, var(--muted) 50%),
          linear-gradient(135deg, var(--muted) 50%, transparent 50%);
        background-position:
          calc(100% - 24px) calc(50% - 3px),
          calc(100% - 18px) calc(50% - 3px);
        background-size: 6px 6px, 6px 6px;
        background-repeat: no-repeat;
      }

      textarea:focus,
      select:focus {
        outline: none;
        border-color: rgba(16, 79, 71, 0.38);
        box-shadow:
          0 0 0 5px rgba(16, 79, 71, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.82);
      }

      .control-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 6px;
      }

      button {
        position: relative;
        overflow: hidden;
        cursor: pointer;
        padding: 15px 18px;
        border: none;
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        transition: transform 140ms ease, opacity 140ms ease, box-shadow 140ms ease;
      }

      button::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.24), transparent);
        transform: translateX(-100%);
        transition: transform 240ms ease;
      }

      button:hover::before { transform: translateX(100%); }
      button:hover { transform: translateY(-1px); }
      button:disabled { opacity: 0.64; cursor: wait; transform: none; }

      .primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: white;
        box-shadow: 0 14px 28px rgba(16, 58, 53, 0.22);
      }

      .secondary {
        background: rgba(223, 236, 231, 0.96);
        color: var(--accent);
        border: 1px solid rgba(16, 79, 71, 0.08);
      }

      .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .subpanel {
        display: grid;
        gap: 10px;
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid rgba(21, 35, 33, 0.08);
      }

      .subpanel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .mini-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        padding: 9px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--muted-strong);
        font-size: 0.8rem;
        cursor: pointer;
        transition: background 120ms ease, transform 120ms ease, border-color 120ms ease;
      }

      .chip:hover {
        transform: translateY(-1px);
        background: var(--accent-soft);
        border-color: rgba(16, 79, 71, 0.18);
      }

      .chip-subtle {
        background: rgba(255, 255, 255, 0.54);
      }

      .chip-danger {
        background: rgba(117, 28, 28, 0.08);
        color: #7a2e2e;
      }

      .chip-clear {
        background: rgba(16, 58, 53, 0.08);
        color: var(--accent);
        border-color: rgba(16, 79, 71, 0.12);
      }

      .status {
        margin-top: 16px;
        padding: 14px 16px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.62);
        color: var(--muted-strong);
        font-size: 0.88rem;
        line-height: 1.5;
      }

      .results { padding: 22px; }

      .results-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      .results-head p {
        margin: 6px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .results-count {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 999px;
        background: var(--surface-muted);
        border: 1px solid var(--line);
        color: var(--muted-strong);
        font-size: 0.82rem;
        white-space: nowrap;
      }

      .results-count strong { color: var(--accent); }

      .meta-row,
      .active-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .meta-row { margin-bottom: 16px; }

      .tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid var(--line);
        color: var(--muted-strong);
        font-size: 0.8rem;
      }

      .tag strong { color: var(--accent); font-weight: 700; }

      .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(16, 79, 71, 0.14);
        background: rgba(223, 236, 231, 0.9);
        color: var(--accent);
        font-family: "Arial", sans-serif;
        font-size: 0.8rem;
      }

      .filter-chip button {
        width: auto;
        min-width: 26px;
        height: 26px;
        padding: 0 8px;
        border-radius: 999px;
        background: rgba(16, 58, 53, 0.12);
        color: var(--accent);
        font-size: 0.76rem;
        box-shadow: none;
      }

      .answer {
        margin-bottom: 18px;
        padding: 22px;
        border: 1px solid rgba(16, 79, 71, 0.12);
        border-radius: 24px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(230, 241, 236, 0.92)),
          linear-gradient(135deg, rgba(16, 79, 71, 0.06), transparent);
      }

      .answer h3 { margin: 0 0 12px; font-size: 1.02rem; }

      .answer-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
      }

      .answer-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(16, 58, 53, 0.08);
        color: var(--accent);
        font-family: "Arial", sans-serif;
        font-size: 0.8rem;
        white-space: nowrap;
      }

      .answer-body {
        white-space: pre-wrap;
        line-height: 1.72;
        color: var(--ink);
      }

      .answer-body p {
        margin: 0 0 14px;
      }

      .answer-body h4 {
        margin: 22px 0 10px;
        font-size: 0.82rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent-strong);
        font-family: "Arial", sans-serif;
      }

      .answer-body h4:first-child {
        margin-top: 0;
      }

      .answer-body ul {
        margin: 0 0 16px 0;
        padding-left: 1.2rem;
        color: var(--muted-strong);
      }

      .answer-body li {
        margin: 0 0 8px;
        line-height: 1.7;
      }

      .answer-body p:last-child {
        margin-bottom: 0;
      }

      .answer-body.is-collapsed > :nth-child(n + 7) {
        display: none;
      }

      .answer-body .answer-ref {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 26px;
        padding: 2px 8px;
        margin-inline: 2px;
        border-radius: 999px;
        background: rgba(16, 58, 53, 0.12);
        color: var(--accent);
        font-family: "Arial", sans-serif;
        font-size: 0.76rem;
        font-weight: 700;
        vertical-align: baseline;
        text-decoration: none;
        cursor: pointer;
        transition: transform 120ms ease, background 120ms ease;
      }

      .answer-body .answer-ref:hover {
        transform: translateY(-1px);
        background: rgba(16, 58, 53, 0.18);
      }

      .answer-sources {
        display: grid;
        gap: 12px;
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid rgba(16, 79, 71, 0.12);
      }

      .answer-sources-grid {
        display: grid;
        gap: 10px;
      }

      .workspace {
        display: grid;
        gap: 12px;
        margin-bottom: 18px;
      }

      .workspace-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }

      .workspace-controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 180px;
        gap: 10px;
      }

      .compare-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
      }

      .workspace-card {
        display: grid;
        gap: 10px;
        padding: 16px;
        border: 1px solid rgba(16, 79, 71, 0.12);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.78);
      }

      .workspace-card h4 {
        margin: 0;
        font-size: 0.98rem;
        line-height: 1.45;
      }

      .workspace-card p {
        margin: 0;
        color: var(--muted-strong);
        line-height: 1.55;
        font-size: 0.92rem;
      }

      .workspace-note {
        width: 100%;
        min-height: 96px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.88);
        color: var(--ink);
        font: inherit;
        line-height: 1.55;
        resize: vertical;
      }

      .workspace-note:focus {
        outline: none;
        border-color: rgba(16, 79, 71, 0.28);
        box-shadow: 0 0 0 4px rgba(16, 79, 71, 0.08);
      }

      .workspace-labels {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.88);
        color: var(--ink);
        font: inherit;
      }

      .workspace-labels:focus {
        outline: none;
        border-color: rgba(16, 79, 71, 0.28);
        box-shadow: 0 0 0 4px rgba(16, 79, 71, 0.08);
      }

      .workspace-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .compare-card {
        display: grid;
        gap: 12px;
        padding: 16px;
        border: 1px solid rgba(16, 79, 71, 0.12);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.82);
      }

      .compare-section {
        display: grid;
        gap: 6px;
      }

      .compare-section p {
        margin: 0;
        color: var(--muted-strong);
        line-height: 1.55;
        font-size: 0.92rem;
      }

      .answer-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }

      .source-card {
        display: grid;
        gap: 10px;
        padding: 14px 16px;
        border: 1px solid rgba(16, 79, 71, 0.12);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.74);
      }

      .source-card.is-referenced {
        border-color: rgba(16, 79, 71, 0.24);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(223, 236, 231, 0.72));
      }

      .source-card.is-focused {
        border-color: rgba(16, 79, 71, 0.34);
        box-shadow: 0 0 0 6px rgba(16, 79, 71, 0.08);
      }

      .source-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .source-index {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 999px;
        background: rgba(16, 58, 53, 0.08);
        color: var(--accent);
        font-family: "Arial", sans-serif;
        font-size: 0.76rem;
        font-weight: 700;
      }

      .source-title {
        margin: 0;
        font-size: 0.98rem;
        line-height: 1.45;
      }

      .source-title a {
        color: inherit;
        text-decoration: none;
      }

      .source-title a:hover {
        color: var(--accent-strong);
      }

      .source-snippet {
        color: var(--muted-strong);
        line-height: 1.65;
        font-size: 0.95rem;
      }

      .icon-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: auto;
        padding: 10px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.78);
        border: 1px solid var(--line);
        color: var(--accent);
        font-size: 0.78rem;
        box-shadow: none;
      }

      .icon-button.is-active {
        background: rgba(223, 236, 231, 0.95);
        border-color: rgba(16, 79, 71, 0.2);
      }

      .empty {
        padding: 24px;
        border: 1px dashed var(--line-strong);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.55);
        color: var(--muted);
        line-height: 1.7;
      }

      .hit-list {
        display: grid;
        gap: 14px;
      }

      .hit {
        display: grid;
        gap: 14px;
        padding: 20px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(250, 246, 239, 0.88));
        transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
      }

      .hit:hover {
        transform: translateY(-2px);
        border-color: rgba(16, 79, 71, 0.22);
        box-shadow: 0 18px 34px rgba(47, 41, 32, 0.08);
      }

      .hit-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .hit-index {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 34px;
        height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 0.78rem;
        font-weight: 700;
      }

      .hit-title {
        margin: 8px 0 0;
        font-size: 1.18rem;
        line-height: 1.35;
      }

      .hit-title a { color: inherit; text-decoration: none; }
      .hit-title a:hover { color: var(--accent-strong); }

      .hit-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .hit-summary {
        color: var(--muted-strong);
        line-height: 1.72;
      }

      mark {
        padding: 0 0.15em;
        border-radius: 0.3em;
        background: rgba(213, 182, 138, 0.45);
        color: inherit;
      }

      .hit-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .link-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.78);
        color: var(--accent);
        font-size: 0.8rem;
        text-decoration: none;
        transition: background 120ms ease, transform 120ms ease;
      }

      .link-button:hover {
        transform: translateY(-1px);
        background: var(--accent-soft);
      }

      .loading-stack {
        display: grid;
        gap: 14px;
      }

      .skeleton {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.72);
      }

      .skeleton::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
        transform: translateX(-100%);
        animation: shimmer 1.25s infinite;
      }

      .skeleton-card {
        padding: 20px;
        min-height: 154px;
      }

      .skeleton-line {
        height: 12px;
        margin-bottom: 12px;
        border-radius: 999px;
        background: rgba(16, 58, 53, 0.08);
      }

      .skeleton-line.title {
        width: 64%;
        height: 18px;
      }

      .skeleton-line.meta {
        width: 38%;
      }

      .skeleton-line.short {
        width: 42%;
      }

      .skeleton-line.long {
        width: 100%;
      }

      @keyframes shimmer {
        to {
          transform: translateX(100%);
        }
      }

      @media (max-width: 1080px) {
        .hero { grid-template-columns: 1fr; }
        .layout { grid-template-columns: 1fr; }
        .controls { position: static; }
      }

      @media (max-width: 720px) {
        main { padding-inline: 12px; }
        .topbar, .hero, .layout { padding-left: 14px; padding-right: 14px; }
        .topbar { flex-direction: column; align-items: flex-start; }
        .hero-grid, .control-row, .actions { grid-template-columns: 1fr; }
        .results-head, .hit-top { flex-direction: column; }
        h1 { max-width: 100%; font-size: clamp(2.2rem, 14vw, 4rem); }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="frame">
        <header class="topbar">
          <div class="brand">
            <div class="brand-mark">FO</div>
            <div class="brand-copy">
              <div class="brand-kicker">Juridisk Retrieval</div>
              <div class="brand-title">Ombudsmandens udtalelser med citationsdrevet RAG</div>
            </div>
          </div>
          <div class="topbar-note">Neon + pgvector + OpenAI embeddings</div>
        </header>

        <section class="hero">
          <div class="hero-copy">
            <div class="eyebrow">Folketingets Ombudsmand</div>
              <h1>Juridisk søgning med klare svar.</h1>
              <div class="hero-text">
              Søg, filtrer og få kildebaserede svar med direkte henvisninger til relevante udtalelser, sider og afgørelser.
              Løsningen kombinerer hybrid retrieval, metadatafiltre og et svarlag, der holder sig tæt til kilderne.
              </div>

            <div class="hero-grid">
              <div class="stat">
                <div class="stat-value" id="stat-documents">88</div>
                  <div class="stat-label">Afgørelser</div>
              </div>
              <div class="stat">
                <div class="stat-value" id="stat-years">3</div>
                <div class="stat-label">Argange</div>
              </div>
              <div class="stat">
                <div class="stat-value" id="stat-topics">0</div>
                <div class="stat-label">Emner</div>
              </div>
            </div>
          </div>

          <aside class="hero-card">
            <div class="card-kicker">Arbejdsflow</div>
            <h2>Bygget til hurtig afklaring</h2>
            <p>
              Brug kildesøgning til præcise fund eller AI-svar til et kort juridisk overblik. Filtrene afgrænser
              datagrundlaget, og hvert hit viser, hvor i materialet svaret stammer fra.
            </p>

            <div class="hero-list">
              <div class="hero-item">
                  <strong>Kildesøgning</strong>
                  <span>Til præcise fund og sammenligning af afgørelser</span>
              </div>
              <div class="hero-item">
                <strong>Svar</strong>
                <span>Til kort juridisk syntese med citationer</span>
              </div>
              <div class="hero-item">
                <strong>Filtre</strong>
                  <span>Til afgrænsning på år, ministerium og emne</span>
              </div>
            </div>
          </aside>
        </section>

        <section class="layout">
          <form class="panel controls" id="search-form">
            <div class="panel-heading">
              <div>
                <div class="section-kicker">Arbejdspanel</div>
                <h2>Stil et juridisk spørgsmål</h2>
              </div>
            </div>
            <div class="panel-subtitle">
              Brug et konkret spørgsmål, eller filtrer korpuset for at fokusere på en bestemt myndighed
              eller periode.
            </div>

            <div class="form-grid">
              <label>
                <div class="label-row">
                  <span class="label">Spørgsmål</span>
                  <span class="label-hint">Naturligt sprog</span>
                </div>
                <textarea id="question" placeholder="Hvad gælder der om aktindsigt i dokumenter på en aktliste?"></textarea>
              </label>

              <div class="control-row">
                <label>
                  <div class="label-row">
                    <span class="label">År</span>
                  </div>
                  <select id="year">
                    <option value="">Alle år</option>
                  </select>
                </label>

                <label>
                  <div class="label-row">
                    <span class="label">Antal hits</span>
                  </div>
                  <select id="limit">
                    <option value="5">5</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                  </select>
                </label>
              </div>

              <label>
                <div class="label-row">
                  <span class="label">Ministerium</span>
                </div>
                <select id="ministry">
                  <option value="">Alle ministerier</option>
                </select>
              </label>

              <label>
                <div class="label-row">
                  <span class="label">Emne</span>
                </div>
                <select id="topic">
                  <option value="">Alle emner</option>
                </select>
              </label>
            </div>

            <div class="actions">
                <button type="submit" class="primary" id="ask-button">Svar med AI</button>
                <button type="button" class="secondary" id="search-button">Find kilder</button>
            </div>

            <div class="suggestions">
              <button type="button" class="chip" data-question="Hvad siger ombudsmanden om aktindsigt?">Aktindsigt</button>
              <button type="button" class="chip" data-question="Hvad siger ombudsmanden om telefonbetjening i spidsbelastningsperioder?">Telefonbetjening</button>
              <button type="button" class="chip" data-question="Hvad siger ombudsmanden om vejledningspligt?">Vejledningspligt</button>
              <button type="button" class="chip chip-clear" id="clear-filters">Nulstil filtre</button>
            </div>

            <div class="subpanel">
              <div class="subpanel-head">
              <div class="card-kicker">Seneste søgninger</div>
                <button type="button" class="chip chip-subtle chip-danger" id="clear-history">Ryd</button>
              </div>
              <div class="mini-list" id="history-list"></div>
            </div>

            <div class="subpanel">
              <div class="card-kicker">Gemte afgørelser</div>
              <div class="mini-list" id="pins-list"></div>
            </div>

            <div class="status" id="status">Klar til at søge i kilder og generere svar.</div>
          </form>

          <section class="panel results">
            <div class="results-head">
              <div>
                <div class="section-kicker">Resultater</div>
                <h2>Fund og svar</h2>
                <p>Hver kilde viser sag, reference og direkte links til originalmaterialet.</p>
              </div>
              <div class="results-count"><strong id="result-count">0</strong> hits</div>
            </div>

            <div class="meta-row" id="meta"></div>
            <div class="active-filters" id="active-filters"></div>

            <section class="workspace" id="workspace" hidden>
              <div class="results-head">
                <div>
                  <div class="section-kicker">Arbejdsbord</div>
                  <h3>Gemte afgørelser</h3>
                </div>
                <button type="button" class="icon-button" id="export-workspace">Eksporter</button>
              </div>
              <div class="workspace-controls">
                <input class="workspace-labels" id="workspace-filter" placeholder="Filtrer på label, titel eller FOB-id" />
                <select id="workspace-sort">
                  <option value="recent">Nyeste pin først</option>
                  <option value="title">Titel A-Z</option>
                  <option value="date_desc">Dato nyeste først</option>
                  <option value="date_asc">Dato ældste først</option>
                </select>
              </div>
              <div class="workspace-grid" id="workspace-grid"></div>
              <div class="subpanel" id="compare-section" hidden>
                <div class="card-kicker">Sammenligning</div>
                <div class="compare-grid" id="compare-grid"></div>
              </div>
            </section>

            <section class="answer" id="answer" hidden>
              <div class="answer-head">
                <div>
                  <div class="card-kicker">Syntese</div>
                  <h3>Kildebundet svar</h3>
                </div>
                <div class="answer-badge" id="answer-badge">0 kilder brugt</div>
              </div>
              <div class="answer-body" id="answer-body"></div>
              <div class="answer-actions" id="answer-actions" hidden>
                <button type="button" class="icon-button" id="toggle-answer">Vis mere</button>
              </div>
              <div class="answer-sources" id="answer-sources" hidden>
                <div class="card-kicker">Kilder i svaret</div>
                <div class="answer-sources-grid" id="answer-sources-grid"></div>
              </div>
            </section>

            <div class="hit-list" id="hits">
              <div class="empty">
                Start med et spørgsmål eller et af forslagene til venstre. Resultaterne viser de mest relevante
                udtalelser med kildehenvisninger og links.
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>

    <script>
      const questionInput = document.getElementById("question");
      const yearInput = document.getElementById("year");
      const ministryInput = document.getElementById("ministry");
      const topicInput = document.getElementById("topic");
      const limitInput = document.getElementById("limit");
      const statusEl = document.getElementById("status");
      const answerEl = document.getElementById("answer");
      const answerBadgeEl = document.getElementById("answer-badge");
      const answerBodyEl = document.getElementById("answer-body");
      const answerActionsEl = document.getElementById("answer-actions");
      const toggleAnswerButton = document.getElementById("toggle-answer");
      const answerSourcesEl = document.getElementById("answer-sources");
      const answerSourcesGridEl = document.getElementById("answer-sources-grid");
      const hitsEl = document.getElementById("hits");
      const metaEl = document.getElementById("meta");
      const activeFiltersEl = document.getElementById("active-filters");
      const resultCountEl = document.getElementById("result-count");
        const askButton = document.getElementById("ask-button");
        const searchButton = document.getElementById("search-button");
      const clearFiltersButton = document.getElementById("clear-filters");
      const clearHistoryButton = document.getElementById("clear-history");
      const historyListEl = document.getElementById("history-list");
      const pinsListEl = document.getElementById("pins-list");
      const workspaceEl = document.getElementById("workspace");
      const workspaceGridEl = document.getElementById("workspace-grid");
      const compareSectionEl = document.getElementById("compare-section");
      const compareGridEl = document.getElementById("compare-grid");
      const exportWorkspaceButton = document.getElementById("export-workspace");
      const workspaceFilterEl = document.getElementById("workspace-filter");
      const workspaceSortEl = document.getElementById("workspace-sort");
      const statYearsEl = document.getElementById("stat-years");
      const statTopicsEl = document.getElementById("stat-topics");
      const suggestionEls = [...document.querySelectorAll("[data-question]")];
      const STORAGE_KEYS = {
        history: "ombudsmanden_rag_history",
        pins: "ombudsmanden_rag_pins"
      };
      let pinnedDocuments = [];
      let currentHits = [];
      let lastReferencedNumbers = [];

      async function loadMetadata() {
        const response = await fetch("/metadata", {
          credentials: "same-origin"
        });
        const payload = await response.json();

        for (const year of payload.years ?? []) {
          yearInput.insertAdjacentHTML("beforeend", \`<option value="\${year}">\${year}</option>\`);
        }

        for (const ministry of payload.ministries ?? []) {
          ministryInput.insertAdjacentHTML(
            "beforeend",
            \`<option value="\${escapeHtml(ministry)}">\${escapeHtml(ministry)}</option>\`
          );
        }

        for (const topic of payload.topics?.slice(0, 250) ?? []) {
          topicInput.insertAdjacentHTML(
            "beforeend",
            \`<option value="\${escapeHtml(topic)}">\${escapeHtml(topic)}</option>\`
          );
        }

        statYearsEl.textContent = String((payload.years ?? []).length);
        statTopicsEl.textContent = String((payload.topics ?? []).length);
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function applyInlineFormatting(text) {
        return escapeHtml(text)
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\[Kilde\s+(\d+)\]/g, '<a href="#source-card-$1" class="answer-ref" data-source-ref="$1">Kilde $1</a>');
      }

      function currentPayload() {
        return {
          question: questionInput.value.trim(),
          limit: Number(limitInput.value),
          filters: {
            year: yearInput.value || null,
            ministry: ministryInput.value || null,
            topic: topicInput.value || null
          }
        };
      }

      function readStorage(key, fallback = []) {
        try {
          const raw = window.localStorage.getItem(key);
          return raw ? JSON.parse(raw) : fallback;
        } catch {
          return fallback;
        }
      }

      function writeStorage(key, value) {
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // Ignore storage failures so the UI still works in restricted contexts.
        }
      }

      function rememberSearch(payload) {
        if (!payload.question) {
          return;
        }

        const next = [
          {
            question: payload.question,
            filters: payload.filters
          },
          ...readStorage(STORAGE_KEYS.history)
            .filter((item) => item.question !== payload.question)
        ].slice(0, 6);

        writeStorage(STORAGE_KEYS.history, next);
        renderHistory();
      }

      function renderHistory() {
        const history = readStorage(STORAGE_KEYS.history);
        if (!history.length) {
          historyListEl.innerHTML = '<span class="tag">Ingen historik endnu</span>';
          return;
        }

        historyListEl.innerHTML = history.map((item, index) => {
          const label = summarizeText(item.question, 46);
          return \`<button type="button" class="chip chip-subtle" data-history-index="\${index}">\${escapeHtml(label)}</button>\`;
        }).join("");
      }

      function clearHistory() {
        writeStorage(STORAGE_KEYS.history, []);
        renderHistory();
      }

      function isPinned(documentId) {
        return pinnedDocuments.some((item) => item.documentId === documentId);
      }

      function togglePin(hit) {
        if (!hit?.documentId) {
          return;
        }

        if (isPinned(hit.documentId)) {
          pinnedDocuments = pinnedDocuments.filter((item) => item.documentId !== hit.documentId);
        } else {
          pinnedDocuments = [
            {
              documentId: hit.documentId,
              title: hit.title,
              htmlUrl: hit.htmlUrl,
              referenceLabel: hit.referenceLabel,
              date: hit.date,
              note: "",
              labels: ""
            },
            ...pinnedDocuments
          ].slice(0, 8);
        }

        writeStorage(STORAGE_KEYS.pins, pinnedDocuments);
        renderPins();
        renderWorkspace();
        renderHits(currentHits, currentPayload().question);
        renderAnswerSources(currentHits, lastReferencedNumbers, currentPayload().question);
      }

      function renderPins() {
        if (!pinnedDocuments.length) {
          pinsListEl.innerHTML = '<span class="tag">Ingen gemte afgørelser endnu</span>';
          return;
        }

        pinsListEl.innerHTML = pinnedDocuments.map((item) => {
          const label = summarizeText(item.title, 44);
          return \`<a class="chip chip-subtle" href="\${item.htmlUrl}" target="_blank" rel="noreferrer">\${escapeHtml(label)}</a>\`;
        }).join("");
      }

      function parseDanishDate(value) {
        const match = String(value ?? "").match(/^(\\d{2})-(\\d{2})-(\\d{4})$/);
        if (!match) {
          return null;
        }

        return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
      }

      function getFilteredPinnedDocuments() {
        const filterValue = String(workspaceFilterEl.value ?? "").trim().toLowerCase();
        const sortValue = workspaceSortEl.value;
        let items = [...pinnedDocuments];

        if (filterValue) {
          items = items.filter((item) => {
            const haystack = [
              item.documentId,
              item.title,
              item.labels,
              item.note
            ].join(" ").toLowerCase();

            return haystack.includes(filterValue);
          });
        }

        if (sortValue === "title") {
          items.sort((left, right) => left.title.localeCompare(right.title, "da"));
        } else if (sortValue === "date_desc") {
          items.sort((left, right) => (parseDanishDate(right.date) ?? 0) - (parseDanishDate(left.date) ?? 0));
        } else if (sortValue === "date_asc") {
          items.sort((left, right) => (parseDanishDate(left.date) ?? 0) - (parseDanishDate(right.date) ?? 0));
        }

        return items;
      }

      function renderWorkspace() {
        if (!pinnedDocuments.length) {
          workspaceEl.hidden = true;
          exportWorkspaceButton.hidden = true;
          workspaceGridEl.innerHTML = "";
          compareSectionEl.hidden = true;
          compareGridEl.innerHTML = "";
          return;
        }

        workspaceEl.hidden = false;
        exportWorkspaceButton.hidden = false;
        const workspaceItems = getFilteredPinnedDocuments();

        if (!workspaceItems.length) {
          workspaceGridEl.innerHTML = '<div class="empty">Ingen gemte afgørelser matcher det aktuelle filter.</div>';
          compareSectionEl.hidden = true;
          compareGridEl.innerHTML = "";
          return;
        }

        workspaceGridEl.innerHTML = workspaceItems.map((item) => {
          const summary = [item.documentId, item.referenceLabel, item.date].filter(Boolean).join(" | ");
          const labelTags = String(item.labels ?? "")
            .split(",")
            .map((label) => label.trim())
            .filter(Boolean)
            .slice(0, 6)
            .map((label) => \`<span class="tag">\${escapeHtml(label)}</span>\`)
            .join("");
          return \`
            <article class="workspace-card">
              <div class="card-kicker">Gemt afgørelse</div>
              <h4>\${escapeHtml(item.title)}</h4>
              <p>\${escapeHtml(summary || "Ingen ekstra metadata")}</p>
              \${labelTags ? \`<div class="meta-row">\${labelTags}</div>\` : ""}
              <input class="workspace-labels" data-labels-document="\${escapeHtml(item.documentId)}" value="\${escapeHtml(item.labels ?? "")}" placeholder="Labels, fx aktindsigt, temakrav, vigtig" />
              <textarea class="workspace-note" data-note-document="\${escapeHtml(item.documentId)}" placeholder="Skriv dine noter til afgørelsen her...">\${escapeHtml(item.note ?? "")}</textarea>
              <div class="workspace-actions">
                <a class="link-button" href="\${item.htmlUrl}" target="_blank" rel="noreferrer">Afgørelse</a>
                <button type="button" class="icon-button" data-unpin-document="\${escapeHtml(item.documentId)}">Fjern pin</button>
              </div>
              </article>
            \`;
            }).join("");

          if (workspaceItems.length < 2) {
            compareSectionEl.hidden = true;
            compareGridEl.innerHTML = "";
            return;
          }

          compareSectionEl.hidden = false;
          compareGridEl.innerHTML = workspaceItems.slice(0, 4).map((item) => {
            const labelTags = String(item.labels ?? "")
              .split(",")
            .map((label) => label.trim())
            .filter(Boolean)
            .slice(0, 6)
            .map((label) => \`<span class="tag">\${escapeHtml(label)}</span>\`)
            .join("");

          return \`
            <article class="compare-card">
              <div class="card-kicker">FOB \${escapeHtml(item.documentId)}</div>
              <h4>\${escapeHtml(item.title)}</h4>
              <div class="compare-section">
                <div class="card-kicker">Reference</div>
                <p>\${escapeHtml(item.referenceLabel || "Ingen reference")}</p>
              </div>
              <div class="compare-section">
                <div class="card-kicker">Labels</div>
                \${labelTags ? \`<div class="meta-row">\${labelTags}</div>\` : "<p>Ingen labels endnu.</p>"}
              </div>
              <div class="compare-section">
                <div class="card-kicker">Noter</div>
                <p>\${escapeHtml((item.note || "").trim() || "Ingen noter endnu.")}</p>
              </div>
            </article>
          \`;
        }).join("");
      }

      function updatePinnedNote(documentId, note) {
        pinnedDocuments = pinnedDocuments.map((item) =>
          item.documentId === documentId
            ? {
                ...item,
                note
              }
            : item
        );

        writeStorage(STORAGE_KEYS.pins, pinnedDocuments);
      }

      function updatePinnedLabels(documentId, labels) {
        pinnedDocuments = pinnedDocuments.map((item) =>
          item.documentId === documentId
            ? {
                ...item,
                labels
              }
            : item
        );

        writeStorage(STORAGE_KEYS.pins, pinnedDocuments);
        renderPins();
        renderWorkspace();
      }

      function exportWorkspace() {
        if (!pinnedDocuments.length) {
          statusEl.textContent = "Der er ingen gemte afgørelser at eksportere.";
          return;
        }

        const lines = [
          "# Ombudsmanden Workspace",
          "",
          "Eksporteret: " + new Date().toLocaleString("da-DK"),
          ""
        ];

        for (const item of pinnedDocuments) {
          lines.push("## " + item.title);
          lines.push("- FOB: " + item.documentId);
          if (item.date) {
            lines.push("- Dato: " + item.date);
          }
          if (item.referenceLabel) {
            lines.push("- Reference: " + item.referenceLabel);
          }
          lines.push("- Link: " + item.htmlUrl);
          lines.push("");
          lines.push("Noter:");
          lines.push(item.note?.trim() || "Ingen noter endnu.");
          lines.push("");
        }

        const blob = new Blob([lines.join("\\n")], { type: "text/markdown;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          const dateStamp = new Date().toISOString().slice(0, 10);
          link.href = url;
          link.download = "ombudsmanden-workspace-" + dateStamp + ".md";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
          statusEl.textContent = "Arbejdsbordet er eksporteret som Markdown.";
      }

      function formatTag(label, value) {
        return \`<span class="tag"><strong>\${escapeHtml(label)}</strong><span>\${escapeHtml(value)}</span></span>\`;
      }

      function summarizeText(text, maxLength = 480) {
        const normalized = String(text ?? "").replace(/\\s+/g, " ").trim();
        if (normalized.length <= maxLength) {
          return normalized;
        }

        return \`\${normalized.slice(0, maxLength).trim()}...\`;
      }

      function normalizeTopics(topics) {
        if (Array.isArray(topics)) {
          return topics;
        }

        if (typeof topics === "string" && topics.trim()) {
          return [topics.trim()];
        }

        return [];
      }

      function escapeRegex(value) {
        return String(value).replace(/[.*+?^{}$()|[\]\\]/g, "\\$&");
      }

      function highlightText(text, query) {
        const summary = summarizeText(text);
        const tokens = [...new Set(String(query ?? "")
          .toLowerCase()
          .split(/[^\\p{L}\\p{N}]+/u)
          .map((token) => token.trim())
          .filter((token) => token.length >= 4))];

        if (!tokens.length) {
          return escapeHtml(summary);
        }

        try {
          const pattern = new RegExp(\`(\${tokens.map(escapeRegex).join("|")})\`, "giu");
          return escapeHtml(summary).replace(pattern, "<mark>$1</mark>");
        } catch (error) {
          console.error("Kunne ikke fremhaeve soegeresultat", error);
          return escapeHtml(summary);
        }
      }

      function clearFilters() {
        yearInput.value = "";
        ministryInput.value = "";
        topicInput.value = "";
      }

      function renderLoadingState(mode) {
        answerEl.hidden = true;
        answerBadgeEl.textContent = "0 kilder brugt";
        answerBodyEl.textContent = "";
        answerActionsEl.hidden = true;
        answerBodyEl.classList.remove("is-collapsed");
        answerSourcesEl.hidden = true;
        answerSourcesGridEl.innerHTML = "";
        resultCountEl.textContent = "...";
        metaEl.innerHTML = "";
        activeFiltersEl.innerHTML = mode === "ask"
          ? '<span class="filter-chip">Genererer svar</span>'
          : '<span class="filter-chip">Søger i kilder</span>';
        hitsEl.innerHTML = \`
          <div class="loading-stack">
            <div class="skeleton skeleton-card">
              <div class="skeleton-line title"></div>
              <div class="skeleton-line meta"></div>
              <div class="skeleton-line long"></div>
              <div class="skeleton-line long"></div>
              <div class="skeleton-line short"></div>
            </div>
            <div class="skeleton skeleton-card">
              <div class="skeleton-line title"></div>
              <div class="skeleton-line meta"></div>
              <div class="skeleton-line long"></div>
              <div class="skeleton-line long"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        \`;
      }

      function renderHeaderMeta(payload) {
        const metaTags = [
          payload.backend ? formatTag("Backend", payload.backend) : null,
          payload.question ? formatTag("Spørgsmål", payload.question) : null
        ].filter(Boolean);

        const filterTags = [
          payload.filters?.year
            ? \`<span class="filter-chip">År: \${escapeHtml(payload.filters.year)}<button type="button" data-clear-filter="year" aria-label="Fjern år-filter">x</button></span>\`
            : null,
          payload.filters?.ministry
            ? \`<span class="filter-chip">Ministerium: \${escapeHtml(payload.filters.ministry)}<button type="button" data-clear-filter="ministry" aria-label="Fjern ministerium-filter">x</button></span>\`
            : null,
          payload.filters?.topic
            ? \`<span class="filter-chip">Emne: \${escapeHtml(payload.filters.topic)}<button type="button" data-clear-filter="topic" aria-label="Fjern emne-filter">x</button></span>\`
            : null
        ].filter(Boolean);

        metaEl.innerHTML = metaTags.join("");
        activeFiltersEl.innerHTML = filterTags.join("");
      }

      function hitLink(label, href) {
        if (!href) {
          return "";
        }

        return \`<a class="link-button" href="\${href}" target="_blank" rel="noreferrer">\${escapeHtml(label)}</a>\`;
      }

      function parseReferencedSourceNumbers(answer) {
        const matches = [...String(answer ?? "").matchAll(/\\[Kilde\\s+(\\d+)\\]/g)];
        return [...new Set(matches.map((match) => Number(match[1])).filter(Number.isFinite))];
      }

      function renderAnswerBody(answer) {
        if (!answer) {
          answerBodyEl.innerHTML = "";
          return [];
        }

        const referencedNumbers = parseReferencedSourceNumbers(answer);
        const html = String(answer)
          .trim()
          .split(/\\n\\s*\\n/)
          .filter(Boolean)
          .map((block) => {
            const lines = block.split(/\\n/).map((line) => line.trim()).filter(Boolean);
            if (!lines.length) {
              return "";
            }

            const headingLine = lines[0].replace(/^#+\s*/, "").trim();
            if (lines.length === 1 && /^(Kort svar|Det vigtigste|Kilder|Forbehold)$/i.test(headingLine)) {
              return \`<h4>\${escapeHtml(headingLine)}</h4>\`;
            }

            if (/^#+\s+/.test(lines[0]) && lines.length > 1) {
              const heading = lines[0].replace(/^#+\s*/, "").trim();
              const bodyLines = lines.slice(1);

              if (bodyLines.every((line) => /^[-*]\s+/.test(line))) {
                const items = bodyLines
                  .map((line) => line.replace(/^[-*]\s+/, ""))
                  .map((line) => \`<li>\${applyInlineFormatting(line)}</li>\`)
                  .join("");
                return \`<h4>\${escapeHtml(heading)}</h4><ul>\${items}</ul>\`;
              }

              return \`<h4>\${escapeHtml(heading)}</h4><p>\${applyInlineFormatting(bodyLines.join(" "))}</p>\`;
            }

            if (lines.every((line) => /^[-*]\\s+/.test(line))) {
              const items = lines
                .map((line) => line.replace(/^[-*]\\s+/, ""))
                .map((line) => \`<li>\${applyInlineFormatting(line)}</li>\`)
                .join("");
              return \`<ul>\${items}</ul>\`;
            }

            return \`<p>\${applyInlineFormatting(lines.join(" "))}</p>\`;
          })
          .join("");

        answerBodyEl.innerHTML = html;
        return referencedNumbers;
      }

      function renderAnswerSources(hits, referencedNumbers, query) {
        if (!hits?.length) {
          answerSourcesEl.hidden = true;
          answerSourcesGridEl.innerHTML = "";
          return;
        }

        const referencedSet = new Set(referencedNumbers);
        const selectedHits = referencedSet.size
          ? hits.filter((_, index) => referencedSet.has(index + 1))
          : hits.slice(0, Math.min(hits.length, 3));

        if (!selectedHits.length) {
          answerSourcesEl.hidden = true;
          answerSourcesGridEl.innerHTML = "";
          return;
        }

        answerSourcesEl.hidden = false;
        answerSourcesGridEl.innerHTML = selectedHits.map((hit) => {
          try {
            const index = hits.findIndex((candidate) => candidate.chunkId === hit.chunkId) + 1;
            const isReferenced = referencedSet.has(index);
            const meta = [hit.documentId, hit.referenceLabel, hit.date].filter(Boolean);
            const pinned = isPinned(hit.documentId);

            return \`
              <article id="source-card-\${index}" class="source-card\${isReferenced ? " is-referenced" : ""}" data-source-card="\${index}">
                <div class="source-top">
                  <div>
                    <div class="source-index">Kilde \${index}</div>
                    <h4 class="source-title">
                      <a href="\${hit.htmlUrl}" target="_blank" rel="noreferrer">\${escapeHtml(hit.title)}</a>
                    </h4>
                  </div>
                  <div class="hit-meta">
                    \${meta.map((item) => \`<span class="tag">\${escapeHtml(item)}</span>\`).join("")}
                    <button type="button" class="icon-button\${pinned ? " is-active" : ""}" data-pin-document="\${escapeHtml(hit.documentId)}">Gem</button>
                  </div>
                </div>
                <div class="source-snippet">\${highlightText(hit.text, query)}</div>
                <div class="hit-links">
                  \${hitLink("Afgørelse", hit.htmlUrl)}
                  \${hitLink("PDF", hit.pdfUrl)}
                  \${hitLink("Retsinformation", hit.retsinformationUrl)}
                </div>
              </article>
            \`;
          } catch (error) {
            console.error("Kunne ikke vise kildekort", error, hit);
            return \`
              <article class="source-card">
                <div class="source-top">
                  <div>
                    <div class="source-index">Kilde</div>
                    <h4 class="source-title">\${escapeHtml(hit?.title ?? "Ukendt kilde")}</h4>
                  </div>
                </div>
                <div class="source-snippet">\${escapeHtml(summarizeText(hit?.text ?? ""))}</div>
              </article>
            \`;
          }
        }).join("");
      }

      function focusSourceCard(sourceIndex) {
        const card = document.querySelector(\`[data-source-card="\${sourceIndex}"]\`);
        if (!card) {
          return;
        }

        for (const activeCard of document.querySelectorAll(".source-card.is-focused")) {
          activeCard.classList.remove("is-focused");
        }

        card.classList.add("is-focused");
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        window.setTimeout(() => {
          card.classList.remove("is-focused");
        }, 1800);
      }

      function renderHits(hits, query) {
        if (!hits?.length) {
          hitsEl.innerHTML = '<div class="empty">Ingen resultater for de valgte filtre. Prøv at fjerne et filter eller omformulere spørgsmålet.</div>';
          return;
        }

        hitsEl.innerHTML = hits.map((hit, index) => {
          try {
            const meta = [hit.documentId, hit.date, hit.ministry, hit.referenceLabel].filter(Boolean);
            const topicTags = normalizeTopics(hit.topics).slice(0, 3).map((topic) => formatTag("Emne", topic)).join("");
            const summary = highlightText(hit.text, query);
            const pinned = isPinned(hit.documentId);

            return \`
              <article class="hit">
                <div class="hit-top">
                  <div>
                    <div class="hit-index">Hit \${index + 1}</div>
                    <h3 class="hit-title">
                      <a href="\${hit.htmlUrl}" target="_blank" rel="noreferrer">\${escapeHtml(hit.title)}</a>
                    </h3>
                  </div>
                  <div class="hit-meta">\${meta.map((item) => \`<span class="tag">\${escapeHtml(item)}</span>\`).join("")}</div>
                </div>

                \${topicTags ? \`<div class="meta-row">\${topicTags}</div>\` : ""}

                <div class="hit-summary">\${summary}</div>

                <div class="hit-links">
                  <button type="button" class="icon-button\${pinned ? " is-active" : ""}" data-pin-document="\${escapeHtml(hit.documentId)}">Gem afgørelse</button>
                  \${hitLink("Afgørelse", hit.htmlUrl)}
                  \${hitLink("PDF", hit.pdfUrl)}
                  \${hitLink("Retsinformation", hit.retsinformationUrl)}
                </div>
              </article>
            \`;
          } catch (error) {
            console.error("Kunne ikke vise søgeresultat", error, hit);
            return \`
              <article class="hit">
                <div class="hit-top">
                  <div>
                    <div class="hit-index">Hit \${index + 1}</div>
                    <h3 class="hit-title">\${escapeHtml(hit?.title ?? "Ukendt afgørelse")}</h3>
                  </div>
                </div>
                <div class="hit-summary">\${escapeHtml(summarizeText(hit?.text ?? ""))}</div>
                <div class="hit-links">
                  \${hitLink("Afgørelse", hit?.htmlUrl)}
                </div>
              </article>
            \`;
          }
        }).join("");
      }

      function renderResult(payload) {
        currentHits = payload.hits ?? [];
        renderHeaderMeta(payload);
        const hitCount = currentHits.length;
        resultCountEl.textContent = String(hitCount);
        answerEl.hidden = !payload.answer;
        const referencedNumbers = renderAnswerBody(payload.answer ?? "");
        lastReferencedNumbers = referencedNumbers;
        answerBadgeEl.textContent = payload.answer
          ? \`\${referencedNumbers.length || Math.min(hitCount, 3)} kilder brugt\`
          : "0 kilder brugt";
        if (payload.answer) {
          renderAnswerSources(currentHits, referencedNumbers, payload.question);
        } else {
          answerSourcesEl.hidden = true;
          answerSourcesGridEl.innerHTML = "";
        }
        renderHits(currentHits, payload.question);
        const blockCount = answerBodyEl.children.length;
        if (payload.answer && blockCount > 6) {
          answerActionsEl.hidden = false;
          answerBodyEl.classList.add("is-collapsed");
          toggleAnswerButton.textContent = "Vis mere";
        } else {
          answerActionsEl.hidden = true;
          answerBodyEl.classList.remove("is-collapsed");
          toggleAnswerButton.textContent = "Vis mere";
        }
      }

      async function runSearch(mode) {
        const payload = currentPayload();
        if (!payload.question) {
          statusEl.textContent = "Skriv et spørgsmål først.";
          return;
        }

        searchButton.disabled = true;
        askButton.disabled = true;
        renderLoadingState(mode);
        statusEl.textContent = mode === "ask" ? "Genererer et kildebaseret svar..." : "Søger i afgørelserne...";

        try {
          let response;
          if (mode === "ask") {
            response = await fetch("/ask", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
          } else {
            const params = new URLSearchParams({
              q: payload.question,
              limit: String(payload.limit)
            });

            if (payload.filters.year) params.set("year", payload.filters.year);
            if (payload.filters.ministry) params.set("ministry", payload.filters.ministry);
            if (payload.filters.topic) params.set("topic", payload.filters.topic);

            response = await fetch(\`/search?\${params.toString()}\`, {
              credentials: "same-origin"
            });
          }

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error ?? "Ukendt fejl");
          }

          rememberSearch(payload);
          renderResult(result);
          statusEl.textContent =
            mode === "ask"
              ? \`Svar genereret på baggrund af \${result.hits?.length ?? 0} kilder.\`
              : \`Fandt \${result.hits?.length ?? 0} relevante hits.\`;
        } catch (error) {
          answerEl.hidden = true;
          answerBadgeEl.textContent = "0 kilder brugt";
          answerBodyEl.textContent = "";
          answerActionsEl.hidden = true;
          answerBodyEl.classList.remove("is-collapsed");
          answerSourcesEl.hidden = true;
          answerSourcesGridEl.innerHTML = "";
          resultCountEl.textContent = "0";
          hitsEl.innerHTML = '<div class="empty">Noget gik galt under søgningen. Prøv igen om et øjeblik.</div>';
          statusEl.textContent = error.message;
        } finally {
          searchButton.disabled = false;
          askButton.disabled = false;
        }
      }

        document.getElementById("search-form").addEventListener("submit", (event) => {
          event.preventDefault();
          runSearch("ask");
        });

        askButton.addEventListener("click", () => runSearch("ask"));
        searchButton.addEventListener("click", () => runSearch("search"));

      toggleAnswerButton.addEventListener("click", () => {
        const collapsed = answerBodyEl.classList.toggle("is-collapsed");
        toggleAnswerButton.textContent = collapsed ? "Vis mere" : "Vis mindre";
      });

      answerBodyEl.addEventListener("click", (event) => {
        const link = event.target.closest("[data-source-ref]");
        if (!link) {
          return;
        }

        event.preventDefault();
        focusSourceCard(link.dataset.sourceRef);
      });

      historyListEl.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-history-index]");
        if (!chip) {
          return;
        }

        const history = readStorage(STORAGE_KEYS.history);
        const item = history[Number(chip.dataset.historyIndex)];
        if (!item) {
          return;
        }

        questionInput.value = item.question ?? "";
        yearInput.value = item.filters?.year ?? "";
        ministryInput.value = item.filters?.ministry ?? "";
        topicInput.value = item.filters?.topic ?? "";
        runSearch("search");
      });

      document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-pin-document]");
        if (!button) {
          const unpinButton = event.target.closest("[data-unpin-document]");
          if (!unpinButton) {
            return;
          }

          const hit = currentHits.find((item) => item.documentId === unpinButton.dataset.unpinDocument)
            ?? pinnedDocuments.find((item) => item.documentId === unpinButton.dataset.unpinDocument);
          if (hit) {
            togglePin(hit);
          }
          return;
        }

        const hit = currentHits.find((item) => item.documentId === button.dataset.pinDocument);
        if (hit) {
          togglePin(hit);
        }
      });

      workspaceGridEl.addEventListener("input", (event) => {
        const textarea = event.target.closest("[data-note-document]");
        if (textarea) {
          updatePinnedNote(textarea.dataset.noteDocument, textarea.value);
          return;
        }

        const labelsInput = event.target.closest("[data-labels-document]");
        if (labelsInput) {
          updatePinnedLabels(labelsInput.dataset.labelsDocument, labelsInput.value);
        }
      });

      workspaceFilterEl.addEventListener("input", () => {
        renderWorkspace();
      });

      workspaceSortEl.addEventListener("change", () => {
        renderWorkspace();
      });

      clearFiltersButton.addEventListener("click", () => {
        clearFilters();
        if (questionInput.value.trim()) {
          runSearch("search");
        }
      });

      clearHistoryButton.addEventListener("click", () => {
        clearHistory();
      });

      exportWorkspaceButton.addEventListener("click", () => {
        exportWorkspace();
      });

      activeFiltersEl.addEventListener("click", (event) => {
        const button = event.target.closest("[data-clear-filter]");
        if (!button) {
          return;
        }

        const filter = button.dataset.clearFilter;
        if (filter === "year") {
          yearInput.value = "";
        }
        if (filter === "ministry") {
          ministryInput.value = "";
        }
        if (filter === "topic") {
          topicInput.value = "";
        }

        if (questionInput.value.trim()) {
          runSearch("search");
        }
      });

      for (const chip of suggestionEls) {
        chip.addEventListener("click", () => {
          questionInput.value = chip.dataset.question ?? "";
          questionInput.focus();
        });
      }

      pinnedDocuments = readStorage(STORAGE_KEYS.pins);
      exportWorkspaceButton.hidden = true;
      renderHistory();
      renderPins();
      renderWorkspace();
      questionInput.value = "Hvad siger ombudsmanden om aktindsigt?";
      loadMetadata().catch((error) => {
        statusEl.textContent = error.message;
      });
    </script>
  </body>
</html>`;
}
