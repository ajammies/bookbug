import chalk from 'chalk';
import type { StoryBrief, Story, RenderedBook } from '../../core/schemas';

/**
 * Display a StoryBrief summary
 */
export function displayBrief(brief: StoryBrief): void {
  console.log('\n' + chalk.bold.blue('Story Brief'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Title:'), brief.title);
  console.log(chalk.bold('Arc:'), brief.storyArc);
  console.log(chalk.bold('Setting:'), brief.setting);
  console.log(chalk.bold('Age Range:'), `${brief.ageRange.min}-${brief.ageRange.max} years`);
  console.log(chalk.bold('Pages:'), brief.pageCount);
  if (brief.tone) console.log(chalk.bold('Tone:'), brief.tone);
  if (brief.moral) console.log(chalk.bold('Moral:'), brief.moral);

  console.log(chalk.bold('\nCharacters:'));
  for (const char of brief.characters) {
    console.log(`  • ${chalk.cyan(char.name)} (${char.role || 'character'})`);
    console.log(`    ${chalk.gray(char.description)}`);
  }
}

/**
 * Display a Story summary
 */
export function displayStory(story: Story): void {
  console.log('\n' + chalk.bold.magenta('Visual Story'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Title:'), story.title);
  console.log(chalk.bold('Pages:'), story.visuals.illustratedPages.length);

  const totalBeats = story.visuals.illustratedPages.reduce((sum, p) => sum + p.beats.length, 0);
  console.log(chalk.bold('Total Beats:'), totalBeats);

  console.log(chalk.bold('\nArt Direction:'));
  console.log(`  Genre: ${story.visuals.style.art_direction.genre.join(', ')}`);
  console.log(`  Medium: ${story.visuals.style.art_direction.medium.join(', ')}`);
  console.log(`  Technique: ${story.visuals.style.art_direction.technique.join(', ')}`);

  console.log(chalk.bold('\nFirst Page Beats:'));
  const firstPage = story.visuals.illustratedPages[0];
  if (firstPage) {
    for (const beat of firstPage.beats) {
      console.log(`  • ${chalk.cyan(`Beat ${beat.order}`)}: ${beat.summary}`);
      console.log(`    Shot: ${beat.shot.size} / ${beat.shot.angle}`);
    }
  }
}

/**
 * Display a RenderedBook summary
 */
export function displayBook(book: RenderedBook): void {
  console.log('\n' + chalk.bold.yellow('Generated Book'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Title:'), book.storyTitle);
  console.log(chalk.bold('Age Range:'), `${book.ageRange.min}-${book.ageRange.max} years`);
  console.log(chalk.bold('Format:'), book.format);
  console.log(chalk.bold('Pages:'), book.pages.length);

  console.log(chalk.bold('\nPages:'));
  for (const page of book.pages.slice(0, 3)) {
    console.log(`  ${chalk.yellow(`Page ${page.pageNumber}:`)} ${chalk.gray(page.url)}`);
  }
  if (book.pages.length > 3) {
    console.log(chalk.gray(`  ... and ${book.pages.length - 3} more pages`));
  }

  console.log('\n' + chalk.green.bold('Book generation complete!'));
}
