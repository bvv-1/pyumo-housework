import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tasks, todos } from './db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { houseworkTemplate, todoistTemplate, todoTemplate } from './template';

const todoistProjectId = '6gH27QV4hJ97jH7H';
const todoistApiUrl = 'https://api.todoist.com/api/v1';

type Bindings = {
  DB: D1Database;
  TODOIST_API_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const parseTodoistTaskId = (value: string) => (/^[A-Za-z0-9_-]+$/.test(value) ? value : null);

const todoistRequest = async (token: string, path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Request-Id', crypto.randomUUID());

  return fetch(`${todoistApiUrl}${path}`, { ...init, headers });
};

const listTodoistResults = async (token: string, path: string, query: Record<string, string>) => {
  const results: unknown[] = [];
  let cursor: string | null = null;

  do {
    const params = new URLSearchParams({ ...query, limit: '200' });
    if (cursor) params.set('cursor', cursor);

    const response = await todoistRequest(token, `${path}?${params}`);
    if (!response.ok) throw response;

    const page = await response.json<{ results?: unknown[]; next_cursor?: string | null }>();
    results.push(...(page.results ?? []));
    cursor = page.next_cursor ?? null;
  } while (cursor);

  return results;
};

const listTodoistTasks = (token: string) => listTodoistResults(token, '/tasks', { project_id: todoistProjectId });

const listTodoistSections = (token: string) => listTodoistResults(token, '/sections', { project_id: todoistProjectId });

const listTodoistComments = (token: string, taskId: string) => listTodoistResults(token, '/comments', { task_id: taskId });

const listTodoistCollaborators = (token: string) =>
  listTodoistResults(token, `/projects/${encodeURIComponent(todoistProjectId)}/collaborators`, {});

const todoistApiFailure = async (
  c: { json: (object: { error: string }, status: 400 | 401 | 403 | 404 | 429 | 502) => Response },
  response: Response,
) => {
  const body = await response.json<{ error?: string }>().catch(() => null);
  const status = [400, 401, 403, 404, 429].includes(response.status)
    ? (response.status as 400 | 401 | 403 | 404 | 429)
    : 502;
  return c.json({ error: body?.error || `Todoist APIへのリクエストに失敗しました (${response.status})` }, status);
};

// GET /api/tasks - List all tasks
app.get('/api/tasks', async (c) => {
  const db = drizzle(c.env.DB);
  const allTasks = await db.select().from(tasks).all();
  return c.json(allTasks);
});

// POST /api/tasks - Add a new task
app.post('/api/tasks', async (c) => {
  const { name, assignee } = await c.req.json<{ name: string; assignee: string }>();
  if (!name) return c.json({ error: 'Name is required' }, 400);

  const db = drizzle(c.env.DB);
  await db.insert(tasks).values({ name, assignee: assignee || 'A', updatedAt: new Date() });

  const allTasks = await db.select().from(tasks).all();
  return c.json(allTasks);
});

// PATCH /api/tasks/:id/toggle - Toggle assignee
app.patch('/api/tasks/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const db = drizzle(c.env.DB);

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) return c.json({ error: 'Task not found' }, 404);

  const nextAssignee = task.assignee === 'A' ? 'B' : 'A';
  await db
    .update(tasks)
    .set({
      assignee: nextAssignee,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));

  const allTasks = await db.select().from(tasks).all();
  return c.json(allTasks);
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const db = drizzle(c.env.DB);

  await db.delete(tasks).where(eq(tasks.id, id));

  const allTasks = await db.select().from(tasks).all();
  return c.json(allTasks);
});

const listTodos = (db: ReturnType<typeof drizzle>) => {
  return db.select().from(todos).orderBy(asc(todos.completed), desc(todos.createdAt)).all();
};

// GET /api/todos - List all shared todos
app.get('/api/todos', async (c) => {
  const db = drizzle(c.env.DB);
  const allTodos = await listTodos(db);
  return c.json(allTodos);
});

// POST /api/todos - Add a new shared todo
app.post('/api/todos', async (c) => {
  const body = await c.req.json<{ title?: unknown; name?: unknown }>().catch(() => null);
  const rawTitle = body?.title ?? body?.name;
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';

  if (!title) return c.json({ error: 'Title is required' }, 400);

  const now = new Date();
  const db = drizzle(c.env.DB);
  await db.insert(todos).values({ title, createdAt: now, updatedAt: now });

  const allTodos = await listTodos(db);
  return c.json(allTodos, 201);
});

// PATCH /api/todos/:id - Update a shared todo
app.patch('/api/todos/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid todo id' }, 400);

  const body = await c.req.json<{ title?: unknown; completed?: unknown }>().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON body' }, 400);

  const updates: { title?: string; completed?: boolean; updatedAt: Date } = { updatedAt: new Date() };

  if ('title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return c.json({ error: 'Title must be a non-empty string' }, 400);
    }
    updates.title = body.title.trim();
  }

  if ('completed' in body) {
    if (typeof body.completed !== 'boolean') {
      return c.json({ error: 'Completed must be a boolean' }, 400);
    }
    updates.completed = body.completed;
  }

  if (!('title' in updates) && !('completed' in updates)) {
    return c.json({ error: 'No todo fields to update' }, 400);
  }

  const db = drizzle(c.env.DB);
  const existingTodo = await db.select().from(todos).where(eq(todos.id, id)).get();
  if (!existingTodo) return c.json({ error: 'Todo not found' }, 404);

  await db.update(todos).set(updates).where(eq(todos.id, id));

  const allTodos = await listTodos(db);
  return c.json(allTodos);
});

