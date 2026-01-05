import { pairBestTeamFromSequentialGroups, pairMultipleBestTeamsFromGroups, pairAdvancingTeamsFromOneSingleGroup } from '../../src/helpers/matchFixturesHelper';
import { Prisma } from '@prisma/client';

describe('matchFixturesHelper', () => {
  describe('pairMultipleBestTeamsFromGroups', () => {

    test('pairs group winners and runners-ups across 4 groups (A1 vs. B2, A2 vs. B1, etc.)', async () => {
      const mockTransaction = {} as Prisma.TransactionClient;
      const mockGroups = [
        { id: 1, teams: [{ id: 101, tPosition: 1 }, { id: 102, tPosition: 2 }, { id: 103, tPosition: 3 }, { id: 104, tPosition: 4 }] },
        { id: 2, teams: [{ id: 201, tPosition: 1 }, { id: 202, tPosition: 2 }, { id: 203, tPosition: 3 }, { id: 204, tPosition: 4 }] },
        { id: 3, teams: [{ id: 301, tPosition: 1 }, { id: 302, tPosition: 2 }, { id: 303, tPosition: 3 }, { id: 304, tPosition: 4 }] },
        { id: 4, teams: [{ id: 401, tPosition: 1 }, { id: 402, tPosition: 2 }, { id: 403, tPosition: 3 }, { id: 404, tPosition: 4 }] }
      ];
      
      const knockoutMatches = await pairMultipleBestTeamsFromGroups(mockTransaction, 42, mockGroups, 2, 1, 'QUARTER_FINALS', 1337);

      expect(knockoutMatches).toHaveLength(4);
      expect(knockoutMatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ homeTeamId: 101, awayTeamId: 202, knockoutRound: "QUARTER_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 1337, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
          expect.objectContaining({ homeTeamId: 102, awayTeamId: 201, knockoutRound: "QUARTER_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 1337, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
          expect.objectContaining({ homeTeamId: 301, awayTeamId: 402, knockoutRound: "QUARTER_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 1337, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
          expect.objectContaining({ homeTeamId: 302, awayTeamId: 401, knockoutRound: "QUARTER_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 1337, stage: 'KNOCKOUT_STAGE', tournamentId: 42 })
        ])
      );
    });

    test('pairs 4 best teams from each group across 2 groups with 8 teams each', async () =>{
      const mockTransaction = {} as Prisma.TransactionClient;

      const mockGroups = [
        { id: 1, teams: [
          { id: 101, tPosition: 1 }, { id: 102, tPosition: 2 }, { id: 103, tPosition: 3 }, { id: 104, tPosition: 4 },
          { id: 105, tPosition: 5 }, { id: 106, tPosition: 6 }, { id: 107, tPosition: 7 }, { id: 108, tPosition: 8 }
        ]},
        { id: 2, teams: [
          { id: 201, tPosition: 1 }, { id: 202, tPosition: 2 }, { id: 203, tPosition: 3 }, { id: 204, tPosition: 4 },
          { id: 205, tPosition: 5 }, { id: 206, tPosition: 6 }, { id: 207, tPosition: 7 }, { id: 208, tPosition: 8 }
        ]}
      ];

      const knockoutMatches = await pairMultipleBestTeamsFromGroups(mockTransaction, 42, mockGroups, 4, 1, 'SEMI_FINALS', 69);

      expect(knockoutMatches).toHaveLength(4);
      expect(knockoutMatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ homeTeamId: 101, awayTeamId: 204, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 69, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
          expect.objectContaining({ homeTeamId: 102, awayTeamId: 203, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 69, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
          expect.objectContaining({ homeTeamId: 103, awayTeamId: 202, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 69, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
          expect.objectContaining({ homeTeamId: 104, awayTeamId: 201, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 69, stage: 'KNOCKOUT_STAGE', tournamentId: 42 })
        ])
      );
    });
  });

  describe('pairBestTeamFromSequentialGroups', () => {
    test('pairs group winner with group winner from next group (A1 vs. B1, C1 vs. D1, etc.)', async () => {
      const mockTransaction = {} as Prisma.TransactionClient;
      const mockGroups = [
        { id: 1, teams: [{ id: 101, tPosition: 1 }, { id: 102, tPosition: 2 }, { id: 103, tPosition: 3 }, { id: 104, tPosition: 4 }] },
        { id: 2, teams: [{ id: 201, tPosition: 1 }, { id: 202, tPosition: 2 }, { id: 203, tPosition: 3 }, { id: 204, tPosition: 4 }] },
        { id: 3, teams: [{ id: 301, tPosition: 1 }, { id: 302, tPosition: 2 }, { id: 303, tPosition: 3 }, { id: 304, tPosition: 4 }] },
        { id: 4, teams: [{ id: 401, tPosition: 1 }, { id: 402, tPosition: 2 }, { id: 403, tPosition: 3 }, { id: 404, tPosition: 4 }] }
      ];

      const knockoutMatches = await pairBestTeamFromSequentialGroups(mockTransaction, 42, mockGroups, 1, 'SEMI_FINALS', 666);

      expect(knockoutMatches).toHaveLength(2);
      expect(knockoutMatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ homeTeamId: 101, awayTeamId: 201, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 666, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
          expect.objectContaining({ homeTeamId: 301, awayTeamId: 401, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 666, stage: 'KNOCKOUT_STAGE', tournamentId: 42 })
        ])
      );
    });
  });

  describe('pairAdvancingTeamsFromOneSingleGroup', () => {
    test('pairs top 4 advancing teams within a single group of 8 teams (1st vs. 4th, 2nd vs. 3rd)', async () => {
      const mockTransaction = {} as Prisma.TransactionClient;
      const mockGroup = { 
        id: 1, teams: [
          { id: 101, tPosition: 1 }, { id: 102, tPosition: 2 }, { id: 103, tPosition: 3 }, { id: 104, tPosition: 4 }, 
          { id: 105, tPosition: 5 }, { id: 106, tPosition: 6 }, { id: 107, tPosition: 7 }, { id: 108, tPosition: 8 }
      ]};

      const knockoutMatches = await pairAdvancingTeamsFromOneSingleGroup(mockTransaction, 42, mockGroup, 4, 1, 'SEMI_FINALS', 1337);

      expect(knockoutMatches).toHaveLength(2);
      expect(knockoutMatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ homeTeamId: 101, awayTeamId: 104, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 1337, stage: 'KNOCKOUT_STAGE', tournamentId: 42 }),
          expect.objectContaining({ homeTeamId: 102, awayTeamId: 103, knockoutRound: "SEMI_FINALS", knockoutTieId: undefined, legNumber: 1, matchDay: 1337, stage: 'KNOCKOUT_STAGE', tournamentId: 42 })
        ])
      );
    });
  });
});