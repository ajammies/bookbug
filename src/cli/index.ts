#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { createCommand } from './commands/create';
import { resumeCommand } from './commands/resume';
import { writeCommand } from './commands/write';
import { directCommand } from './commands/direct';
import { renderCommand } from './commands/render';
import { qualityCommand } from './commands/quality';
import { logsCommand } from './commands/logs';

const program = new Command();

program
  .name('bookbug')
  .description('CLI for generating children\'s picture books with AI')
  .version('0.1.0');

program.addCommand(createCommand);
program.addCommand(resumeCommand);
program.addCommand(writeCommand);
program.addCommand(directCommand);
program.addCommand(renderCommand);
program.addCommand(qualityCommand);
program.addCommand(logsCommand);

program.parse();
