import { html, raw } from 'hono/html';

type PageId = 'housework' | 'todo' | 'todoist';

const pageShell = (pageId: PageId, title: string, content: string, script: string) => html`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_top">
  <title>${title}</title>
  <style>
    :root {
      --primary-a: #4a90e2;
      --primary-b: #f5a623;
      --bg-color: #f4f7f6;
      --panel-color: #ffffff;
      --text-color: #333;
      --muted-color: #777;
      --line-color: #e6e8eb;
      --focus-color: #1f7ae0;
      --sidebar-width: 280px;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      min-height: 100vh;
      line-height: 1.5;
    }
    a {
      color: inherit;
    }
    .app-header {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 56px;
      padding: 8px 56px;
      background: rgba(244, 247, 246, 0.94);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      backdrop-filter: blur(10px);
    }
    .menu-button {
      position: absolute;
      left: 12px;
      top: 8px;
      width: 40px;
      height: 40px;
      border: 1px solid var(--line-color);
      border-radius: 8px;
      background: var(--panel-color);
      color: var(--text-color);
      cursor: pointer;
      display: grid;
      place-items: center;
      padding: 0;
    }
    .menu-button img {
      display: block;
      width: 21px;
      height: 21px;
    }
    .header-title {
      margin: 0;
      font-size: 1.35rem;
      text-align: center;
    }
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      z-index: 30;
      background: rgba(0, 0, 0, 0.28);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 40;
      width: min(var(--sidebar-width), 86vw);
      background: var(--panel-color);
      border-right: 1px solid var(--line-color);
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      padding: 14px;
    }
    body.sidebar-open {
      overflow: hidden;
    }
    body.sidebar-open .sidebar {
      transform: translateX(0);
    }
    body.sidebar-open .sidebar-backdrop {
      opacity: 1;
      pointer-events: auto;
    }
    .sidebar-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 40px;
      margin-bottom: 12px;
    }
    .sidebar-title {
      font-weight: 700;
      font-size: 1rem;
    }
    .icon-button {
      width: 36px;
      height: 36px;
      border: 1px solid var(--line-color);
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      font-size: 1.3rem;
      line-height: 1;
    }
    .nav-list {
      display: grid;
      gap: 6px;
    }
    .nav-link {
      display: block;
      padding: 11px 12px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      border: 1px solid transparent;
    }
    .nav-link:hover {
      background: #f5f7f9;
    }
    .nav-link.active {
      background: #eef6ff;
      border-color: #cfe5ff;
      color: #135da8;
    }
    main {
      width: 100%;
      padding: 16px;
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 520px;
      background: var(--panel-color);
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .task-item {
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid #eee;
      touch-action: pan-y;
      user-select: none;
    }
    .task-item:last-child { border-bottom: none; }
    .swipe-delete-bg {
      position: absolute;
      inset: 0 0 0 auto;
      width: 88px;
      background: #e03131;
      display: grid;
      place-items: center;
      opacity: 0;
      pointer-events: none;
    }
    .task-item.swiping .swipe-delete-bg {
      opacity: 1;
    }
    .swipe-delete-bg img {
      display: block;
      width: 26px;
      height: 26px;
      filter: brightness(0) invert(1);
    }
    .swipe-content {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 12px 0;
      background: var(--panel-color);
      transition: transform 0.18s ease;
    }
    .task-item.swiping .swipe-content {
      transition: none;
    }
    .task-name { font-weight: 500; overflow-wrap: anywhere; }
    .task-meta { font-size: 0.8rem; color: #888; margin-top: 2px; }
    .btn {
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: opacity 0.2s, background-color 0.2s;
      font-size: 1rem;
      white-space: nowrap;
    }
    .btn:active { opacity: 0.7; }
    .btn:disabled { cursor: wait; opacity: 0.88; }
    .btn-toggle { min-width: 80px; }
    .btn-toggle.A { background-color: var(--primary-a); color: white; }
    .btn-toggle.B { background-color: var(--primary-b); color: white; }
    .btn-delete {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      display: inline-grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      flex: 0 0 40px;
    }
    .btn-delete:hover {
      background-color: #e9ecef;
    }
    .btn-delete img {
      display: block;
      width: 20px;
      height: 20px;
      pointer-events: none;
      transform: translateX(-4px);
    }
    .add-form {
      margin-top: 24px;
      display: flex;
      gap: 10px;
    }
    .add-form input {
      flex-grow: 1;
      min-width: 0;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      outline: none;
      font-size: 1rem;
    }
    .add-form input:focus {
      border-color: var(--focus-color);
      box-shadow: 0 0 0 3px rgba(31, 122, 224, 0.12);
    }
    .btn-add { background-color: #2ecc71; color: white; flex-shrink: 0; }
    .loading { text-align: center; color: #888; margin: 20px; }
    .hidden { display: none; }
    [x-cloak] { display: none !important; }
    .todo-item {
    }
    .todo-item .swipe-content {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr) 40px;
      column-gap: 10px;
      align-items: center;
    }
    .todoist-item .swipe-content {
      grid-template-columns: 22px minmax(0, 1fr) 40px 40px;
    }
    .todoist-section-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      margin: -4px -4px 12px;
      padding: 4px;
      scrollbar-width: thin;
    }
    .todoist-section-tab {
      flex: 0 0 auto;
      border: 1px solid #cfd6dd;
      border-radius: 999px;
      padding: 7px 12px;
      background: #fff;
      color: var(--text-color);
      cursor: pointer;
      font: inherit;
      font-size: 0.9rem;
      white-space: nowrap;
    }
    .todoist-section-tab.active {
      background: #eef6ff;
      border-color: #8fc2f5;
      color: #135da8;
      font-weight: 700;
    }
    .todoist-task-row {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr) 40px 40px 40px;
      gap: 10px;
      align-items: center;
      padding: 12px 0;
    }
    .todoist-comments {
      margin: -4px 0 12px 32px;
      padding: 10px;
      border-radius: 8px;
      background: #f5f7f9;
    }
    .todoist-comment {
      padding: 6px 0;
      overflow-wrap: anywhere;
    }
    .todoist-comment-author {
      margin-bottom: 2px;
      color: #766f65;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .todoist-comment + .todoist-comment {
      border-top: 1px solid var(--line-color);
    }
    .todoist-comment-form {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .todoist-comment-form input {
      min-width: 0;
      padding: 9px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font: inherit;
    }
    .todoist-comment-form input { flex: 1; }
    .todoist-comment-form .btn { padding: 8px 12px; }
    .loading-spinner {
      display: inline-block;
      width: 25px;
      height: 25px;
      border: 3px solid rgba(137, 185, 211, 0.26);
      border-top-color: #89b9d3;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }
    .loading-spinner.button-spinner {
      width: 18px;
      height: 18px;
      border-width: 2px;
      border-color: rgba(255, 255, 255, 0.38);
      border-top-color: #fff;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Todoist: reference-inspired, soft mobile-first layout. */
    .page-todoist {
      --todoist-ink: #282826;
      --todoist-coral: #f4a05d;
      --todoist-aqua: #59cfcb;
      --todoist-sky: #89b9d3;
      --todoist-cream: #fcf5e4;
      --todoist-card: #fffefd;
      background: var(--todoist-cream);
      color: var(--todoist-ink);
    }
    .page-todoist .app-header {
      min-height: 68px; justify-content: flex-start; padding: 12px 20px;
      background: rgba(252, 245, 228, 0.92); border: 0;
    }
    .page-todoist .menu-button {
      position: static; width: 34px; height: 34px; border: 0; border-radius: 10px;
      background: transparent;
      filter: invert(68%) sepia(42%) saturate(657%) hue-rotate(335deg) brightness(100%) contrast(92%);
    }
    .page-todoist .header-title {
      margin-left: 8px; font-size: 1rem; font-weight: 750; text-align: left; letter-spacing: 0.02em;
    }
    .page-todoist main { align-items: flex-start; padding: 4px 16px 36px; }
    .page-todoist .container {
      max-width: 620px; padding: 12px 0 76px; background: transparent; border-radius: 0; box-shadow: none;
    }
    .page-todoist .todoist-section-tabs {
      gap: 10px; margin: 0 -4px 18px; padding: 4px; scrollbar-width: none;
    }
    .page-todoist .todoist-section-tabs::-webkit-scrollbar { display: none; }
    .page-todoist .todoist-section-tab {
      border: 0; padding: 10px 17px; background: transparent; color: #756f67;
      font-size: 0.98rem; font-weight: 650;
    }
    .page-todoist .todoist-section-tab.active {
      background: var(--todoist-sky); color: #fff; box-shadow: 0 5px 13px rgba(87, 136, 164, 0.18);
    }
    .todoist-toolbar {
      display: flex; align-items: center; min-height: 40px; margin: -4px 2px 10px;
      color: #706b64; font-size: 0.88rem;
    }
    .todoist-toolbar-label { margin-right: auto; font-weight: 650; }
    .todoist-toolbar img { width: 20px; height: 20px; opacity: 0.76; }
    .page-todoist .todoist-task-row {
      grid-template-columns: 28px minmax(0, 1fr) auto; gap: 12px; min-height: 74px;
      padding: 12px 14px; background: var(--todoist-card); border: 1px solid rgba(54, 46, 36, 0.06);
      border-radius: 20px; box-shadow: 0 7px 18px rgba(83, 71, 51, 0.07);
    }
    .page-todoist .todoist-item { overflow: visible; border: 0; margin: 10px 0; }
    .page-todoist .todoist-item .swipe-content { display: block; background: transparent; }
    .page-todoist .todoist-item .swipe-delete-bg { border-radius: 20px; }
    .page-todoist .todoist-item .task-name { font-size: 1.02rem; font-weight: 700; letter-spacing: 0.01em; }
    .todoist-task-meta {
      display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 4px; color: #817b72; font-size: 0.78rem;
    }
    .todoist-due, .todoist-deadline { display: inline-flex; align-items: center; gap: 3px; }
    .todoist-due::before, .todoist-deadline::before {
      width: 13px; height: 13px; content: ''; opacity: 0.7; background: center / contain no-repeat;
    }
    .todoist-due::before { background-image: url('https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/calendar-clock.svg'); }
    .todoist-deadline::before { background-image: url('https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/flag.svg'); }
    .todoist-actions { display: flex; gap: 2px; }
    .todoist-action {
      display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0;
      border-radius: 50%; background: transparent; color: #8d8983; cursor: pointer;
    }
    .todoist-action:hover { background: #f5f0e8; color: var(--todoist-ink); }
    .todoist-action img { width: 19px; height: 19px; opacity: 0.75; }
    .page-todoist .todoist-comments {
      margin: 8px 8px 2px 40px; padding: 12px; border-radius: 16px; background: rgba(255, 254, 253, 0.65);
    }
    .page-todoist .todo-check {
      appearance: none; width: 28px; height: 28px; border: 2px solid #c7c2bb; border-radius: 50%;
      background: #fff; cursor: pointer;
    }
    .page-todoist .todo-check:hover { border-color: var(--todoist-aqua); }
    .page-todoist .add-form {
      position: fixed; right: max(20px, calc((100vw - 620px) / 2)); bottom: 20px; z-index: 10;
      width: min(440px, calc(100vw - 40px)); margin: 0; padding: 8px; border: 1px solid rgba(53, 46, 37, 0.08);
      border-radius: 20px; background: rgba(255, 254, 253, 0.92); box-shadow: 0 10px 28px rgba(83, 71, 51, 0.16);
      backdrop-filter: blur(12px);
    }
    .page-todoist .add-form input { border: 0; background: transparent; }
    .page-todoist .add-form input:focus { box-shadow: none; }
    .page-todoist .btn-add { min-width: 58px; border-radius: 14px; background: var(--todoist-coral); }
    .todo-check {
      width: 22px;
      height: 22px;
      margin: 0;
      accent-color: #2ecc71;
    }
    .todo-name {
      transition: color 0.2s, text-decoration-color 0.2s;
    }
    .todo-item.completed .todo-name {
      color: var(--muted-color);
      text-decoration: line-through;
      text-decoration-thickness: 2px;
      text-decoration-color: #8a8f96;
    }
    @media (max-width: 480px) {
      main {
        padding: 12px;
      }
      .container {
        padding: 16px;
      }
      .btn {
        padding: 8px 12px;
        font-size: 0.9rem;
      }
      .add-form {
        gap: 8px;
      }
    }
  </style>
</head>
<body class="page-${pageId}" data-page="${pageId}" x-data="{ sidebarOpen: false }" :class="{ 'sidebar-open': sidebarOpen }" @keydown.window.escape="sidebarOpen = false">
  <header class="app-header">
    <button class="menu-button" type="button" @click="sidebarOpen = true" aria-label="メニューを開く">
      <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/panel-left.svg" alt="" aria-hidden="true">
    </button>
    <h1 class="header-title">${title}</h1>
  </header>

  <div class="sidebar-backdrop" @click="sidebarOpen = false" aria-hidden="true"></div>
  <aside class="sidebar" aria-label="ページメニュー">
    <div class="sidebar-head">
      <div class="sidebar-title">メニュー</div>
      <button class="icon-button" type="button" @click="sidebarOpen = false" aria-label="メニューを閉じる">×</button>
    </div>
    <nav class="nav-list">
      <a class="nav-link ${pageId === 'housework' ? 'active' : ''}" href="/index.html" @click="sidebarOpen = false">家事分担</a>
      <a class="nav-link ${pageId === 'todo' ? 'active' : ''}" href="/todo.html" @click="sidebarOpen = false">TODOリスト</a>
      <a class="nav-link ${pageId === 'todoist' ? 'active' : ''}" href="/todoist.html" @click="sidebarOpen = false">Todoist（共有）</a>
    </nav>
  </aside>

  <main>${raw(content)}</main>

  <script>
    function attachSwipeDelete(row, onDelete) {
      if (!row.dataset.swipeDeleteReady) {
        const background = document.createElement('div');
        background.className = 'swipe-delete-bg';
        background.setAttribute('aria-hidden', 'true');
        background.innerHTML = '<img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/trash-2.svg" alt="">';

        const content = document.createElement('div');
        content.className = 'swipe-content';
        while (row.firstChild) {
          content.appendChild(row.firstChild);
        }

        row.append(background, content);
        row.dataset.swipeDeleteReady = 'true';
      }

      const content = row.querySelector('.swipe-content');
      let startX = 0;
      let startY = 0;
      let deltaX = 0;
      let pointerId = null;
      let isSwiping = false;
      let hasDeleted = false;
      const threshold = 72;
      const maxReveal = 88;

      row.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) return;
        if (event.target.closest('button, input, a')) return;

        startX = event.clientX;
        startY = event.clientY;
        deltaX = 0;
        pointerId = event.pointerId;
        isSwiping = false;
        hasDeleted = false;
        row.setPointerCapture(pointerId);
      });

      row.addEventListener('pointermove', event => {
        if (pointerId !== event.pointerId || hasDeleted) return;

        const nextDeltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        if (!isSwiping && Math.abs(nextDeltaX) < 8) return;
        if (!isSwiping && Math.abs(deltaY) > Math.abs(nextDeltaX)) return;

        isSwiping = true;
        deltaX = Math.max(-maxReveal, Math.min(0, nextDeltaX));
        row.classList.add('swiping');
        content.style.transform = 'translateX(' + deltaX + 'px)';
        event.preventDefault();
      });

      function finishSwipe(event) {
        if (pointerId !== event.pointerId) return;

        if (row.hasPointerCapture(pointerId)) {
          row.releasePointerCapture(pointerId);
        }

        row.classList.remove('swiping');
        pointerId = null;

        if (isSwiping && Math.abs(deltaX) >= threshold) {
          hasDeleted = true;
          content.style.transform = '';
          onDelete();
          return;
        }

        content.style.transform = '';
        isSwiping = false;
      }

      row.addEventListener('pointerup', finishSwipe);
      row.addEventListener('pointercancel', finishSwipe);
    }
  </script>
  <script>${raw(script)}</script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</body>
</html>`;

