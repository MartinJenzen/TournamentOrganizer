import { Prisma, Group, KnockoutRound, Team, TournamentStage } from '@prisma/client';

export async function generateMatchFixtures(transaction: Prisma.TransactionClient, tournamentId: number, tournamentType: string, teams: Team[], groups: Group[] = [], matchesPerTeam: number, knockoutLegs: number = 0) {
  let matches = [];
  
  if (tournamentType === 'LEAGUE')
    matches = roundRobinScheduling(tournamentId, teams, matchesPerTeam, 'LEAGUE_STAGE');
  else if (tournamentType === 'CUP')
    matches = await generateFirstRoundOfCupFixtures(transaction, tournamentId, teams, knockoutLegs);
  else if (tournamentType === 'GROUP_AND_KNOCKOUT') {
    for (const group of groups) {
      const groupTeams = teams.filter(team => team.groupId === group.id);    // Filter teams by group
      const groupMatches = roundRobinScheduling(tournamentId, groupTeams, matchesPerTeam, 'GROUP_STAGE');
      matches.push(...groupMatches);
    }
  }

  if (matches.length > 0) 
    await transaction.match.createMany({ data: matches });
}

function roundRobinScheduling(tournamentId: number, teams: any[], matchesPerTeam: number, tournamentStage: TournamentStage) {
  const matches = [];
  const teamsCount = teams.length;
  const isEven = teamsCount % 2 === 0;
  const matchDays = isEven ? teamsCount - 1 : teamsCount;

  // Prepare teams for round-robin scheduling
  // Add a "shadow" team (null) to allow for odd number of teams
  // This shadow team will not play any matches and it opponents will sit out for that match day
  const roundRobinTeams = !isEven ? [...teams, null] : [...teams];
  
  // Store first leg matches to reverse their order in second leg
  const firstLegMatches = [];

  for (let leg = 0; leg < matchesPerTeam; leg++) {
    // Start each leg with teams in original positions
    let matchDayTeams = [...roundRobinTeams];
    
    // First leg: normal order
    if (leg === 0) {

      for (let matchDay = 0; matchDay < matchDays; matchDay++) {
        const matchDayTeamsCount = Math.floor(matchDayTeams.length / 2);
        const matchDayMatches = [];
        
        // Generate matches for this match day
        for (let i = 0; i < matchDayTeamsCount; i++) {
          const homeTeam = matchDayTeams[i];
          const awayTeam = matchDayTeams[matchDayTeams.length - 1 - i];
          
          // Team sits out this match day if the opponent is a shadow team (null)
          if (!homeTeam || !awayTeam) 
            continue;
      
          const firstLeg = buildMatch(tournamentId, homeTeam.id, awayTeam.id, matchDay + 1, tournamentStage, 1);
          
          matches.push(firstLeg);
          matchDayMatches.push(firstLeg);
        }
        
        firstLegMatches.push(matchDayMatches);
        
        // Rotate teams (keep first team fixed, rotate others)
        if (matchDayTeams.length > 2) {
          const lastTeam = matchDayTeams.pop();
          matchDayTeams.splice(1, 0, lastTeam);    // Insert last team at position 1
        }
      }
    } 
    // Second leg: reverse order of first leg match days and swap home/away
    else {
      for (let matchDay = matchDays - 1; matchDay >= 0; matchDay--) {
        const firstLegRoundMatches = firstLegMatches[matchDay];
        
        for (const firstLegMatch of firstLegRoundMatches) {
          const secondLeg = buildMatch(tournamentId, firstLegMatch.awayTeamId, firstLegMatch.homeTeamId, (leg * matchDays) + (matchDays - matchDay), tournamentStage, 2);
          matches.push(secondLeg);
        }
      }
    }
  }

  return matches;
}

function buildMatch(tournamentId: number, homeTeamId: number, awayTeamId: number, matchDay: number, stage: TournamentStage, legNumber?: number, knockoutRound?: KnockoutRound, knockoutTieId?: number) {
  return {
    tournamentId,
    homeTeamId,
    awayTeamId,
    matchDay,
    stage,
    knockoutRound,
    knockoutTieId,
    legNumber
  };
}
  
