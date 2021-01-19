import _simpleGit from 'simple-git';
import { getPkgReleases } from '..';
import { id as datasource } from '.';

jest.mock('simple-git');
const simpleGit: any = _simpleGit;

const depName = 'https://github.com/example/example.git';

describe('datasource/git-refs', () => {
  describe('getReleases', () => {
    it('returns nil if response is wrong', async () => {
      simpleGit.mockReturnValue({
        listRemote() {
          return Promise.resolve(null);
        },
      });
      const versions = await getPkgReleases({
        datasource,
        depName,
      });
      expect(versions).toBeNull();
    });
    it('returns nil if remote call throws exception', async () => {
      simpleGit.mockReturnValue({
        listRemote() {
          throw new Error();
        },
      });
      const versions = await getPkgReleases({
        datasource,
        depName,
      });
      expect(versions).toBeNull();
    });
  });
});
