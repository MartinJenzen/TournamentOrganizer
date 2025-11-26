import { PrismaClient, Prisma } from "@prisma/client";
import { determineKnockoutRound, generateMatchFixtures } from '../helpers/matchFixturesHelper';

export async function validateTournamentPayload(tournamentPayload: any) {
  if (!tournamentPayload) 
    throw { status: 400, message: 'No tournament data provided!' };

  for (const key in tournamentPayload) {
    if (tournamentPayload[key] === null || tournamentPayload[key] === undefined) 
      throw { status: 400, message: `Tournament property ${key} is null or undefined!` };
  }
}

export async function createTournament(transaction: Prisma.TransactionClient, userId: number, payload: any) { 
  const tournamentData = await transaction.tournament.create({
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
      knockoutRound: payload.tournamentType === 'CUP' ? determineKnockoutRound(payload.teamsCount) : null,
      stage: payload.tournamentType === 'LEAGUE'
        ? 'LEAGUE_STAGE'
        : payload.tournamentType === 'GROUP_AND_KNOCKOUT'
        ? 'GROUP_STAGE'
        : 'KNOCKOUT_STAGE',    // CUP
    },
    include: {
      groups: true,
      teams: true,
      matches: true
    }
  });

  if (!tournamentData)
    throw { status: 500, message: 'Tournament creation failed!' };

  // Create teams (and groups if need be)     
  let teams, groups;
  if (payload.tournamentType === 'LEAGUE' || payload.tournamentType === 'CUP')
    teams = await createTeams(transaction, payload, tournamentData);
  else if (payload.tournamentType === 'GROUP_AND_KNOCKOUT') 
    [groups, teams] = await createGroupsAndTeams(transaction, payload, tournamentData);

  // Generate match fixtures
  if (teams && teams.length > 0) 
    await generateMatchFixtures(transaction, tournamentData.id, payload.tournamentType, teams, groups || [], payload.matchesPerTeam, payload.knockoutLegs);

  return tournamentData;
}

async function createTeams(transaction: Prisma.TransactionClient, payload: any, tournamentData: any) {
  const createdTeams = await Promise.all(
    payload.selectedTeams.map((teamName: string) => 
      transaction.team.create({
        data: {
          name: teamName,
          tournamentId: tournamentData.id,
          groupId: null  // No group for LEAGUE or CUP tournaments
        }
      })
    )
  );

  if (createdTeams.length !== payload.selectedTeams.length)
    throw { status: 500, message: 'Creating teams failed!' };

  return createdTeams;
}

async function createGroupsAndTeams(transaction: Prisma.TransactionClient, payload: any, tournamentData: any) {
  // Convert frontend groups object to array format
  const groupsArray = Object.entries(payload.groups).map(([groupName, teams]) => ({
    groupName,
    teams: teams as string[]    // Array of team names
  }));

  // Create groups first (one by one to get IDs)
  const createdGroups = await Promise.all(
    groupsArray.map(async (grp) => {
      return await transaction.group.create({
        data: {
          name: grp.groupName,
          tournamentId: tournamentData.id
        }
      });
    })
  );

  if (createdGroups.length !== groupsArray.length)
    throw { status: 500, message: 'Creating groups failed!' };

  // Then create teams with proper group linkage
  const teamData = groupsArray.flatMap((group) => 
    group.teams.map((teamName) => {
      const matchingGroups = createdGroups.find(createdGroup => createdGroup.name === group.groupName);
      
      if (!matchingGroups) 
        throw { status: 404, message: `Group ${group.groupName} not found!` };
      
      return {
        name: teamName,
        groupId: matchingGroups!.id,    // ! asserts that matchingGroups is not null
        tournamentId: tournamentData.id,
      };
    })
  );

  const createdTeams = await Promise.all(
    teamData.map(team => transaction.team.create({ data: team }))
  );

  if (createdTeams.length !== teamData.length)
    throw { status: 500, message: 'Creating teams failed!' };

  return [createdGroups, createdTeams];
}

export async function fetchCreatedTournament(prisma: PrismaClient, tournamentData: any) {
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

  if (!fullTournamentData)
    throw { status: 404, message: 'Tournament not found after creation!' };

  return fullTournamentData;
}