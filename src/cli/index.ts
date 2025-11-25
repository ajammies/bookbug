#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { createCommand } from './commands/create';
import { briefCommand } from './commands/brief';
import { writeCommand } from './commands/write';
import { directCommand } from './commands/direct';
import { renderCommand } from './commands/render';

const program = new Command();

program
  .name('bookbug')
  .description('CLI for generating children\'s picture books with AI')
  .version('0.1.0');

program.addCommand(createCommand);
program.addCommand(briefCommand);
program.addCommand(writeCommand);
program.addCommand(directCommand);
program.addCommand(renderCommand);

program.parse();
