import { PrismaClient, Prisma } from '@prisma/client';

export async function validateMatchReport(prisma: PrismaClient, tournamentId: number, matchId: number, events: any[]) {
  if (!Number.isInteger(matchId) || !Number.isInteger(tournamentId))
    throw { status: 400, message: 'Invalid match or tournament ID!' };

  if (!Array.isArray(events))
    throw { status: 400, message: 'Invalid match events!' };
    
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, tournamentId: true }
  });

  if (!match || match.tournamentId !== tournamentId)
    throw { status: 404, message: 'Match not found in tournament!' };

  return match;
}

export async function replaceMatchEvents(transaction: Prisma.TransactionClient, matchId: number, events: { playerId: number, type: string, amount: number }[]) {
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
}

export async function updateMatch(transaction: Prisma.TransactionClient, matchId: number, homeScore: number, awayScore: number) {
  await transaction.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, played: true }
  });
}

export async function recomputePlayerStats(transaction: Prisma.TransactionClient, tournamentId: number) {
  // Reset all tournament player stats before being recomputed...
  // Avoids incremental update complexity and makes operation idempotent to prevent double-counting if match report is later changed
  await transaction.player.updateMany({
    where: { team: { tournamentId } },
    data: { goals: 0, assists: 0 }
  });

  // All tournament match events grouped by playerId and sorted by match event type, to recompute total goals/assists per player
  const groupedMatchEvents = await transaction.matchEvent.groupBy({
    by: ['playerId', 'type'],
    where: { match: { tournamentId } },
    _sum: { amount: true }
  });

  // Recompute player stats
  for (const event of groupedMatchEvents) {
    const total = event._sum.amount || 0;
    
    if (event.type === 'GOAL') 
      await transaction.player.update({ where: { id: event.playerId }, data: { goals: total } });
    else if (event.type === 'ASSIST') 
      await transaction.player.update({ where: { id: event.playerId }, data: { assists: total } });
  }
}

export async function recomputeTeamStats(transaction: Prisma.TransactionClient, tournamentId: number) {
  // Reset all tournament teams stats before being recomputed...
  // Avoids incremental update complexity, making it simpler than trying to adjust only the affected teams
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

  // Recompute team stats from all played matches
  for (const playedMatch of playedMatches) {
    const homeTeam = getOrInitializeTeamStats(playedMatch.homeTeamId, teamStats);
    const awayTeam = getOrInitializeTeamStats(playedMatch.awayTeamId, teamStats);
    
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
}

// Helper to get or initialize team stats
function getOrInitializeTeamStats(teamId: number, teamStats: Map<number, { gamesPlayed: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }>) {
  
  if (!teamStats.has(teamId)) 
    teamStats.set(teamId, { gamesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });

  return teamStats.get(teamId)!;
};

// Fetch freshly updated tournament to be returned...
export async function fetchUpdatedTournament(prisma: PrismaClient, tournamentId: number) {
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
  
  return updatedTournament;
}