// PATCH /api/todos/:id/toggle - Toggle shared todo completion
app.patch('/api/todos/:id/toggle', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid todo id' }, 400);

  const db = drizzle(c.env.DB);
  const todo = await db.select().from(todos).where(eq(todos.id, id)).get();
  if (!todo) return c.json({ error: 'Todo not found' }, 404);

  await db
    .update(todos)
    .set({
      completed: !todo.completed,
      updatedAt: new Date(),
    })
    .where(eq(todos.id, id));

  const allTodos = await listTodos(db);
  return c.json(allTodos);
});

// DELETE /api/todos/:id - Delete a shared todo
app.delete('/api/todos/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid todo id' }, 400);

  const db = drizzle(c.env.DB);
  const existingTodo = await db.select().from(todos).where(eq(todos.id, id)).get();
  if (!existingTodo) return c.json({ error: 'Todo not found' }, 404);

  await db.delete(todos).where(eq(todos.id, id));

  const allTodos = await listTodos(db);
  return c.json(allTodos);
});

// GET /api/todoist/tasks - List active tasks in the shared Todoist project
app.get('/api/todoist/tasks', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  try {
    return c.json(await listTodoistTasks(token));
  } catch (error) {
    if (error instanceof Response) return todoistApiFailure(c, error);
    return c.json({ error: 'Todoist APIに接続できませんでした。' }, 502);
  }
});

// GET /api/todoist/sections - List sections in the shared Todoist project
app.get('/api/todoist/sections', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  try {
    return c.json(await listTodoistSections(token));
  } catch (error) {
    if (error instanceof Response) return todoistApiFailure(c, error);
    return c.json({ error: 'Todoist APIに接続できませんでした。' }, 502);
  }
});

// GET /api/todoist/collaborators - List members of the shared Todoist project
app.get('/api/todoist/collaborators', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  try {
    return c.json(await listTodoistCollaborators(token));
  } catch (error) {
    if (error instanceof Response) return todoistApiFailure(c, error);
    return c.json({ error: 'Todoist APIに接続できませんでした。' }, 502);
  }
});

// POST /api/todoist/tasks - Add a task to the shared Todoist project
app.post('/api/todoist/tasks', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  const body = await c.req.json<{ content?: unknown; sectionId?: unknown }>().catch(() => null);
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) return c.json({ error: 'タスク名を入力してください。' }, 400);
  const sectionId = typeof body?.sectionId === 'string' && body.sectionId ? parseTodoistTaskId(body.sectionId) : null;
  if (typeof body?.sectionId === 'string' && body.sectionId && !sectionId) {
    return c.json({ error: 'Invalid Todoist section id' }, 400);
  }

  const response = await todoistRequest(token, '/tasks', {
    method: 'POST',
    body: JSON.stringify({ content, project_id: todoistProjectId, ...(sectionId ? { section_id: sectionId } : {}) }),
  });
  if (!response.ok) return todoistApiFailure(c, response);

  return c.json(await listTodoistTasks(token), 201);
});

// PATCH /api/todoist/tasks/:id - Rename a task
app.patch('/api/todoist/tasks/:id', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  const id = parseTodoistTaskId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid Todoist task id' }, 400);

  const body = await c.req.json<{ content?: unknown }>().catch(() => null);
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) return c.json({ error: 'タスク名を入力してください。' }, 400);

  const response = await todoistRequest(token, `/tasks/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (!response.ok) return todoistApiFailure(c, response);

  return c.json(await listTodoistTasks(token));
});

// GET /api/todoist/tasks/:id/comments - List comments attached to a task
app.get('/api/todoist/tasks/:id/comments', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  const id = parseTodoistTaskId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid Todoist task id' }, 400);

  try {
    return c.json(await listTodoistComments(token, id));
  } catch (error) {
    if (error instanceof Response) return todoistApiFailure(c, error);
    return c.json({ error: 'Todoist APIに接続できませんでした。' }, 502);
  }
});

// POST /api/todoist/tasks/:id/comments - Add a comment to a task
app.post('/api/todoist/tasks/:id/comments', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  const id = parseTodoistTaskId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid Todoist task id' }, 400);

  const body = await c.req.json<{ content?: unknown }>().catch(() => null);
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) return c.json({ error: 'コメントを入力してください。' }, 400);

  const response = await todoistRequest(token, '/comments', {
    method: 'POST',
    body: JSON.stringify({ task_id: id, content }),
  });
  if (!response.ok) return todoistApiFailure(c, response);

  return c.json(await listTodoistComments(token, id), 201);
});

// POST /api/todoist/tasks/:id/close - Complete a task
app.post('/api/todoist/tasks/:id/close', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  const id = parseTodoistTaskId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid Todoist task id' }, 400);

  const response = await todoistRequest(token, `/tasks/${encodeURIComponent(id)}/close`, { method: 'POST' });
  if (!response.ok) return todoistApiFailure(c, response);

  return c.json(await listTodoistTasks(token));
});

// DELETE /api/todoist/tasks/:id - Delete a task
app.delete('/api/todoist/tasks/:id', async (c) => {
  const token = c.env.TODOIST_API_TOKEN;
  if (!token) return c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

  const id = parseTodoistTaskId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid Todoist task id' }, 400);

  const response = await todoistRequest(token, `/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) return todoistApiFailure(c, response);

  return c.json(await listTodoistTasks(token));
});

// Pages
app.get('/', (c) => c.html(houseworkTemplate()));
app.get('/index.html', (c) => c.html(houseworkTemplate()));
app.get('/todo.html', (c) => c.html(todoTemplate()));
app.get('/todoist', (c) => c.html(todoistTemplate()));
app.get('/todoist.html', (c) => c.html(todoistTemplate()));

export default app;