// Create knockout tie only for two-legged knockout games (and not the final)
function createKnockoutTie(transaction: Prisma.TransactionClient, tournamentId: number, knockoutLegs: number, knockoutRound: KnockoutRound) {
  if (knockoutLegs !== 2 || knockoutRound === 'FINAL')
    return null;
   
  return transaction.knockoutTie.create({ data: { tournamentId } });
}

async function generateFirstRoundOfCupFixtures(transaction: Prisma.TransactionClient, tournamentId: number, teams: Team[], knockoutLegs: number) {
  
  const teamsCount = teams.length;
  
  if (!validateKnockoutTeamsCount(teamsCount))
    throw { status: 400, message: 'Number of teams for cup tournaments must be a power of two (e.g., 2, 4, 8, 16, ...)!' };
  
  const firstKnockoutRound = determineKnockoutRound(teamsCount);
  const matches = [];
  
  for (let i = 0; i < teamsCount; i += 2) 
    matches.push(...await build1stAndPotential2ndKnockoutLeg(transaction, tournamentId, teams[i].id, teams[i + 1].id, 1, knockoutLegs, firstKnockoutRound));

  return matches;
}

// Check if the number of teams is a power of two, and not 0
function validateKnockoutTeamsCount(teamsCount: number) {
  return (teamsCount & (teamsCount - 1)) === 0 && teamsCount !== 0;    // Bitwise
}

// Build first (and optionally second) knockout leg for a pair of teams in the knockout stage
async function build1stAndPotential2ndKnockoutLeg(transaction: Prisma.TransactionClient, tournamentId: number, teamA_id: number, teamB_id: number, matchDay: number, knockoutLegs: number, knockoutRound: KnockoutRound) {
  const matches = [];
  const knockoutTie = await createKnockoutTie(transaction, tournamentId, knockoutLegs, knockoutRound);

  const firstLeg = buildMatch(tournamentId, teamA_id, teamB_id, matchDay, 'KNOCKOUT_STAGE', 1, knockoutRound, knockoutTie?.id);
  matches.push(firstLeg);

  if (knockoutTie) {
    const secondLeg = buildMatch(tournamentId, teamB_id, teamA_id, matchDay + 1, 'KNOCKOUT_STAGE', 2, knockoutRound, knockoutTie?.id);
    matches.push(secondLeg);
  }

  return matches;
}

export async function generateInitialKnockoutMatchesFromGroups(transaction: Prisma.TransactionClient, tournament: any) {

  const groups = tournament.groups;
  const groupsCount = groups.length;
  const qualifiedTeamsPerGroupCount = tournament.topTeamsAdvancing;
  const qualifiedTeamsCount = qualifiedTeamsPerGroupCount * groupsCount;
  const initialKnockoutRound = determineKnockoutRound(qualifiedTeamsCount);
  const knockoutLegs = tournament.knockoutLegs;
  const initialKnockoutMatches = [];
  const nextMatchDay = getNextMatchDay(tournament.matches);

  await transaction.tournament.update({
    where: { id: tournament.id },
    data: { knockoutRound: initialKnockoutRound }
  });

  if (!validateQualifiedTeamsFromGroupsCount(qualifiedTeamsPerGroupCount, groupsCount))
    throw { status: 400, message: 'Number of teams for knockout stage must be a power of two (e.g., 2, 4, 8, 16, ...)!' };
  
  // Pair teams...  
  // If only one top team advances from each group, pair them sequentially
  if (qualifiedTeamsPerGroupCount === 1 && groupsCount > 1) {
    const matches = await pairBestTeamFromSequentialGroups(transaction, tournament.id, groups, knockoutLegs, initialKnockoutRound, nextMatchDay);
    initialKnockoutMatches.push(...matches);
  }
  // If 2 or more teams advance from each group, pair best qualified team from group X vs. worst qualified team from group Y, second best vs. second worst, etc.
  else if (qualifiedTeamsPerGroupCount >= 2 && groupsCount > 1) {
    const matches = await pairMultipleBestTeamsFromGroups(transaction, tournament.id, groups, qualifiedTeamsPerGroupCount, knockoutLegs, initialKnockoutRound, nextMatchDay);
    initialKnockoutMatches.push(...matches);
  }
  // If only one group exists and multiple teams advance, pair best qualified team vs. worst qualified team, second best vs. second worst, etc.
  else if (groupsCount === 1) {
    const matches = await pairAdvancingTeamsFromOneSingleGroup(transaction, tournament.id, groups[0], qualifiedTeamsCount, knockoutLegs, initialKnockoutRound, nextMatchDay);
    initialKnockoutMatches.push(...matches);
  }

  if (!initialKnockoutMatches.length) {
    if (!groups || groups.length === 0 || qualifiedTeamsCount === 0)
      throw { status: 400, message: 'No teams/groups available to generate knockout matches!' }
    else
      throw { status: 500, message: 'Failed to generate initial knockout matches!' };
  }

  await transaction.match.createMany({ data: initialKnockoutMatches });
}

