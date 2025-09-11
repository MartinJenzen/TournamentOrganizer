import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { generateMatchFixtures } from '../helpers/tournamentHelper';

const router = Router();
const prisma = new PrismaClient();

// TODO: atomize and move to tournamentHelper.ts
// Create new tournament
router.post('/', requireAuth, async (req: Request, res: Response) => {
  console.log('Tournament creation request received:', req.body.tournamentName);  // TODO: remove
  
  try {
    const payload = req.body;
    const userId = (req as any).user.id;

    // Tournament
    const tournamentData = await prisma.tournament.create({
      data: {
        ownerId: userId,
        name: payload.tournamentName,
        type: payload.tournamentType,
        teamsCount: payload.teamsCount,
        matchesPerTeam: payload.matchesPerTeam,
        teamsPerGroup: payload.tournamentType === 'GROUP_AND_KNOCKOUT' ? payload.teamsPerGroup : 0,
        groupsCount: payload.tournamentType === 'GROUP_AND_KNOCKOUT' ? payload.groupsCount : 0,
        topTeamsAdvancing: payload.tournamentType === 'GROUP_AND_KNOCKOUT' ? payload.teamsAdvancingPerGroup : 0,        
        knockoutLegs: payload.tournamentType !== 'LEAGUE' ? payload.knockoutLegs : 0,
        stage: payload.tournamentType === 'LEAGUE'
          ? 'LEAGUE_STAGE'
          : payload.tournamentType === 'GROUP_AND_KNOCKOUT'
          ? 'GROUP_STAGE'
          : 'KNOCKOUT_STAGE',
      },
      include: {
        groups: true,
        teams: true,
        matches: true
      }
    });

    // Groups and teams for GROUP_AND_KNOCKOUT tournaments
    if (payload.tournamentType === 'GROUP_AND_KNOCKOUT' && payload.groups) {
      
      // Convert frontend groups object to array format
      const groupsArray = Object.entries(payload.groups).map(([groupName, teams]) => ({
        groupName,
        teams: teams as string[]    // Array of team names
      }));
    
      // Create groups first (one by one to get IDs)
      const createdGroups = await Promise.all(
        groupsArray.map(async (grp) => {
          return await prisma.group.create({
            data: {
              name: grp.groupName,
              tournamentId: tournamentData.id
            }
          });
        })
      );
    
      // Then create teams with proper group linkage
      const teamData = groupsArray.flatMap((group) => 
        group.teams.map((teamName) => {
          const matchingGroups = createdGroups.find(createdGroup => createdGroup.name === group.groupName);
          
          if (!matchingGroups) 
            throw new Error(`Group ${group.groupName} not found!`);
          
          return {
            name: teamName,
            groupId: matchingGroups!.id,    // ! asserts that matchingGroups is not null
            tournamentId: tournamentData.id,
          };
        })
      );

      const createdTeams = await Promise.all(
        teamData.map(team => prisma.team.create({ data: team }))
      );

      await generateMatchFixtures(tournamentData.id, payload.tournamentType, payload.matchesPerTeam, createdTeams, createdGroups);
    }

    // Teams for LEAGUE or CUP tournaments
    else if (payload.selectedTeams && payload.selectedTeams.length > 0) {
      const createdTeams = await Promise.all(
        payload.selectedTeams.map((teamName: string) => 
          prisma.team.create({
            data: {
              name: teamName,
              tournamentId: tournamentData.id,
              groupId: null  // No group for LEAGUE or CUP tournaments
            }
          })
        )
      );

      await generateMatchFixtures(tournamentData.id, payload.tournamentType, payload.matchesPerTeam, createdTeams);
    }

    const fullTournamentData = await prisma.tournament.findUnique({
      where: { id: tournamentData.id },
      include: {
        groups: { 
          include: { 
            teams: { 
              include: { players: true } 
            } 
          } 
        },
        teams: { include: { players: true } },
        matches: { 
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } }
          }, 
          orderBy: [
            { matchDay: 'asc' },
            { id: 'asc' }           
          ]
        },
      }
    });

    return res.status(201).json(fullTournamentData);
  }
  catch (err) {
    console.error('Error creating tournament: ', err);
    return res.status(500).json({ error: 'Failed to create tournament!' });
  }
});

// Get list of all tournaments created by user
router.get('/user-tournaments', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  console.log('Fetching list of tournaments for user ID:', userId);  // TODO: remove

  try {
    const tournaments = await prisma.tournament.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        updatedAt: true,
        createdAt: true
      }
    });

    return res.status(200).json(tournaments);
  }
  catch (err) {
    console.error('Error fetching tournaments: ', err);
    return res.status(500).json({ error: 'Failed to fetch tournaments!' });
  }
});

