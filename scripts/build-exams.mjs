import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExamMarkdown } from './lib/exam-parser.mjs';

export async function buildExamDataset({
  cwd = process.cwd(),
  pattern = /\.md$/i,
} = {}) {
  const entries = await readdir(cwd, { withFileTypes: true });
  const exams = [];

  for (const entry of entries) {
    if (!entry.isFile() || !pattern.test(entry.name)) {
      continue;
    }

    const filePath = path.join(cwd, entry.name);
    const source = await readFile(filePath, 'utf8');
    if (!source.startsWith('---')) {
      continue;
    }
    exams.push(parseExamMarkdown(source, entry.name));
  }

  exams.sort((left, right) => {
    if (left.subject !== right.subject) {
      return left.subject.localeCompare(right.subject, 'ko');
    }

    return left.releaseAt.localeCompare(right.releaseAt);
  });

  return `window.__EXAMS__ = ${JSON.stringify(exams, null, 2)};\n`;
}

export async function writeExamDataset({
  cwd = process.cwd(),
  outputFile = path.join(cwd, 'data', 'exams.js'),
} = {}) {
  const dataset = await buildExamDataset({ cwd });
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, dataset, 'utf8');

  const examCount = JSON.parse(dataset.replace(/^window\.__EXAMS__ = /, '').replace(/;\s*$/, '')).length;
  return { outputFile, examCount };
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const { outputFile, examCount } = await writeExamDataset();
  console.log(`Generated ${examCount} exam(s) -> ${outputFile}`);
}
