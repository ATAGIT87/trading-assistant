const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = process.cwd();
const production = path.join(root, 'src/production');
const emptyDirectories = [];
const unexpectedFiles = [];
function inspectDirectory(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  if (entries.length === 0) emptyDirectories.push(path.relative(root, directory));
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspectDirectory(file);
    else if (!entry.isFile() || !file.endsWith('.ts')) unexpectedFiles.push(path.relative(root, file));
  }
}
inspectDirectory(production);
assert.deepEqual(emptyDirectories, [], `Empty production directories: ${emptyDirectories.join(', ')}`);
assert.deepEqual(unexpectedFiles, [], `Files outside the production source cycle: ${unexpectedFiles.join(', ')}`);
const config = ts.readConfigFile('tsconfig.build.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const localFiles = program.getSourceFiles().filter(source =>
  !source.isDeclarationFile && !source.fileName.includes('/node_modules/'));
const graph = new Map();

for (const source of localFiles) {
  const file = path.resolve(source.fileName);
  assert(file.startsWith(production + path.sep), `Production imports outside its boundary: ${file}`);
  const dependencies = [];
  function visit(node) {
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
      ? node.moduleSpecifier
      : ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')
        ? node.arguments[0] : undefined;
    if (specifier && ts.isStringLiteral(specifier)) {
      const resolved = ts.resolveModuleName(specifier.text, file, parsed.options, ts.sys).resolvedModule;
      if (resolved && !resolved.isExternalLibraryImport && !resolved.resolvedFileName.endsWith('.d.ts'))
        dependencies.push(path.resolve(resolved.resolvedFileName));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  graph.set(file, dependencies);
}

const reachable = new Set();
function walk(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const dependency of graph.get(file) ?? []) walk(dependency);
}
walk(path.join(production, 'main.ts'));
const orphans = [...graph.keys()].filter(file => !reachable.has(file));
assert.deepEqual(orphans, [], `Unused production files:\n${orphans.join('\n')}`);
assert.equal(JSON.parse(fs.readFileSync('nest-cli.json', 'utf8')).sourceRoot, 'src/production');
assert.equal(parsed.options.rootDir, production);
assert.equal(parsed.options.outDir, path.join(root, 'dist/production'));
console.log(`Structure verified: ${graph.size} production files, all reachable; no empty directories, unexpected files or test/research imports.`);
