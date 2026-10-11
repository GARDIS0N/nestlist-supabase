const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');

async function pushToGitHub() {
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  if (!token) {
    console.error('\n❌ GitHub Personal Access Token required.');
    console.error('Usage: node scripts/push-to-github.js <YOUR_GITHUB_TOKEN>');
    console.error('Or set: $env:GITHUB_TOKEN="ghp_xxx" and run the script.\n');
    process.exit(1);
  }

  console.log('🚀 Pushing to https://github.com/GARDIS0N/nestlist-supabase (branch: main)...');

  try {
    const res = await git.push({
      fs,
      http,
      dir: process.cwd(),
      remote: 'origin',
      ref: 'main',
      force: false,
      onAuth: () => ({
        username: 'GARDIS0N',
        password: token.trim(),
      }),
    });

    console.log('🎉 Push successful!', res);
  } catch (err) {
    console.error('❌ Push error:', err.message || err);
    process.exit(1);
  }
}

pushToGitHub();