// Pair the one advancing top team from each group sequentially
async function pairBestTeamFromSequentialGroups(transaction: Prisma.TransactionClient, tournamentId: number, groups: any[], knockoutLegs: number, knockoutRound: KnockoutRound, nextMatchDay: number) {
  const matches = [];

  for (let i = 0; i < groups.length; i += 2) {
    const groupX = groups[i];
    const groupY = groups[i + 1];
    const teamX = groupX?.teams?.find((team: Team) => team.tPosition === 1);
    const teamY = groupY?.teams?.find((team: Team) => team.tPosition === 1);

    if (teamX && teamY)
      matches.push(...await build1stAndPotential2ndKnockoutLeg(transaction, tournamentId, teamX.id, teamY.id, nextMatchDay, knockoutLegs, knockoutRound));
  }

  return matches;
}

// Pair best qualified team from group X vs. worst qualified team from group Y, second best vs. second worst, etc., when multiple teams advance from each group
export async function pairMultipleBestTeamsFromGroups(transaction: Prisma.TransactionClient, tournamentId: number, groups: any[], qualifiedTeamsPerGroupCount: number, knockoutLegs: number, knockoutRound: KnockoutRound, nextMatchDay: number) {
  const matches = [];

  for (let i = 0; i < groups.length; i += 2) {
    const groupX = groups[i];
    const groupY = groups[i + 1];

    for (let j = 0; j < qualifiedTeamsPerGroupCount; j++) {
      const teamX = groupX?.teams?.find((team: Team) => team.tPosition === (j + 1));
      const teamY = groupY?.teams?.find((team: Team) => team.tPosition === (qualifiedTeamsPerGroupCount - j));

      if (teamX && teamY)
        matches.push(...await build1stAndPotential2ndKnockoutLeg(transaction, tournamentId, teamX.id, teamY.id, nextMatchDay, knockoutLegs, knockoutRound));
    }
  }

  return matches;
}

// Pair best qualified team vs. worst qualified team, second best vs. second worst, etc., when only one group exists and multiple teams advance 
async function pairAdvancingTeamsFromOneSingleGroup(transaction: Prisma.TransactionClient, tournamentId: number, group: any, qualifiedTeamsCount: number, knockoutLegs: number, knockoutRound: KnockoutRound, nextMatchDay: number) {
  const matches = [];

  for (let i = 0; i < qualifiedTeamsCount / 2; i++) {
    const teamX = group?.teams?.find((team: Team) => team.tPosition === (i + 1));
    const teamY = group?.teams?.find((team: Team) => team.tPosition === (qualifiedTeamsCount - i));

    if (teamX && teamY)
      matches.push(...await build1stAndPotential2ndKnockoutLeg(transaction, tournamentId, teamX.id, teamY.id, nextMatchDay, knockoutLegs, knockoutRound));
  }

  return matches;
}

// Check if the number of qualified teams from groups is a power of two, and not 0
function validateQualifiedTeamsFromGroupsCount(topTeamsAdvancingPerGroup: number, groupsCount: number) {
  const qualifiedTeamsCount = topTeamsAdvancingPerGroup * groupsCount;
  return (qualifiedTeamsCount & (qualifiedTeamsCount - 1)) === 0 && qualifiedTeamsCount !== 0;    // Bitwise
}