export const houseworkTemplate = () => pageShell(
  'housework',
  '家事分担管理',
  `
  <div class="container" x-data="houseworkApp()" x-init="loadTasks()" x-cloak>
    <div class="loading" x-show="loading" role="status" aria-label="読み込み中"><span class="loading-spinner" aria-hidden="true"></span></div>
    <div>
      <template x-if="!loading && tasks.length === 0">
        <div class="loading">タスクがありません</div>
      </template>

      <template x-for="task in tasks" :key="task.id">
        <div class="task-item" x-init="$nextTick(() => attachSwipeDelete($el, () => deleteTask(task)))">
          <div style="flex-grow: 1;">
            <div class="task-name" x-text="task.name"></div>
            <div class="task-meta" x-text="taskMeta(task)"></div>
          </div>
          <button
            class="btn btn-toggle"
            type="button"
            :class="task.assignee"
            @click="toggleAssignee(task.id)"
            x-text="assigneeName(task.assignee)"
          ></button>
          <button class="btn btn-delete" type="button" title="削除" aria-label="削除" @click="deleteTask(task)">
            <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/trash-2.svg" alt="" aria-hidden="true">
          </button>
        </div>
      </template>
    </div>

    <form class="add-form" @submit.prevent="addTask">
      <input type="text" x-model="newTaskName" placeholder="新しい家事名..." />
      <button class="btn btn-add" type="submit">追加</button>
    </form>
  </div>
  `,
  `
    document.addEventListener('alpine:init', () => {
      Alpine.data('houseworkApp', () => ({
        tasks: [],
        newTaskName: '',
        loading: true,

        async loadTasks() {
          this.loading = true;
          try {
            this.tasks = await this.fetchJson('/api/tasks');
          } catch (error) {
            this.handleError(error);
          } finally {
            this.loading = false;
          }
        },

        async addTask() {
          const name = this.newTaskName.trim();
          if (!name) return;

          this.newTaskName = '';
          try {
            this.tasks = await this.fetchJson('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, assignee: 'A' })
            });
          } catch (error) {
            this.handleError(error);
          }
        },

        async toggleAssignee(id) {
          try {
            this.tasks = await this.fetchJson('/api/tasks/' + id + '/toggle', { method: 'PATCH' });
          } catch (error) {
            this.handleError(error);
          }
        },

        async deleteTask(task) {
          if (!confirm('「' + task.name + '」を削除しますか？')) return;
          try {
            this.tasks = await this.fetchJson('/api/tasks/' + task.id, { method: 'DELETE' });
          } catch (error) {
            this.handleError(error);
          }
        },

        assigneeName(assignee) {
          return assignee === 'A' ? 'もえち' : 'けんぴ';
        },

        taskMeta(task) {
          const updatedAt = new Date(task.updatedAt);
          const now = new Date();
          const diffTime = Math.max(0, now - updatedAt);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const dateStr = (updatedAt.getMonth() + 1) + '/' + updatedAt.getDate();
          return '最終: ' + dateStr + ' (' + diffDays + '日経過)';
        },

        async fetchJson(url, options) {
          const res = await fetch(url, options);
          if (!res.ok) throw new Error('Request failed: ' + res.status);
          return res.json();
        },

        handleError(error) {
          alert('エラーが発生しました: ' + error.message);
        }
      }));
    });
  `
);

