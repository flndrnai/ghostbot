import { getConfig } from '../config.js';

async function githubApi(endpoint, options = {}) {
  const token = getConfig('GH_TOKEN');
  if (!token) throw new Error('GitHub token not configured. Go to Admin > GitHub.');

  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text.slice(0, 200)}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function listRepositories() {
  const data = await githubApi('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator');
  return data.map((r) => ({ fullName: r.full_name, name: r.name, private: r.private, defaultBranch: r.default_branch }));
}

export async function listBranches(repoFullName) {
  const data = await githubApi(`/repos/${repoFullName}/branches?per_page=100`);
  return data.map((b) => ({ name: b.name, sha: b.commit.sha }));
}

export async function getRef(repoFullName, ref) {
  return githubApi(`/repos/${repoFullName}/git/ref/${ref}`);
}

export async function createRef(repoFullName, ref, sha) {
  return githubApi(`/repos/${repoFullName}/git/refs`, {
    method: 'POST',
    body: { ref: `refs/${ref}`, sha },
  });
}

export async function createTree(repoFullName, baseTree, tree) {
  return githubApi(`/repos/${repoFullName}/git/trees`, {
    method: 'POST',
    body: { base_tree: baseTree, tree },
  });
}

export async function createCommit(repoFullName, message, tree, parents) {
  return githubApi(`/repos/${repoFullName}/git/commits`, {
    method: 'POST',
    body: { message, tree, parents },
  });
}

export async function createPullRequest(repoFullName, { title, body, head, base }) {
  return githubApi(`/repos/${repoFullName}/pulls`, {
    method: 'POST',
    body: { title, body, head, base },
  });
}

export async function getBranchDiff(repoFullName, baseBranch, headBranch) {
  // GET /repos/{owner}/{repo}/compare/{base}...{head}
  const path = `/repos/${repoFullName}/compare/${encodeURIComponent(baseBranch)}...${encodeURIComponent(headBranch)}`;
  const data = await githubApi(path);
  return {
    aheadBy: data.ahead_by,
    behindBy: data.behind_by,
    totalCommits: data.total_commits,
    files: (data.files || []).map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch || '',
      blobUrl: f.blob_url,
    })),
    htmlUrl: data.html_url,
  };
}

export async function postPullRequestComment(repoFullName, prNumber, body) {
  return githubApi(`/repos/${repoFullName}/issues/${prNumber}/comments`, {
    method: 'POST',
    body: { body },
  });
}

export async function getPullRequest(repoFullName, prNumber) {
  return githubApi(`/repos/${repoFullName}/pulls/${prNumber}`);
}

export async function testGitHubConnection() {
  try {
    const user = await githubApi('/user');
    return { success: true, login: user.login, name: user.name };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