export async function generateNextRoundOfKnockoutMatches(transaction: Prisma.TransactionClient, tournament: any) {

  const previousKnockoutRound = tournament.knockoutRound;    // The round that just finished
  const advancingTeams = await getAdvancingTeamsFromPreviousRound(transaction, tournament.id, tournament.knockoutLegs, previousKnockoutRound);
  const advancingTeamsCount = advancingTeams.length;

  if (!validateKnockoutTeamsCount(advancingTeamsCount))
    throw { status: 400, message: 'Number of advancing teams for next knockout round must be a power of two (e.g., 2, 4, 8, 16, ...)!' };

  const nextMatchDay = getNextMatchDay(tournament.matches);
  const nextRoundMatches: any[] = [];
  
  // Update tournament's knockout round to the next stage
  const nextKnockoutRound = determineKnockoutRound(advancingTeamsCount);
  await transaction.tournament.update({
    where: { id: tournament.id },
    data: { knockoutRound: nextKnockoutRound }
  });

  for (let i = 0; i < advancingTeamsCount; i += 2) {
    const matches = await build1stAndPotential2ndKnockoutLeg(transaction, tournament.id, advancingTeams[i].id, advancingTeams[i + 1].id, nextMatchDay, tournament.knockoutLegs, nextKnockoutRound);
    nextRoundMatches.push(...matches);
  }

  await transaction.match.createMany({ data: nextRoundMatches });
}

export function determineKnockoutRound(teamsCount: number): KnockoutRound {
  switch (teamsCount) {
    case 2:
      return 'FINAL';
    case 4:
      return 'SEMI_FINALS';
    case 8:
      return 'QUARTER_FINALS';
    case 16:
      return 'ROUND_OF_16';
    case 32:
      return 'ROUND_OF_32';
    case 64:
      return 'ROUND_OF_64';
    default:
      throw { status: 400, message: 'Unsupported number of teams for knockout round!'}
  }
}

function getNextMatchDay(matches: any[]) {
  if (!matches || matches.length === 0)
    throw { status: 400, message: 'No existing matches found to determine next match day!' };

  const lastMatch = matches[matches.length - 1];
  return lastMatch.matchDay + 1;
}

// Get the teams who won their knockout leg/s in the previous knockout round (those with most goals over both legs)
async function getAdvancingTeamsFromPreviousRound(transaction: Prisma.TransactionClient, tournamentId: number, knockoutLegs: number, previousKnockoutRound: KnockoutRound) {
  const previousKnockoutRoundMatches = await transaction.match.findMany({
    where: {
      tournamentId,
      knockoutRound: previousKnockoutRound,
      played: true
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      knockoutTieId: true
    }
  });

  const advancingTeams = [];
  
  if (knockoutLegs === 1) {
    for (const match of previousKnockoutRoundMatches) {     
      if (match.homeScore > match.awayScore) 
        advancingTeams.push({ id: match.homeTeamId });
      else if (match.awayScore > match.homeScore) 
        advancingTeams.push({ id: match.awayTeamId });
    }
  } 
  // Both legs are considered for two-legged knockout ties
  else if (knockoutLegs === 2) {
    // Group matches by knockoutTieId
    const matchesByKnockoutTie: { [key: number]: any[] } = {};  // key: knockoutTieId, value: array of matches
    for (const match of previousKnockoutRoundMatches) {
      if (!match.knockoutTieId)
        continue;

      // Initialize knockout tie array if not already present
      if (!matchesByKnockoutTie[match.knockoutTieId])
        matchesByKnockoutTie[match.knockoutTieId] = [];

      matchesByKnockoutTie[match.knockoutTieId].push(match);
    }
    
    // Determine winners for each knockout tie
    for (const tieId in matchesByKnockoutTie) {
      const firstAndSecondLeg = matchesByKnockoutTie[tieId];
      
      if (firstAndSecondLeg.length !== 2)
        throw { status: 500, message: 'Invalid number of matches found for two-legged knockout tie!' };
      
      const firstLeg = firstAndSecondLeg[0];
      const secondLeg = firstAndSecondLeg[1];
      const teamA_scoreAggregate = firstLeg.homeScore + secondLeg.awayScore;
      const teamB_scoreAggregate = firstLeg.awayScore + secondLeg.homeScore;
      
      if (teamA_scoreAggregate > teamB_scoreAggregate) 
        advancingTeams.push({ id: firstLeg.homeTeamId });
      else if (teamB_scoreAggregate > teamA_scoreAggregate) 
        advancingTeams.push({ id: firstLeg.awayTeamId });
    }
  }

  return advancingTeams;
}