export const todoTemplate = () => pageShell(
  'todo',
  'TODOリスト',
  `
  <div class="container" x-data="todoApp()" x-init="loadTodos()" x-cloak>
    <div class="loading" x-show="loading" role="status" aria-label="読み込み中"><span class="loading-spinner" aria-hidden="true"></span></div>
    <div>
      <template x-if="!loading && todos.length === 0">
        <div class="loading">TODOがありません</div>
      </template>

      <template x-for="todo in todos" :key="todo.id">
        <div
          class="task-item todo-item"
          :class="{ completed: todo.completed }"
          x-init="$nextTick(() => attachSwipeDelete($el, () => deleteTodo(todo.id)))"
        >
          <input class="todo-check" type="checkbox" :checked="todo.completed" @change="toggleTodo(todo.id)">
          <div class="task-name todo-name" x-text="todo.title"></div>
          <button class="btn btn-delete" type="button" title="削除" aria-label="削除" @click="deleteTodo(todo.id)">
            <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/trash-2.svg" alt="" aria-hidden="true">
          </button>
        </div>
      </template>
    </div>

    <form class="add-form" @submit.prevent="addTodo">
      <input type="text" x-model="newTodoTitle" placeholder="新しいTODO..." />
      <button class="btn btn-add" type="submit">追加</button>
    </form>
  </div>
  `,
  `
    document.addEventListener('alpine:init', () => {
      Alpine.data('todoApp', () => ({
        todos: [],
        newTodoTitle: '',
        loading: true,

        async loadTodos() {
          this.loading = true;
          try {
            this.todos = await this.fetchJson('/api/todos');
          } catch (error) {
            this.handleError(error);
          } finally {
            this.loading = false;
          }
        },

        async addTodo() {
          const title = this.newTodoTitle.trim();
          if (!title) return;

          this.newTodoTitle = '';
          try {
            this.todos = await this.fetchJson('/api/todos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title })
            });
          } catch (error) {
            this.handleError(error);
          }
        },

        async toggleTodo(id) {
          try {
            this.todos = await this.fetchJson('/api/todos/' + id + '/toggle', { method: 'PATCH' });
          } catch (error) {
            this.handleError(error);
          }
        },

        async deleteTodo(id) {
          try {
            this.todos = await this.fetchJson('/api/todos/' + id, { method: 'DELETE' });
          } catch (error) {
            this.handleError(error);
          }
        },

        async fetchJson(url, options) {
          const res = await fetch(url, options);
          if (!res.ok) throw new Error('Request failed: ' + res.status);
          return res.json();
        },

        handleError(error) {
          alert('エラーが発生しました: ' + error.message);
        }
      }));
    });
  `
);

