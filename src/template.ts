import { html, raw } from 'hono/html';

type PageId = 'housework' | 'todo';

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
<body data-page="${pageId}" x-data="{ sidebarOpen: false }" :class="{ 'sidebar-open': sidebarOpen }" @keydown.window.escape="sidebarOpen = false">
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
      <a class="nav-link" href="/todoist" @click="sidebarOpen = false">Todoist（共有）</a>
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
    <div class="loading" x-show="loading">読み込み中...</div>
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
    <div class="loading" x-show="loading">読み込み中...</div>
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
