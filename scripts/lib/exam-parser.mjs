const REQUIRED_FIELDS = ['title', 'subject', 'exam', 'releaseAt'];

export function parseExamMarkdown(source, filename) {
  const { data, body } = splitFrontMatter(source, filename);
  validateMetadata(data, filename);
  const sections = splitSections(body, filename);

  return {
    id: createId(data, filename),
    title: data.title,
    subject: data.subject,
    exam: data.exam,
    releaseAt: data.releaseAt,
    timezone: data.timezone ?? 'Asia/Seoul',
    year: data.year ?? null,
    term: data.term ?? null,
    summaryHtml: sections.summary ? markdownToHtml(sections.summary) : '',
    answerKeyHtml: markdownToHtml(sections.answerKey),
    explanationsHtml: markdownToHtml(sections.explanations),
  };
}

function splitFrontMatter(source, filename) {
  const normalized = source.replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---\n')) {
    throw new Error(`${filename}: missing YAML front matter`);
  }

  const end = normalized.indexOf('\n---\n', 4);

  if (end === -1) {
    throw new Error(`${filename}: unterminated YAML front matter`);
  }

  const rawYaml = normalized.slice(4, end);
  const body = normalized.slice(end + 5).trim();

  return {
    data: parseSimpleYaml(rawYaml, filename),
    body,
  };
}

function parseSimpleYaml(rawYaml, filename) {
  const result = {};

  for (const line of rawYaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const separator = trimmed.indexOf(':');
    if (separator === -1) {
      throw new Error(`${filename}: invalid front matter line "${line}"`);
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (/^-?\d+$/.test(value)) {
      result[key] = Number(value);
      continue;
    }

    result[key] = value;
  }

  return result;
}

function validateMetadata(data, filename) {
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new Error(`${filename}: missing required field "${field}"`);
    }
  }

  if (!['midterm', 'final'].includes(data.exam)) {
    throw new Error(`${filename}: exam must be "midterm" or "final"`);
  }

  if (Number.isNaN(Date.parse(data.releaseAt))) {
    throw new Error(`${filename}: releaseAt must be a valid ISO datetime`);
  }
}

function splitSections(body, filename) {
  const lines = body.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.*)$/);

    if (heading) {
      current = {
        title: heading[1].trim(),
        lines: [],
      };
      sections.push(current);
      continue;
    }

    if (!current) {
      continue;
    }

    current.lines.push(line);
  }

  const findSection = (matcher) =>
    sections.find((section) => matcher(section.title))?.lines.join('\n').trim() ?? '';

  const summary = findSection((title) => title.includes('총평'));
  const answerKey = findSection((title) => title.includes('정답표'));
  const explanations = findSection(
    (title) => title.includes('해설') || title.includes('정오답')
  );

  if (!answerKey) {
    throw new Error(`${filename}: missing answer key section`);
  }

  if (!explanations) {
    throw new Error(`${filename}: missing explanations section`);
  }

  return { summary, answerKey, explanations };
}

function markdownToHtml(markdown) {
  const lines = markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\t/g, '    '));

  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      output.push(`<h${level}>${formatInline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const { html, nextIndex } = renderTable(lines, index);
      output.push(html);
      index = nextIndex;
      continue;
    }

    if (/^- /.test(line)) {
      const items = [];
      while (index < lines.length && /^- /.test(lines[index])) {
        items.push(`<li>${formatInline(lines[index].replace(/^- /, '').trim())}</li>`);
        index += 1;
      }
      output.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const current = lines[index];
      if (!current.trim()) {
        break;
      }
      if (/^(#{1,6})\s+/.test(current) || /^- /.test(current) || isTableStart(lines, index)) {
        break;
      }
      paragraph.push(current.trim());
      index += 1;
    }

    output.push(`<p>${formatInline(paragraph.join('<br>'))}</p>`);
  }

  return output.join('\n');
}

function isTableStart(lines, index) {
  return (
    index + 1 < lines.length &&
    lines[index].trim().startsWith('|') &&
    /^\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[index + 1].trim())
  );
}

function renderTable(lines, startIndex) {
  const header = splitTableLine(lines[startIndex]);
  let index = startIndex + 2;
  const rows = [];

  while (index < lines.length && lines[index].trim().startsWith('|')) {
    rows.push(splitTableLine(lines[index]));
    index += 1;
  }

  const headHtml = header.map((cell) => `<th>${formatInline(cell)}</th>`).join('');
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join('')}</tr>`
    )
    .join('');

  return {
    html: `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`,
    nextIndex: index,
  };
}

function splitTableLine(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function formatInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createId(data, filename) {
  const stem = filename.replace(/\.[^.]+$/, '');
  return [data.year ?? 'exam', data.subject, data.exam, stem]
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-');
}
