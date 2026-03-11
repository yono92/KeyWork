#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_OUTPUT = "src/data/proverbs.json";
const OPENDICT_API_URL = "https://opendict.korean.go.kr/api/search";
const DEFAULT_QUERIES = [
  "가",
  "나",
  "다",
  "마",
  "바",
  "사",
  "아",
  "자",
  "차",
  "카",
  "타",
  "파",
  "하",
  "사람",
  "말",
  "마음",
  "손",
  "눈",
  "길",
  "집",
  "밥",
  "물",
  "불",
  "돈",
];
const DEFAULT_ENGLISH = [
  "Actions speak louder than words.",
  "Better late than never.",
  "Honesty is the best policy.",
  "Practice makes perfect.",
  "Slow and steady wins the race.",
];

function printHelp() {
  console.log(`Usage: node scripts/sync-practice-corpus.mjs [options]

Options:
  --output <path>        Output JSON path (default: ${DEFAULT_OUTPUT})
  --query <value>        Add an OpenDict query. Can be repeated.
  --query-file <path>    Load queries from a newline-delimited text file.
  --merge-file <path>    Merge extra corpus entries from JSON/CSV/TXT. Can be repeated.
  --dry-run              Print counts without writing output.
  --help                 Show this message

Environment:
  OPENDICT_API_KEY       Required for OpenDict fetching

Behavior:
  - Fetches Korean proverb entries from OpenDict with type1=proverb
  - Optionally merges public-data files downloaded separately
  - Preserves existing English entries unless input files provide english values
`);
}

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    queries: [],
    queryFile: null,
    mergeFiles: [],
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--output") {
      options.output = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--query") {
      options.queries.push(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--query-file") {
      options.queryFile = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--merge-file") {
      options.mergeFiles.push(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeSentence(value) {
  return value
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKoreanSentence(value) {
  return normalizeSentence(value)
    .replace(/[^가-힣0-9\s.,!?"'():;\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEnglishSentence(value) {
  return normalizeSentence(value)
    .replace(/[^A-Za-z0-9\s.,!?"'():;\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueNormalized(values, normalizer) {
  return [...new Set(values.map((value) => normalizer(value)).filter(Boolean))];
}

async function loadJsonIfExists(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function loadQueries(queryFile) {
  if (!queryFile) return [];
  const content = await readFile(queryFile, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCsvLines(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => line.split(",").map((part) => part.trim()).filter(Boolean));
}

async function loadMergeEntries(filePath) {
  const content = await readFile(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return { korean: parsed, english: [] };
    }
    return {
      korean: Array.isArray(parsed.korean) ? parsed.korean : [],
      english: Array.isArray(parsed.english) ? parsed.english : [],
    };
  }

  const rows = filePath.endsWith(".csv")
    ? parseCsvLines(content)
    : content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return {
    korean: rows.filter((row) => /[가-힣]/.test(row)),
    english: rows.filter((row) => /[A-Za-z]/.test(row) && !/[가-힣]/.test(row)),
  };
}

async function fetchOpenDictQuery(apiKey, query, start) {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    req_type: "json",
    part: "word",
    sort: "dict",
    advanced: "y",
    method: "include",
    type1: "proverb",
    type4: "general",
    num: "100",
    start: String(start),
  });

  const response = await fetch(`${OPENDICT_API_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "KeyWork/1.0 corpus sync script",
    },
  });

  if (!response.ok) {
    throw new Error(`OpenDict request failed (${response.status}) for query "${query}"`);
  }

  const payload = await response.json();
  if (payload?.error) {
    throw new Error(`OpenDict error ${payload.error.error_code}: ${payload.error.message}`);
  }

  return payload?.channel ?? null;
}

function extractOpenDictWords(channel) {
  const items = Array.isArray(channel?.item)
    ? channel.item
    : channel?.item
      ? [channel.item]
      : [];

  return items
    .map((item) => String(item?.word ?? ""))
    .map((word) => word.replace(/\^/g, " ").trim())
    .filter(Boolean);
}

async function collectOpenDictProverbs(apiKey, queries) {
  const collected = [];

  for (const query of queries) {
    for (let start = 1; start <= 1000; start += 100) {
      const channel = await fetchOpenDictQuery(apiKey, query, start);
      const words = extractOpenDictWords(channel);
      if (words.length === 0) break;
      collected.push(...words);

      const total = Number(channel?.total ?? 0);
      if (!Number.isFinite(total) || start + 99 >= total) break;
    }
  }

  return uniqueNormalized(collected, normalizeKoreanSentence);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.OPENDICT_API_KEY;
  if (!apiKey) {
    throw new Error("OPENDICT_API_KEY is required");
  }

  const outputPath = path.resolve(process.cwd(), options.output);
  const existing = (await loadJsonIfExists(outputPath)) ?? {};
  const fileQueries = await loadQueries(options.queryFile);
  const queries = [...new Set([...DEFAULT_QUERIES, ...fileQueries, ...options.queries].filter(Boolean))];
  if (queries.length === 0) {
    throw new Error("At least one query is required");
  }

  const korean = await collectOpenDictProverbs(apiKey, queries);
  const mergedKorean = [...korean];
  const mergedEnglish = Array.isArray(existing.english) ? existing.english : DEFAULT_ENGLISH;

  for (const mergeFile of options.mergeFiles) {
    const entries = await loadMergeEntries(path.resolve(process.cwd(), mergeFile));
    mergedKorean.push(...entries.korean);
    if (entries.english.length > 0) {
      mergedEnglish.push(...entries.english);
    }
  }

  const nextPayload = {
    korean: uniqueNormalized(
      [...(Array.isArray(existing.korean) ? existing.korean : []), ...mergedKorean],
      normalizeKoreanSentence
    ),
    english: uniqueNormalized(mergedEnglish, normalizeEnglishSentence),
  };

  if (options.dryRun) {
    console.log(JSON.stringify({
      output: outputPath,
      koreanCount: nextPayload.korean.length,
      englishCount: nextPayload.english.length,
      queries: queries.length,
      mergeFiles: options.mergeFiles.length,
    }, null, 2));
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(`${outputPath}`, `${JSON.stringify(nextPayload, null, 4)}\n`, "utf8");

  console.log(`Wrote ${nextPayload.korean.length} korean and ${nextPayload.english.length} english entries to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
