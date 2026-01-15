/**
 * Test utility for verifying git operations
 * Run this in the browser console to test git functionality
 */

import * as git from './git';

export async function testGitOperations() {
  console.group('🧪 Testing Git Operations');

  try {
    // Test 1: Check if repo is cloned
    console.log('1. Checking if repo is cloned...');
    const isCloned = await git.isRepoCloned();
    console.log(`   ✅ Repo cloned: ${isCloned}`);

    if (!isCloned) {
      console.log('   ⚠️  No repo cloned. Clone a repo first!');
      console.groupEnd();
      return;
    }

    // Test 2: Get current branch
    console.log('2. Getting current branch...');
    const branch = await git.getCurrentBranch();
    console.log(`   ✅ Current branch: ${branch}`);

    // Test 3: List all branches
    console.log('3. Listing all branches...');
    const branches = await git.listBranches();
    console.log(`   ✅ Branches: ${branches.join(', ')}`);

    // Test 4: Get status
    console.log('4. Getting status matrix...');
    const status = await git.getStatusMatrix();
    console.log(`   ✅ Changed files: ${status.length}`);
    if (status.length > 0) {
      console.table(status);
    }

    // Test 5: List files
    console.log('5. Listing files in workspace...');
    const files = await git.listFiles();
    console.log(`   ✅ Files: ${files.slice(0, 10).join(', ')}...`);

    // Test 6: Get commit log
    console.log('6. Getting commit log...');
    const log = await git.getLog(5);
    console.log(`   ✅ Recent commits:`);
    log.forEach((commit, i) => {
      console.log(`      ${i + 1}. ${commit.message} (${commit.oid.slice(0, 7)})`);
    });

    console.log('\n✅ All tests passed!');
    console.groupEnd();

    return {
      isCloned,
      branch,
      branches,
      changedFiles: status.length,
      totalFiles: files.length,
      recentCommits: log.length,
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.groupEnd();
    throw error;
  }
}

// Make it available in window for easy testing
if (typeof window !== 'undefined') {
  (window as any).testGit = testGitOperations;
  console.log('💡 Run `window.testGit()` in console to test git operations');
}
