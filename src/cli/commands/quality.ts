import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { imageQualityAgent, filterStoryForPage } from '../../core/agents';
import { StorySchema, type ImageQualityResult, type PageRenderContext } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { loadJson } from '../../utils';

// TODO: Add --fast flag for ensemble pipeline when implemented
// See https://github.com/ajammies/bookbug/issues/79

interface QualityOptions {
  threshold?: string;
}

interface PageQualityResult {
  pageNumber: number;
  imagePath: string;
  result: ImageQualityResult;
}

export const qualityCommand = new Command('quality')
  .description('Analyze image quality for rendered pages in a story folder')
  .argument('<path>', 'Story folder or single image file')
  .option('-t, --threshold <n>', 'Quality threshold 0-100 (default: 70)', '70')
  .action(async (inputPath: string, options: QualityOptions) => {
    const spinner = createSpinner();
    const threshold = parseInt(options.threshold ?? '70', 10);

    try {
      const resolvedPath = path.resolve(inputPath);
      const stats = await fs.stat(resolvedPath);

      if (stats.isFile()) {
        // Single image mode
        await analyzeImage(resolvedPath, threshold, spinner);
      } else {
        // Folder mode - analyze all page images
        await analyzeFolder(resolvedPath, threshold, spinner);
      }
    } catch (error) {
      spinner.fail('Quality analysis failed');
      console.error(error);
      process.exit(1);
    }
  });

async function analyzeImage(imagePath: string, threshold: number, spinner: ReturnType<typeof createSpinner>) {
  const folder = findStoryFolder(imagePath);
  const storyPath = path.join(folder, 'story.json');

  spinner.start('Loading story context...');
  const story = StorySchema.parse(await loadJson(storyPath));
  spinner.succeed('Story loaded');

  // Extract page number from filename (page-1.png, page-2.png, etc.)
  const pageMatch = path.basename(imagePath).match(/page-(\d+)/);
  const pageNumber = pageMatch?.[1] ? parseInt(pageMatch[1], 10) : 1;

  const context = filterStoryForPage(story, pageNumber);
  const imageBuffer = await fs.readFile(imagePath);

  spinner.start(`Analyzing page ${pageNumber}...`);
  const result = await imageQualityAgent(imageBuffer, context, { qualityThreshold: threshold });
  spinner.succeed(`Page ${pageNumber} analyzed`);

  displayResult(pageNumber, imagePath, result);
  await saveResult(folder, pageNumber, result);
}

async function analyzeFolder(folderPath: string, threshold: number, spinner: ReturnType<typeof createSpinner>) {
  const storyPath = path.join(folderPath, 'story.json');
  const assetsPath = path.join(folderPath, 'assets');

  spinner.start('Loading story context...');
  const story = StorySchema.parse(await loadJson(storyPath));
  spinner.succeed('Story loaded');

  // Find all page images
  const files = await fs.readdir(assetsPath);
  const pageImages = files
    .filter((f) => f.match(/^page-\d+\.png$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)![0], 10);
      const numB = parseInt(b.match(/\d+/)![0], 10);
      return numA - numB;
    });

  if (pageImages.length === 0) {
    console.log('No page images found in assets/');
    return;
  }

  const results: PageQualityResult[] = [];

  for (const imageFile of pageImages) {
    const pageMatch = imageFile.match(/page-(\d+)/);
    const pageNumber = pageMatch?.[1] ? parseInt(pageMatch[1], 10) : 1;
    const imagePath = path.join(assetsPath, imageFile);

    const context = filterStoryForPage(story, pageNumber);
    const imageBuffer = await fs.readFile(imagePath);

    spinner.start(`Analyzing page ${pageNumber}/${pageImages.length}...`);
    const result = await imageQualityAgent(imageBuffer, context, { qualityThreshold: threshold });
    spinner.succeed(`Page ${pageNumber} analyzed`);

    results.push({ pageNumber, imagePath, result });
    await saveResult(folderPath, pageNumber, result);
  }

  displaySummary(results, threshold);
}

function findStoryFolder(imagePath: string): string {
  // Walk up from image path to find story folder
  let current = path.dirname(imagePath);
  for (let i = 0; i < 3; i++) {
    const storyJson = path.join(current, 'story.json');
    try {
      require('fs').accessSync(storyJson);
      return current;
    } catch {
      current = path.dirname(current);
    }
  }
  throw new Error(`Could not find story.json in parent directories of ${imagePath}`);
}

async function saveResult(folder: string, pageNumber: number, result: ImageQualityResult): Promise<void> {
  const qualityDir = path.join(folder, 'assets', 'quality');
  await fs.mkdir(qualityDir, { recursive: true });
  const resultPath = path.join(qualityDir, `page-${pageNumber}.json`);
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
}

function displayResult(pageNumber: number, imagePath: string, result: ImageQualityResult): void {
  const status = result.passesQualityBar ? '✓' : '✗';
  console.log(`\nPage ${pageNumber}: ${status} ${result.score}/100`);
  console.log(`  Character: ${result.characterConsistency}/100`);
  console.log(`  Environment: ${result.environmentConsistency}/100`);
  console.log(`  AI Artifacts: ${result.aiArtifacts}/100`);
  if (result.issues.length > 0) {
    console.log('  Issues:');
    result.issues.forEach((issue) => console.log(`    - ${issue}`));
  }
}

function displaySummary(results: PageQualityResult[], threshold: number): void {
  console.log('\n' + '='.repeat(60));
  console.log('QUALITY SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.result.passesQualityBar).length;
  const failed = results.length - passed;

  console.log(`\nThreshold: ${threshold}`);
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  console.log('\n' + '-'.repeat(60));
  console.log('Page  Score  Char  Env   Artifacts  Status');
  console.log('-'.repeat(60));

  for (const { pageNumber, result } of results) {
    const status = result.passesQualityBar ? '✓ PASS' : '✗ FAIL';
    console.log(
      `${String(pageNumber).padStart(4)}  ${String(result.score).padStart(5)}  ${String(result.characterConsistency).padStart(4)}  ${String(result.environmentConsistency).padStart(4)}  ${String(result.aiArtifacts).padStart(9)}  ${status}`
    );
  }

  console.log('-'.repeat(60));

  // Show issues for failed pages
  const failedResults = results.filter((r) => !r.result.passesQualityBar);
  if (failedResults.length > 0) {
    console.log('\nISSUES:');
    for (const { pageNumber, result } of failedResults) {
      if (result.issues.length > 0) {
        console.log(`\nPage ${pageNumber}:`);
        result.issues.forEach((issue) => console.log(`  - ${issue}`));
      }
    }
  }

  console.log(`\nResults saved to assets/quality/`);
}
