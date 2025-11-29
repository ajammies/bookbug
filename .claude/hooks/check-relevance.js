#!/usr/bin/env node
const Anthropic = require('@anthropic-ai/sdk').default;

const [,, branch, message, recentCommits] = process.argv;

const client = new Anthropic();

async function checkRelevance() {
  const response = await client.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 50,
    messages: [{
      role: 'user',
      content: `Branch: ${branch}
Commit message: ${message}
Recent commits on branch: ${recentCommits || 'none'}

Is this commit relevant to the branch name? Reply ONLY with:
- "allow" if relevant
- A short reason (10 words max) if NOT relevant`
    }]
  });

  console.log(response.content[0].text.trim());
}

checkRelevance().catch(() => console.log('allow'));
