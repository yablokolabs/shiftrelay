import { env, requireMekoKey } from "../config.js";

export interface McpToolResult {
  raw: unknown;
  data: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: unknown;
    isError?: boolean;
    tools?: unknown[];
  };
  error?: { code: number; message: string; data?: unknown };
}

function parseSse(text: string): string[] {
  const payloads: string[] = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data) payloads.push(data);
  }
  return payloads;
}

/**
 * Meko wraps some tool payloads as {"result":"<json string>"} inside the MCP
 * text content. Unwrap only that single-key envelope so real data is untouched.
 */
function unwrapNested(value: unknown, depth = 0): unknown {
  if (depth > 4) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
    try {
      return unwrapNested(JSON.parse(trimmed), depth + 1);
    } catch {
      return value;
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === "result") {
      return unwrapNested(obj.result, depth + 1);
    }
  }
  return value;
}

function unwrapCall(result: JsonRpcResponse["result"]): unknown {
  if (!result) return null;
  if (result.structuredContent !== undefined) return unwrapNested(result.structuredContent);
  const texts = (result.content ?? [])
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text as string);
  if (texts.length === 0) return null;
  const joined = texts.join("\n");
  try {
    return unwrapNested(JSON.parse(joined));
  } catch {
    return joined;
  }
}

/**
 * Stateless Streamable-HTTP MCP client for the hosted Meko endpoint.
 * One instance == one agent session: it performs its own initialize.
 */
export class MekoSession {
  private nextId = 1;
  private sessionId: string | null = null;
  readonly label: string;
  readonly agentId: string;
  readonly datapackId: string;
  conversationId = "";
  calls = 0;

  constructor(label: string, agentId: string, datapackId: string) {
    this.label = label;
    this.agentId = agentId;
    this.datapackId = datapackId;
  }

  async initialize(): Promise<void> {
    this.calls += 1;
    const response = await this.post({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: `shiftrelay-${this.label}`, version: "0.1.0" },
      },
    });
    const sessionHeader = response.headers.get("mcp-session-id");
    if (sessionHeader) this.sessionId = sessionHeader;
    await this.notify("notifications/initialized", {});
  }

  async conversation(title: string, sessionSeed: string): Promise<string> {
    const data = (await this.call("conversation_create", {
      agent_id: this.agentId,
      datapack_id: this.datapackId,
      title,
      session_id: sessionSeed,
      metadata: JSON.stringify({ app: "shiftrelay", session: this.label }),
    })) as { id?: string; conversation_id?: string } | null;
    const id = data?.id ?? data?.conversation_id ?? "";
    if (!id) throw new Error(`conversation_create returned no id: ${JSON.stringify(data)}`);
    this.conversationId = id;
    return id;
  }

  async call(name: string, args: Record<string, unknown>): Promise<unknown> {
    this.calls += 1;
    const response = await this.post({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "tools/call",
      params: { name, arguments: args },
    });
    const envelope = (await this.readRpc(response)) as JsonRpcResponse;
    if (envelope.error) {
      throw new Error(`MCP ${name} failed: ${envelope.error.message}`);
    }
    if (envelope.result?.isError) {
      throw new Error(`MCP ${name} returned isError: ${JSON.stringify(unwrapCall(envelope.result))}`);
    }
    return unwrapCall(envelope.result);
  }

  async listTools(): Promise<unknown[]> {
    this.calls += 1;
    const response = await this.post({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "tools/list",
      params: {},
    });
    const envelope = (await this.readRpc(response)) as JsonRpcResponse;
    if (envelope.error) throw new Error(envelope.error.message);
    return envelope.result?.tools ?? [];
  }

  private async notify(method: string, params: Record<string, unknown>): Promise<void> {
    try {
      await this.post({ jsonrpc: "2.0", method, params });
    } catch {
      // Notifications are best-effort; Meko accepts stateless calls.
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${requireMekoKey()}`,
      "User-Agent": "shiftrelay/0.1",
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    return headers;
  }

  private async post(body: unknown): Promise<Response> {
    const response = await fetch(env.mekoMcpUrl, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok && response.status !== 202) {
      const text = await response.text();
      throw new Error(`Meko MCP HTTP ${response.status}: ${text.slice(0, 500)}`);
    }
    return response;
  }

  private async readRpc(response: Response): Promise<unknown> {
    if (response.status === 202) return { jsonrpc: "2.0", id: 0, result: {} };
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    if (contentType.includes("text/event-stream")) {
      for (const payload of parseSse(text)) {
        const parsed = JSON.parse(payload) as JsonRpcResponse;
        if (parsed.result || parsed.error) return parsed;
      }
      throw new Error("Meko MCP returned an empty event stream");
    }
    return JSON.parse(text);
  }
}

export async function openMekoSession(
  label: string,
  agentId: string,
  datapackId: string,
  conversationTitle?: string,
): Promise<MekoSession> {
  const session = new MekoSession(label, agentId, datapackId);
  await session.initialize();
  if (conversationTitle) {
    await session.conversation(conversationTitle, `shiftrelay-${label}-${Date.now()}`);
  }
  return session;
}
