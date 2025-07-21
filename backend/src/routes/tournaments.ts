import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';

const router = Router();
const prisma = new PrismaClient();

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
      }
    });

    // Handle groups and teams for GROUP_AND_KNOCKOUT tournaments
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
    
      await prisma.team.createMany({ data: teamData });
    }

    // Handle teams for LEAGUE or CUP tournaments
    else if (payload.selectedTeams && payload.selectedTeams.length > 0) {
      const teamData = payload.selectedTeams.map((teamName: string) => ({
        name: teamName,
        tournamentId: tournamentData.id,
        groupId: null,
      }));

      await prisma.team.createMany({ data: teamData });
    }

    return res.status(201).json(tournamentData);
  }
  catch (err) {
    console.error('Error creating tournament: ', err);
    return res.status(500).json({ error: 'Failed to create tournament!' });
  }
});

export default router;