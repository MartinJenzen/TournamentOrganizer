import { pairMultipleBestTeamsFromGroups } from '../../src/helpers/matchFixturesHelper';
import { Prisma } from '@prisma/client';

describe('pairMultipleBestTeamsFromGroups', () => {

  test('pairs group winners and runners-ups across two groups (A1 vs. B2 and A2 vs. B1)', async () => {
    const mockTransaction = {} as Prisma.TransactionClient;

    const mockGroups = [
    { id: 1, teams: [{ id: 10, tPosition: 1 }, { id: 20, tPosition: 2 }] },
    { id: 2, teams: [{ id: 30, tPosition: 1 }, { id: 40, tPosition: 2 }] }
    ];

    const knockoutMatches = await pairMultipleBestTeamsFromGroups(mockTransaction, 42, mockGroups, 2, 1, 'SEMI_FINALS', 1337);

    expect(knockoutMatches).toHaveLength(2);
    expect(knockoutMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ homeTeamId: 10, awayTeamId: 40, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 1337, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
        expect.objectContaining({ homeTeamId: 20, awayTeamId: 30, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 1337, stage: 'KNOCKOUT_STAGE', tournamentId: 42 })
      ])
    );
  });
});