import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateMatchFixtures(tournamentId: number, tournamentType: string, matchesPerTeam: number, teams: any[], groups: any[] = []) {
  let matches: any[] = [];
  
  if (tournamentType === 'LEAGUE')
    matches = roundRobinScheduling(tournamentId, teams, matchesPerTeam, 'LEAGUE_STAGE');
  else if (tournamentType === 'GROUP_AND_KNOCKOUT') {
    for (const group of groups) {
      const groupTeams = teams.filter(team => team.groupId === group.id);    // Filter teams by group
      const groupMatches = roundRobinScheduling(tournamentId, groupTeams, matchesPerTeam, 'GROUP_STAGE');
      matches.push(...groupMatches);
    }
  }

  if (matches.length > 0) {
    console.log('Generated match fixtures:', matches);
    await prisma.match.createMany({ data: matches });
  }
}

function roundRobinScheduling(tournamentId: number, teams: any[], matchesPerTeam: number, tournamentStage: string) {
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
          
          const matchData = {
            tournamentId,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            matchDay: matchDay + 1,
            stage: tournamentStage
          };
          
          matches.push(matchData);
          matchDayMatches.push(matchData);
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
          matches.push({
            tournamentId,
            homeTeamId: firstLegMatch.awayTeamId,  // Swap home/away
            awayTeamId: firstLegMatch.homeTeamId,
            matchDay: (leg * matchDays) + (matchDays - matchDay),
            stage: tournamentStage
          });
        }
      }
    }
  }

  return matches;
}