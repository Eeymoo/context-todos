import { createClient, type Client } from '@libsql/client';
import { resolve } from 'node:path';
import type { TodoItem } from './types.js';

const DB_FILE = '.context-todos.db';

let client: Client | null = null;

export async function initDb(basePath: string = '.'): Promise<Client> {
  const dbPath = resolve(basePath, DB_FILE);
  client = createClient({ url: `file:${dbPath}` });

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file TEXT NOT NULL,
        tag TEXT NOT NULL,
        line INTEGER NOT NULL,
        ref TEXT NOT NULL DEFAULT '',
        text TEXT NOT NULL,
        category TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch('now', 'subsec') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch('now', 'subsec') * 1000),
        UNIQUE(file, line, tag)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_todos_file ON todos(file)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_tag ON todos(tag)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_updated ON todos(updated_at DESC)`,
    ],
    'write',
  );

  return client;
}

export function getDb(): Client {
  if (!client) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return client;
}

export async function syncFileTodos(file: string, todos: TodoItem[]): Promise<void> {
  const db = getDb();

  if (todos.length === 0) {
    await db.execute({ sql: 'DELETE FROM todos WHERE file = ?', args: [file] });
    return;
  }

  const tx = await db.transaction('write');
  try {
    await tx.execute({ sql: 'DELETE FROM todos WHERE file = ?', args: [file] });

    for (const todo of todos) {
      await tx.execute({
        sql: `INSERT INTO todos (file, tag, line, ref, text, category, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, unixepoch('now', 'subsec') * 1000)`,
        args: [todo.file, todo.tag, todo.line, todo.ref || '', todo.text, todo.category ?? null],
      });
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
}

export async function removeFileTodos(file: string): Promise<void> {
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM todos WHERE file = ?', args: [file] });
}

export interface TodoQuery {
  tag?: string | undefined;
  file?: string | undefined;
  category?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export async function queryTodos(query: TodoQuery = {}): Promise<{ todos: TodoItem[]; total: number }> {
  const db = getDb();

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (query.tag) {
    conditions.push('tag = ?');
    args.push(query.tag);
  }
  if (query.file) {
    conditions.push('file LIKE ?');
    args.push(`%${query.file}%`);
  }
  if (query.category) {
    conditions.push('category = ?');
    args.push(query.category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM todos ${where}`,
    args,
  });
  const total = Number(countResult.rows[0]?.total ?? 0);

  const limit = query.limit ?? 100;
  const offset = query.offset ?? 0;

  const result = await db.execute({
    sql: `SELECT file, tag, line, ref, text, category FROM todos ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  const todos: TodoItem[] = result.rows.map((row) => ({
    file: String(row.file),
    tag: String(row.tag),
    line: Number(row.line),
    ref: String(row.ref),
    text: String(row.text),
    ...(row.category ? { category: String(row.category) } : {}),
  }));

  return { todos, total };
}

export interface TodoStats {
  total: number;
  byTag: { tag: string; count: number }[];
  byFile: { file: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

export async function getTodoStats(): Promise<TodoStats> {
  const db = getDb();

  const results = await db.batch(
    [
      'SELECT COUNT(*) as total FROM todos',
      'SELECT tag, COUNT(*) as count FROM todos GROUP BY tag ORDER BY count DESC',
      'SELECT file, COUNT(*) as count FROM todos GROUP BY file ORDER BY count DESC LIMIT 20',
      'SELECT category, COUNT(*) as count FROM todos WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC',
    ],
    'read',
  );

  const totalResult = results[0];
  const tagResult = results[1];
  const fileResult = results[2];
  const categoryResult = results[3];

  return {
    total: Number(totalResult?.rows[0]?.total ?? 0),
    byTag: (tagResult?.rows ?? []).map((r) => ({ tag: String(r.tag), count: Number(r.count) })),
    byFile: (fileResult?.rows ?? []).map((r) => ({ file: String(r.file), count: Number(r.count) })),
    byCategory: (categoryResult?.rows ?? []).map((r) => ({ category: String(r.category), count: Number(r.count) })),
  };
}