// Get tournament by ID
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const tournamentId = parseInt(req.params.id, 10);
  console.log('Fetching tournament with ID:', tournamentId);  // TODO: remove

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        groups: { 
          include: { 
            teams: { 
              include: { players: true } 
            } 
          } 
        },
        teams: { include: { players: true } },
        matches: {
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
            events: {
              include: {
                player: { select: { id: true, name: true, teamId: true } }
              }
            }
          },
          orderBy: [{ matchDay: 'asc' }, { id: 'asc' }]
        }
      }
    });

    if (!tournament)
      return res.status(404).json({ error: 'Tournament not found!' });

    return res.status(200).json(tournament);
  }
  catch (err) {
    console.error('Error fetching tournament: ', err);
    return res.status(500).json({ error: 'Failed to fetch tournament!' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const tournamentId = parseInt(req.params.id, 10);
  const userId = (req as any).user.id;

  // Verify
  const existingTournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { ownerId: true }
  });

  if (!existingTournament)
    return res.status(404).json({ error: 'Tournament not found!' });

  if (existingTournament.ownerId !== userId)
    return res.status(403).json({ error: 'You do not have permission to delete this tournament!' });

  console.log('Deleting tournament with ID:', tournamentId);  // TODO: remove

  // Delete 
  await prisma.$transaction([
    // MatchEvents
    prisma.matchEvent.deleteMany({
      where: { match: { tournamentId } }
    }),
    // Matches
    prisma.match.deleteMany({
      where: { tournamentId }
    }),
    // Players (teams)
    prisma.player.deleteMany({
      where: { team: { tournamentId } }
    }),
    // Teams
    prisma.team.deleteMany({
      where: { tournamentId }
    }),
    // Groups
    prisma.group.deleteMany({
      where: { tournamentId }
    }),
    // Tournament
    prisma.tournament.delete({
      where: { id: tournamentId }
    })
  ]);

  return res.sendStatus(204);
})

// Get match fixtures
router.get('/:id/fixtures', requireAuth, async (req: Request, res: Response) => {
  const tournamentId = parseInt(req.params.id, 10);

  try {
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        events: {
          include: {
            player: { select: { id: true, name: true, teamId: true } }
          }
        }
      },
      orderBy: [{ matchDay: 'asc' }, { id: 'asc' }]
    });

    return res.status(200).json(matches);
  }
  catch (error) {
    console.error('Error fetching matches: ', error);
    return res.status(500).json({ error: 'Failed to fetch matches!' });
  }
});

