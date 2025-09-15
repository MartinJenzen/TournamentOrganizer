import { PrismaClient } from "@prisma/client";
import { generateMatchFixtures } from '../helpers/matchFixturesHelper';

export async function validateTournament(tournament: any) {
  if (!tournament) 
    throw { status: 400, message: 'No tournament data provided!' };

  for (const key in tournament) {
    if (tournament[key] === null || tournament[key] === undefined) 
      throw { status: 400, message: `Tournament property ${key} is null or undefined!` };
  }
}

export async function createTournament(prisma: PrismaClient, userId: number, payload: any) {
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

  if (!tournamentData)
    throw { status: 500, message: 'Tournament creation failed!' };

  return tournamentData;
}

export async function createGroupsAndTeams(payload: any, prisma: PrismaClient, tournamentData: any) {
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
    teamData.map(team => prisma.team.create({ data: team }))
  );

  if (createdTeams.length !== teamData.length)
    throw { status: 500, message: 'Creating teams failed!' };

  await generateMatchFixtures(tournamentData.id, payload.tournamentType, payload.matchesPerTeam, createdTeams, createdGroups);
}

export async function createTeamsOnly(payload: any, prisma: PrismaClient, tournamentData: any) {
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

  if (createdTeams.length !== payload.selectedTeams.length)
    throw { status: 500, message: 'Creating teams failed!' };

  await generateMatchFixtures(tournamentData.id, payload.tournamentType, payload.matchesPerTeam, createdTeams);
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