#!/usr/bin/env node
/**
 * PostToolUse Hook: Frontend Linting
 *
 * 触发时机: Claude Code 写入或编辑任何文件后
 * 作用:
 *   1. 过滤出属于前端所有权范围的 .ts / .tsx 文件
 *      (src/frontend/** 和 src/app/** 但排除 src/app/api/**)
 *   2. 对目标文件运行 ESLint，将诊断结果作为上下文返回给 Claude
 *   3. 对目标文件运行 tsc --noEmit，将类型错误摘要返回给 Claude
 *
 * stdout: JSON (Claude Code 解析此输出)
 * stderr: 调试日志 (仅写入终端，不影响 Claude)
 * exit 0: 总是，让 Claude Code 继续；错误信息通过 additionalContext 传达
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

// ─── 1. 读取 stdin ────────────────────────────────────────────────────────────
let input;
try {
  const raw = readFileSync("/dev/stdin", "utf8");
  input = JSON.parse(raw);
} catch {
  // stdin 解析失败时静默退出，不干扰 Claude
  process.exit(0);
}

// ─── 2. 提取文件路径 ──────────────────────────────────────────────────────────
const filePath = input?.tool_input?.file_path ?? "";

// ─── 3. 过滤：只处理 .ts / .tsx 文件 ─────────────────────────────────────────
if (!/\.(ts|tsx)$/.test(filePath)) {
  process.exit(0);
}

// ─── 4. 过滤：只处理前端所有权范围 ───────────────────────────────────────────
// 规范化路径（Windows 用反斜杠，统一转换）
const normalizedPath = filePath.replace(/\\/g, "/");

const FRONTEND_PATTERNS = [
  /\/src\/frontend\//,
  /\/src\/app\/(?!api\/)/, // src/app/ 下，排除 src/app/api/
];

const isInScope = FRONTEND_PATTERNS.some((pattern) =>
  pattern.test(normalizedPath)
);

if (!isInScope) {
  process.exit(0);
}

// ─── 5. 确定项目根目录 ────────────────────────────────────────────────────────
// CLAUDE_PROJECT_DIR 由 Claude Code 注入；否则回退到 cwd
const projectRoot =
  process.env.CLAUDE_PROJECT_DIR ?? input?.cwd ?? process.cwd();

// ─── 6. 运行 ESLint ───────────────────────────────────────────────────────────
const lintResults = runESLint(filePath, projectRoot);

// ─── 7. 运行 TypeScript 类型检查 ──────────────────────────────────────────────
const typeResults = runTsc(projectRoot);

// ─── 8. 构建输出 ──────────────────────────────────────────────────────────────
const messages = [];

if (lintResults.hasIssues) {
  messages.push(`## ESLint (${path.basename(filePath)})\n${lintResults.output}`);
}

if (typeResults.hasErrors) {
  messages.push(`## TypeScript\n${typeResults.output}`);
}

if (messages.length === 0) {
  // 完全干净：输出简短确认，不打扰 Claude
  const out = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `✓ ESLint & tsc passed for ${path.basename(filePath)}`,
    },
  };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

// 有问题：告知 Claude 具体诊断，让它决定是否修复
const additionalContext = [
  `Frontend lint check found issues in \`${path.relative(projectRoot, filePath).replace(/\\/g, "/")}\`:`,
  "",
  ...messages,
  "",
  "Please review and fix these issues before proceeding.",
].join("\n");

const out = {
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext,
  },
};
process.stdout.write(JSON.stringify(out));
process.exit(0); // 始终 exit 0 —— 错误通过 context 传达，不中断流程

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

/**
 * 运行 ESLint，返回 { hasIssues: boolean, output: string }
 * 只报告 errors 和 warnings，忽略 info。
 */
function runESLint(targetFile, root) {
  try {
    // --format stylish 输出人类可读摘要
    // --max-warnings 0 让 warnings 也被计入失败（exit code 1），方便捕获
    execSync(
      `pnpm exec eslint --format stylish --max-warnings 0 "${targetFile}"`,
      {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
        timeout: 15_000,
      }
    );
    // exit 0 → 无问题
    return { hasIssues: false, output: "" };
  } catch (err) {
    const stdout = (err.stdout ?? "").trim();
    const stderr = (err.stderr ?? "").trim();

    // eslint 不存在 / 配置缺失时，stderr 会有提示，不当作 lint 失败
    if (!stdout && stderr) {
      process.stderr.write(`[frontend-lint] ESLint error: ${stderr}\n`);
      return { hasIssues: false, output: "" };
    }

    // 截断过长输出，避免撑爆 Claude 上下文
    const truncated = truncate(stdout || stderr, 2000);
    return { hasIssues: true, output: truncated };
  }
}

/**
 * 运行 tsc --noEmit，返回 { hasErrors: boolean, output: string }
 * 只报告 errors（忽略 strict 模式下大量 info），且只摘取与目标文件相关的行。
 */
function runTsc(root) {
  try {
    execSync("pnpm exec tsc --noEmit", {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      timeout: 30_000,
    });
    return { hasErrors: false, output: "" };
  } catch (err) {
    const raw = ((err.stdout ?? "") + (err.stderr ?? "")).trim();

    if (!raw) {
      return { hasErrors: false, output: "" };
    }

    // 过滤：只保留 error TS 行（跳过 info / note），截断
    const errorLines = raw
      .split("\n")
      .filter((l) => /error TS\d+/.test(l))
      .slice(0, 20); // 最多 20 条，防止过长

    if (errorLines.length === 0) {
      return { hasErrors: false, output: "" };
    }

    const summary =
      errorLines.join("\n") +
      (errorLines.length === 20 ? "\n… (output truncated)" : "");

    return { hasErrors: true, output: summary };
  }
}

/** 超过 maxLen 时截断，附加提示 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + `\n… (output truncated to ${maxLen} chars)`;
}
