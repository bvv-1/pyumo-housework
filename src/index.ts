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

const todoistError = (c: Parameters<typeof app.get>[1] extends (context: infer Context) => unknown ? Context : never) =>
  c.json({ error: 'Todoist APIトークンが設定されていません。' }, 503);

const todoistRequest = async (token: string, path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Request-Id', crypto.randomUUID());

  return fetch(`${todoistApiUrl}${path}`, { ...init, headers });
};

const listTodoistTasks = async (token: string) => {
  const allTasks: unknown[] = [];
  let cursor: string | null = null;

  do {
    const params = new URLSearchParams({ project_id: todoistProjectId, limit: '200' });
    if (cursor) params.set('cursor', cursor);

    const response = await todoistRequest(token, `/tasks?${params}`);
    if (!response.ok) throw response;

    const page = await response.json<{ results?: unknown[]; next_cursor?: string | null }>();
    allTasks.push(...(page.results ?? []));
    cursor = page.next_cursor ?? null;
  } while (cursor);

  return allTasks;
};

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

// Pages
app.get('/', (c) => c.html(houseworkTemplate()));
app.get('/index.html', (c) => c.html(houseworkTemplate()));
app.get('/todo.html', (c) => c.html(todoTemplate()));
app.get('/todoist', (c) => c.redirect(todoistSharedProjectUrl));
app.get('/todoist.html', (c) => c.redirect(todoistSharedProjectUrl));

export default app;
