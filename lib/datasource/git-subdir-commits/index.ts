import crypto from 'crypto';
import fs from 'fs';
import simpleGit from 'simple-git';
import * as packageCache from '../../util/cache/package';
import { GetReleasesConfig, Release, ReleaseResult } from '../common';

export const id = 'git-subdir-commits';

const cacheMinutes = 10;

// git will prompt for known hosts or passwords, unless we activate BatchMode
process.env.GIT_SSH_COMMAND = 'ssh -o BatchMode=yes';

export async function getCommits(
  { lookupName }: GetReleasesConfig,
  subdir: string
): Promise<Release[] | null> {
  let commits = [];

  const cacheNamespace = 'git-subdir-commits';
  const cachedResult = await packageCache.get<Release[]>(
    cacheNamespace,
    lookupName + subdir
  );
  /* istanbul ignore next line */
  if (cachedResult) {
    return cachedResult;
  }

  let baseDir;
  let useCache = false;

  if (
    process.env.RENOVATE_REPO_CACHE &&
    fs.existsSync(`${process.env.RENOVATE_REPO_CACHE}/${lookupName}`)
  ) {
    useCache = true;
    baseDir = `${process.env.RENOVATE_REPO_CACHE}/${lookupName}`;
  } else {
    baseDir = '/tmp/renovate/' + crypto.randomBytes(20).toString('hex');
    fs.mkdirSync(baseDir, { recursive: true });
  }

  try {
    const git = simpleGit(baseDir);
    if (!useCache) {
      await git.clone('git@github.com:' + lookupName, baseDir);
    }
    commits = (await git.log({ file: subdir })).all.map((commit) => ({
      version: commit.hash,
      gitRef: commit.hash,
      newDigest: commit.hash,
      releaseTimestamp: commit.date,
      message: commit.message,
      changelogUrl: `https://github.com/${lookupName}/commit/${commit.hash}`,
    }));
  } finally {
    if (!useCache) {
      fs.rmdirSync(baseDir, { recursive: true });
    }
  }

  await packageCache.set(
    cacheNamespace,
    lookupName + subdir,
    commits,
    cacheMinutes
  );

  return commits;
}

export async function getReleases({
  lookupName,
}: GetReleasesConfig): Promise<ReleaseResult | null> {
  const [repo, subdir] = lookupName.replace('.git', '').split('//');
  const [head]: Release[] = await getCommits({ lookupName: repo }, subdir);

  const sourceUrl = `https://github.com/${repo}/tree/master/${subdir}`;

  const result: ReleaseResult = {
    sourceUrl,
    notes: `[${head.message}](https://github.com/${repo}/commit/${head.version})`,
    latestVersion: head.version,
    releases: [head],
  };

  return result;
}
