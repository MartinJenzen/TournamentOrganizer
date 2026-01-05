import { Router, Request, Response } from 'express';
import { PrismaClient, Tournament, TournamentStage } from '@prisma/client';
import { requireAuth } from './auth';
import { validateTournamentPayload, createTournament, fetchCreatedTournament } from '../helpers/tournamentHelper';
import { validateMatchReport, replaceMatchEvents, updateMatch, recomputePlayerStats, recomputeTeamStats, fetchUpdatedTournament, validateTournamentCompletion, ensureKnockoutTieResolved } from '../helpers/matchReportHelper';

const router = Router();
const prisma = new PrismaClient();

// Create a new tournament
router.post('/', requireAuth, async (req: Request, res: Response) => {  
  try {
    const payload = req.body;
    const userId = (req as any).user.id;

    // Create tournament
    await validateTournamentPayload(payload);
    const tournamentData = await prisma.$transaction(async (transaction) => {
      return await createTournament(transaction, userId, payload);
    })
    
    const fullTournamentData = await fetchCreatedTournament(prisma, tournamentData);

    return res.status(201).json(fullTournamentData);
  }
  catch (error: any) {
    const status = error?.status || 500;
    const message = error?.message || 'Failed to create tournament!';
    console.error('Tournament creation error: ', error);
    return res.status(status).json({ error: message });
  }
});

// Get list of all tournaments created by user
router.get('/user-tournaments', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

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

// Delete tournament/s
router.delete('/', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const tournamentIdsListParameter = req.query.ids;

  const tournamentIds = String(tournamentIdsListParameter ?? '')
    .split(', ')
    .map(string => Number(string.trim()))    // Remove fluke white spaces and convert to number
    .filter(tournamentId => Number.isInteger(tournamentId) && tournamentId > 0);

  if (tournamentIds.length === 0)
    return res.status(400).json({ error: 'No valid tournament IDs provided!' });

  // Verify
  const existingTournaments = await prisma.tournament.findMany({
    where: { id: { in: tournamentIds } },
    select: { id: true, ownerId: true }
  });

  if (existingTournaments.length !== tournamentIds.length)
    return res.status(404).json({ error: 'One or more tournaments were not found!' });

  const isDeletingWithoutOwnership = existingTournaments.some(tournament => tournament.ownerId !== userId);
  if (isDeletingWithoutOwnership) 
    return res.status(403).json({ error: 'You do not have permission to delete one or more tournaments!' });

  // Delete tournament/s and all related data
  await prisma.$transaction([
    // MatchEvents
    prisma.matchEvent.deleteMany({
      where: { match: { tournamentId: { in: tournamentIds } } }
    }),
    // Matches
    prisma.match.deleteMany({
      where: { tournamentId: { in: tournamentIds } }
    }),
    // KnockoutTies
    prisma.knockoutTie.deleteMany({
      where: { tournamentId: { in: tournamentIds } }
    }),
    // Players (from teams)
    prisma.player.deleteMany({
      where: { team: { tournamentId: { in: tournamentIds } } }
    }),
    // Teams
    prisma.team.deleteMany({
      where: { tournamentId: { in: tournamentIds } }
    }),
    // Groups
    prisma.group.deleteMany({
      where: { tournamentId: { in: tournamentIds } }
    }),
    // Tournament/s
    prisma.tournament.deleteMany({
      where: { id: { in: tournamentIds } }
    })
  ]);

  console.log(`Deleted tournament/s with ID: ${tournamentIds.join(', ')}`);

  return res.sendStatus(204);
})

// Match fixtures retrieval
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

// Match report submission
router.patch('/:tournamentId/matches/:matchId/report', requireAuth, async (req: Request, res: Response) => {
  const tournamentId = Number(req.params.tournamentId);
  const matchId = Number(req.params.matchId);
  const { homeScore, awayScore, events, tournamentStage } = req.body as {
    homeScore: number;
    awayScore: number;
    tournamentStage: TournamentStage;
    events: { 
      playerId: number; 
      type: 'GOAL' | 'ASSIST'; 
      amount: number 
    }[];
  };

  try {
    await validateMatchReport(prisma, tournamentId, matchId, events, tournamentStage);

    // Run all changes inside a transaction so updates are atomic
    await prisma.$transaction(async (transaction) => {
      await ensureKnockoutTieResolved(transaction, tournamentId, matchId, homeScore, awayScore);
      await replaceMatchEvents(transaction, matchId, events);
      await updateMatch(transaction, matchId, homeScore, awayScore);
      await recomputePlayerStats(transaction, tournamentId);
      await recomputeTeamStats(transaction, tournamentId, tournamentStage);
      await validateTournamentCompletion(transaction, tournamentId);
    });

    const updatedTournament = await fetchUpdatedTournament(prisma, tournamentId);
    if (!updatedTournament)
      throw { status: 404, message: 'Tournament not found after match report was saved!' }; 

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