import { env, requireMekoKey } from "../config.js";

interface Envelope<T> {
  data: T | null;
  error?: { code: string; message: string };
}

async function rest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${env.mekoApiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireMekoKey()}`,
      "User-Agent": "shiftrelay/0.1",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(45_000),
  });
  const text = await response.text();
  let body: Envelope<T>;
  try {
    body = JSON.parse(text) as Envelope<T>;
  } catch {
    throw new Error(`Meko REST ${path} returned non-JSON (HTTP ${response.status})`);
  }
  if (!response.ok || body.error) {
    throw new Error(
      `Meko REST ${path} HTTP ${response.status}: ${body.error?.code ?? "ERROR"} ${body.error?.message ?? ""}`,
    );
  }
  return body.data as T;
}

export interface DatapackSummary {
  datapack_id: string;
  datapack_name: string;
  grant: string;
}

export interface DatapackDetail {
  datapack_id: string;
  datapack_name: string;
  description: string;
  grant: string;
  memory_count: number;
  learnings_count: number;
  knowledge_count: number;
  collective_memory_count: number;
  conversation_search_opt_out: boolean;
}

export const mekoRest = {
  health(): Promise<unknown> {
    return rest("/health", {
      headers: { Authorization: undefined as unknown as string },
    });
  },
  listDatapacks(): Promise<{ items: DatapackSummary[] }> {
    return rest("/datapacks?limit=100");
  },
  createDatapack(name: string, description: string): Promise<{ datapack_id: string }> {
    return rest("/datapacks", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  },
  describeDatapack(id: string): Promise<DatapackDetail> {
    return rest(`/datapacks/${id}`);
  },
  putArtifact(
    datapackId: string,
    filename: string,
    content: Buffer,
    contentType: string,
  ): Promise<{ content_hash: string; size_bytes: number; stored_in: string }> {
    return rest(`/datapacks/${datapackId}/artifacts`, {
      method: "POST",
      body: JSON.stringify({
        filename,
        content_type: contentType,
        content_base64: content.toString("base64"),
      }),
    });
  },
  getArtifact(datapackId: string, contentHash: string): Promise<Record<string, unknown>> {
    return rest(`/datapacks/${datapackId}/artifacts/${contentHash}`);
  },
  listDocuments(datapackId: string): Promise<{ items: Array<Record<string, unknown>> }> {
    return rest(`/datapacks/${datapackId}/knowledge-bases/documents?page=1&page_size=50`);
  },
};