// TODO: to be atomized
router.patch('/:tournamentId/matches/:matchId/report', requireAuth, async (req: Request, res: Response) => {
  const tournamentId = Number(req.params.tournamentId);
  const matchId = Number(req.params.matchId);
  const { homeScore, awayScore, events } = req.body as {
    homeScore: number;
    awayScore: number;
    events: { 
      playerId: number; 
      type: 'GOAL' | 'ASSIST'; 
      amount: number 
    }[];
  };

  if (!Number.isInteger(matchId) || !Number.isInteger(tournamentId))
    return res.status(400).json({ error: 'Invalid match or tournament ID!' });

  if (!Array.isArray(events))
    return res.status(400).json({ error: 'Invalid match events!' });

  try {
    
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, tournamentId: true }
    });

    if (!match || match.tournamentId !== tournamentId)
      return res.status(404).json({ error: 'Match not found in tournament!' });

    // Run all changes inside a transaction so updates are atomic
    await prisma.$transaction(async (transaction) => {
      
      // Delete already existing events for this match, so they can be replaced with newer data
      await transaction.matchEvent.deleteMany({ where: { matchId } });

      // Map events from DTO to expected DB format
      const matchEventsToCreate = events
        .filter(event => event.amount > 0)    // Ignore zero-amount events, just in case
        .map(event => ({
          matchId,
          playerId: event.playerId,
          type: event.type === 'GOAL' ? 'GOAL' : 'ASSIST',
          amount: event.amount
        }));

      // Create match events
      if (matchEventsToCreate.length)
        await transaction.matchEvent.createMany({ data: matchEventsToCreate });

      // Update match
      await transaction.match.update({
        where: { id: matchId },
        data: { homeScore, awayScore, played: true }
      });

      // Reset all tournament player stats before being recomputed...
      await transaction.player.updateMany({
        where: { team: { tournamentId } },
        data: { goals: 0, assists: 0 }
      });

      // All tournament match events grouped by playerId and sorted by match event type, to recompute total goals/assists per player
      const playerAggregates = await transaction.matchEvent.groupBy({
        by: ['playerId', 'type'],
        where: { match: { tournamentId } },
        _sum: { amount: true }
      });

      // Recompute player stats
      for (const event of playerAggregates) {
        const total = event._sum.amount || 0;
        
        if (event.type === 'GOAL') 
          await transaction.player.update({ where: { id: event.playerId }, data: { goals: total } });
        else if (event.type === 'ASSIST') 
          await transaction.player.update({ where: { id: event.playerId }, data: { assists: total } });
      }

      // Reset all tournament teams stats before being recomputed...
      // This avoids incremental update complexity, making it simpler than trying to adjust only the affected teams
      await transaction.team.updateMany({
        where: { tournamentId },
        data: {
          gamesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
        }
      });

      // Load all played matches in tournament before being recomputed...
      const playedMatches = await transaction.match.findMany({
        where: { tournamentId, played: true },
        select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true }
      });

      const teamStats = new Map<number, { 
        gamesPlayed: number; 
        wins: number; 
        draws: number; 
        losses: number; 
        goalsFor: number; 
        goalsAgainst: number; 
      }>();
      
      // Helper to get or initialize team stats
      function getOrInitializeTeamStats(teamId: number) {
        if (!teamStats.has(teamId)) 
          teamStats.set(teamId, { gamesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });

        return teamStats.get(teamId)!;
      };

      // Recompute team stats from all played matches
      for (const playedMatch of playedMatches) {
        const homeTeam = getOrInitializeTeamStats(playedMatch.homeTeamId);
        const awayTeam = getOrInitializeTeamStats(playedMatch.awayTeamId);
        
        homeTeam.gamesPlayed++; 
        awayTeam.gamesPlayed++;

        homeTeam.goalsFor += playedMatch.homeScore; 
        homeTeam.goalsAgainst += playedMatch.awayScore;
        
        awayTeam.goalsFor += playedMatch.awayScore; 
        awayTeam.goalsAgainst += playedMatch.homeScore;
        
        if (playedMatch.homeScore > playedMatch.awayScore) { 
          homeTeam.wins++; 
          awayTeam.losses++; 
        }
        else if (playedMatch.homeScore < playedMatch.awayScore) { 
          awayTeam.wins++; 
          homeTeam.losses++; 
        }
        else { 
          homeTeam.draws++; 
          awayTeam.draws++; 
        }
      }

      // Persist recomputed team stats back to DB
      for (const [teamId, teamStat] of teamStats) {
        await transaction.team.update({
          where: { id: teamId },
          data: {
            gamesPlayed: teamStat.gamesPlayed,
            wins: teamStat.wins,
            draws: teamStat.draws,
            losses: teamStat.losses,
            goalsFor: teamStat.goalsFor,
            goalsAgainst: teamStat.goalsAgainst,
            goalDifference: teamStat.goalsFor - teamStat.goalsAgainst,
            points: teamStat.wins * 3 + teamStat.draws
          }
        });
      }
    });

    // Fetch freshly updated tournament to be returned...
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        groups: {
          include: {
            teams: { include: { players: true } }
          }
        },
        teams: { include: { players: true } },
        matches: {
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
            events: {
              include: {
                player: { select: { id: true, name: true, teamId: true } }
              }
            }
          },
          orderBy: [{ matchDay: 'asc' }, { id: 'asc' }]
        }
      }
    });

    return res.status(200).json(updatedTournament);
  } 
  catch (error) {
    console.error('Match report error:', error);
    return res.status(500).json({ error: 'Failed to save match report!' });
  }
});

// Helper route to create a player on a team
router.post('/:tournamentId/teams/:teamId/players', requireAuth, async (req: Request, res: Response) => {
  const tournamentId = Number(req.params.tournamentId);
  const teamId = Number(req.params.teamId);
  const { name } = req.body as { name: string };

  if (!name?.trim())
    return res.status(400).json({ error: 'Name required!' });

  // Verify team belongs to tournament
  const team = await prisma.team.findFirst({ where: { id: teamId, tournamentId }, select: { id: true } });
  if (!team) 
    return res.status(404).json({ error: 'Team not found in tournament!' });

  const player = await prisma.player.create({
    data: { name: name.trim(), teamId }
  });

  return res.status(201).json(player);
});

export default router;