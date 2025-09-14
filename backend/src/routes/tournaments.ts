import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { generateMatchFixtures } from '../helpers/tournamentHelper';
import { validateMatchReport, replaceMatchEvents, updateMatch, recomputePlayerStats, recomputeTeamStats, fetchUpdatedTournament } from '../helpers/matchReportHelper';

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

  try {
    await validateMatchReport(prisma, tournamentId, matchId, events);

    await prisma.$transaction(async (transaction) => {
      await replaceMatchEvents(transaction, matchId, events);
      await updateMatch(transaction, matchId, homeScore, awayScore);
      await recomputePlayerStats(transaction, tournamentId);
      await recomputeTeamStats(transaction, tournamentId);
    });

    const updatedTournament = await fetchUpdatedTournament(prisma, tournamentId);
    return res.status(200).json(updatedTournament);
  }
  catch (error: any) {
    const status = error?.status || 500;
    const message = error?.message || 'Failed to save match report!';
    console.error('Match report error:', error);
    return res.status(status).json({ error: message });
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