export const todoistTemplate = () => pageShell(
  'todoist',
  'Todoist（共有）',
  `
  <div class="container" x-data="todoistApp()" x-init="loadTasks()" x-cloak>
    <div class="loading" x-show="loading" role="status" aria-label="読み込み中"><span class="loading-spinner" aria-hidden="true"></span></div>
    <template x-if="!loading && tasks.length === 0">
      <div class="loading">未完了のタスクはありません</div>
    </template>

    <div class="todoist-section-tabs" role="tablist" aria-label="セクション">
      <template x-for="section in selectableSections()" :key="section.id">
        <button
          class="todoist-section-tab"
          type="button"
          role="tab"
          :class="{ active: activeSectionId === section.id }"
          :aria-selected="activeSectionId === section.id"
          @click="selectSection(section.id)"
          x-text="section.name"
        ></button>
      </template>
    </div>

    <div class="todoist-toolbar" aria-label="タスク操作">
      <span class="todoist-toolbar-label" x-text="activeTasks().length + ' 件のタスク'"></span>
      <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/list-filter.svg" alt="" aria-hidden="true">
    </div>

    <template x-if="!loading && activeTasks().length === 0">
      <div class="loading">このセクションに未完了のタスクはありません</div>
    </template>

    <template x-for="task in sortedActiveTasks()" :key="task.id">
      <div class="task-item todoist-item">
        <div class="todoist-task-row">
          <input class="todo-check" type="checkbox" @change="completeTask(task.id)" aria-label="完了にする">
          <div>
            <div class="task-name todo-name" x-text="task.content"></div>
            <div class="todoist-task-meta" x-show="task.due || task.deadline || task.responsible_uid || task.assignee_id">
              <span class="todoist-due" x-show="task.due" x-text="dueLabel(task)"></span>
              <span class="todoist-deadline" x-show="task.deadline" x-text="deadlineLabel(task)"></span>
              <span x-show="task.responsible_uid || task.assignee_id" x-text="assigneeName(task)"></span>
            </div>
          </div>
          <div class="todoist-actions">
            <button class="todoist-action" type="button" title="コメント" aria-label="コメント" @click="toggleComments(task.id)">
              <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/message-circle.svg" alt="" aria-hidden="true">
            </button>
            <button class="todoist-action" type="button" title="編集" aria-label="編集" @click="editTask(task)">
              <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/pencil.svg" alt="" aria-hidden="true">
            </button>
            <button class="todoist-action" type="button" title="削除" aria-label="削除" @click="deleteTask(task.id)">
              <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/trash-2.svg" alt="" aria-hidden="true">
            </button>
          </div>
        </div>

        <div class="todoist-comments" x-show="openTaskId === task.id" x-cloak>
          <div class="loading" x-show="commentsLoading" role="status" aria-label="コメントを読み込み中"><span class="loading-spinner" aria-hidden="true"></span></div>
          <template x-if="!commentsLoading && comments.length === 0">
            <div class="task-meta">コメントはありません</div>
          </template>
          <template x-for="comment in comments" :key="comment.id">
            <div class="todoist-comment">
              <div class="todoist-comment-author" x-text="commentAuthorName(comment)"></div>
              <div x-text="comment.content"></div>
            </div>
          </template>
          <form class="todoist-comment-form" @submit.prevent="addComment(task.id)">
            <input type="text" x-model="newCommentContent" placeholder="コメントを追加..." aria-label="コメント">
            <button class="btn btn-add" type="submit">送信</button>
          </form>
        </div>
      </div>
    </template>

    <form class="add-form" @submit.prevent="addTask">
      <input type="text" x-model="newTaskContent" placeholder="新しいタスク..." />
      <button class="btn btn-add" type="submit" :disabled="addingTask" :aria-label="addingTask ? 'タスクを追加中' : '追加'">
        <span x-show="!addingTask">追加</span>
        <span class="loading-spinner button-spinner" x-show="addingTask" x-cloak aria-hidden="true"></span>
      </button>
    </form>
  </div>
  `,
  `
    document.addEventListener('alpine:init', () => {
      Alpine.data('todoistApp', () => ({
        tasks: [],
        sections: [],
        collaborators: [],
        newTaskContent: '',
        activeSectionId: null,
        openTaskId: null,
        comments: [],
        commentsLoading: false,
        newCommentContent: '',
        addingTask: false,
        loading: true,

        async loadTasks() {
          this.loading = true;
          try {
            const [tasks, sections, collaborators] = await Promise.all([
              this.fetchJson('/api/todoist/tasks'),
              this.fetchJson('/api/todoist/sections'),
              this.fetchJson('/api/todoist/collaborators')
            ]);
            this.tasks = tasks;
            this.sections = sections;
            this.collaborators = collaborators;
            if (!this.selectableSections().some(section => section.id === this.activeSectionId)) {
              this.activeSectionId = this.selectableSections()[0]?.id ?? '__no_section__';
            }
          } catch (error) {
            this.handleError(error);
          } finally {
            this.loading = false;
          }
        },

        async addTask() {
          const content = this.newTaskContent.trim();
          if (!content || this.addingTask) return;

          this.newTaskContent = '';
          this.addingTask = true;
          try {
            this.tasks = await this.fetchJson('/api/todoist/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content, sectionId: this.activeSectionId === '__no_section__' ? '' : this.activeSectionId })
            });
          } catch (error) {
            this.handleError(error);
          } finally {
            this.addingTask = false;
          }
        },

        selectableSections() {
          const sections = [...this.sections].sort((a, b) => a.section_order - b.section_order);
          if (this.tasks.some(task => !task.section_id) || sections.length === 0) {
            sections.unshift({ id: '__no_section__', name: 'セクションなし' });
          }
          return sections;
        },

        selectSection(sectionId) {
          this.activeSectionId = sectionId;
          this.openTaskId = null;
        },

        activeTasks() {
          return this.tasks.filter(task => (task.section_id || '__no_section__') === this.activeSectionId);
        },

        sortedActiveTasks() {
          return [...this.activeTasks()].sort((left, right) => {
            const dueDifference = this.taskDueTimestamp(left) - this.taskDueTimestamp(right);
            if (dueDifference) return dueDifference;
            return (left.child_order ?? left.order ?? 0) - (right.child_order ?? right.order ?? 0);
          });
        },

        taskDueTimestamp(task) {
          const due = task.due?.datetime || task.due?.date || task.deadline?.date;
          if (!due) return Number.POSITIVE_INFINITY;
          const date = /^\\d{4}-\\d{2}-\\d{2}$/.test(due) ? new Date(due + 'T00:00:00') : new Date(due);
          const timestamp = date.getTime();
          return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
        },

        formatTaskDate(value) {
          if (!value) return '';
          const date = /^\\d{4}-\\d{2}-\\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
          if (Number.isNaN(date.getTime())) return value;
          const options = { month: 'numeric', day: 'numeric', weekday: 'short' };
          if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
            options.hour = '2-digit';
            options.minute = '2-digit';
          }
          return new Intl.DateTimeFormat('ja-JP', options).format(date);
        },

        dueLabel(task) {
          const due = task.due;
          if (!due) return '';
          const date = this.formatTaskDate(due.datetime || due.date);
          const recurring = due.is_recurring ?? due.recurring;
          return (recurring ? '繰り返し・' : '期限・') + date;
        },

        deadlineLabel(task) {
          return task.deadline?.date ? '締切・' + this.formatTaskDate(task.deadline.date) : '';
        },

        assigneeName(task) {
          const assigneeId = task.responsible_uid || task.assignee_id;
          if (!assigneeId) return '担当なし';
          const collaborator = this.collaborators.find(user => String(user.id) === String(assigneeId));
          const name = collaborator?.name || collaborator?.full_name || collaborator?.email || String(assigneeId);
          return '担当: ' + name;
        },

        commentAuthorName(comment) {
          const authorId = comment.posted_uid;
          const collaborator = this.collaborators.find(user => String(user.id) === String(authorId));
          const name = collaborator?.name || collaborator?.full_name || collaborator?.email;
          return name || (authorId ? '投稿者: ' + authorId : '投稿者不明');
        },

        async completeTask(id) {
          try {
            this.tasks = await this.fetchJson('/api/todoist/tasks/' + id + '/close', { method: 'POST' });
          } catch (error) {
            this.handleError(error);
          }
        },

        async editTask(task) {
          const content = prompt('タスクを編集', task.content);
          if (content === null || !content.trim() || content.trim() === task.content) return;

          try {
            this.tasks = await this.fetchJson('/api/todoist/tasks/' + task.id, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: content.trim() })
            });
          } catch (error) {
            this.handleError(error);
          }
        },

        async toggleComments(taskId) {
          if (this.openTaskId === taskId) {
            this.openTaskId = null;
            return;
          }

          this.openTaskId = taskId;
          this.newCommentContent = '';
          this.commentsLoading = true;
          try {
            this.comments = await this.fetchJson('/api/todoist/tasks/' + taskId + '/comments');
          } catch (error) {
            this.openTaskId = null;
            this.handleError(error);
          } finally {
            this.commentsLoading = false;
          }
        },

        async addComment(taskId) {
          const content = this.newCommentContent.trim();
          if (!content) return;

          this.newCommentContent = '';
          try {
            this.comments = await this.fetchJson('/api/todoist/tasks/' + taskId + '/comments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content })
            });
          } catch (error) {
            this.handleError(error);
          }
        },

        async deleteTask(id) {
          if (!confirm('このTodoistタスクを削除しますか？')) return;
          try {
            this.tasks = await this.fetchJson('/api/todoist/tasks/' + id, { method: 'DELETE' });
          } catch (error) {
            this.handleError(error);
          }
        },

        async fetchJson(url, options) {
          const res = await fetch(url, options);
          const body = await res.json().catch(() => null);
          if (!res.ok) throw new Error(body?.error || 'Request failed: ' + res.status);
          return body;
        },

        handleError(error) {
          alert('エラーが発生しました: ' + error.message);
        }
      }));
    });
  `
);
