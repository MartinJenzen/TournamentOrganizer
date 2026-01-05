import React, { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';

export interface TournamentConfig {
  id?: number;
  createdAt?: string;
  updatedAt?: string; 
  tournamentName: string;
  tournamentType: 'LEAGUE' | 'GROUP_AND_KNOCKOUT' | 'CUP';
  teamsCount: number;
  matchesPerTeam: number;
  teamsPerGroup: number;
  groupsCount: number;
  teamsAdvancingPerGroup: number;
  knockoutLegs: number;
  selectedTeams: string[];
  groups?: Record<string, string[]>;
}

// TODO: align frontend and backend fields?
// TODO: add fields like: matchesPerTeam, etc.?
// TODO: consider normalizing state structure????
export interface Tournament {
  id: number;
  name: string;
  type: 'LEAGUE' | 'GROUP_AND_KNOCKOUT' | 'CUP';
  stage: string;
  createdAt: string;
  updatedAt: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  topTeamsAdvancing: number;
  knockoutLegs: number;
  teams: Array<{
    id: number;
    name: string;
    groupId?: number;
    tGamesPlayed: 0,
    tWins: 0,
    tDraws: 0,
    tLosses: 0,
    tGoalsFor: 0,
    tGoalsAgainst: 0,
    tGoalDifference: 0,
    tPoints: 0,
    players: Array<{
      id: number;
      name: string;
      teamId: number;
      goals: number;
      assists: number;
    }>;
  }>;
  groups?: Array<{
    id: number;
    name: string;
    teams: Tournament['teams'];
  }>;
  matches: Array<{
    id: number;
    homeTeam: {
      id: number;
      name: string;
    };
    awayTeam: {
      id: number;
      name: string;
    };
    matchDay: number;
    stage: string;
    homeScore: number;
    awayScore: number;
    played: boolean;
  }>;
}

export interface Match {
  id: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  homeScore: number;
  awayScore: number;
  matchDay: number;
  stage: string;
  knockoutRound?: string;
  knockoutTieId?: number;
  legNumber?: number;
  played: boolean;
  events?: Array<{
    id: number;
    playerId: number;
    type: 'GOAL' | 'ASSIST';
    amount: number;
    player: { id: number; name: string; teamId: number };
  }>;
}

interface ContextShape {
  // Initial tournament state getting built when user is creating a new tournament
  tournamentConfig: TournamentConfig;
  setTournamentConfig: Dispatch<SetStateAction<TournamentConfig>>;

  // Created tournament fetched from backend
  tournament?: Tournament;
  setTournament: Dispatch<SetStateAction<Tournament | undefined>>;

  // Reset both slots to default values
  resetTournament: () => void;
}

export const defaultTournamentConfig: TournamentConfig = {
  tournamentName: '',
  tournamentType: 'LEAGUE',
  teamsCount: 8,
  matchesPerTeam: 2,
  teamsPerGroup: 4,
  groupsCount: 2,
  teamsAdvancingPerGroup: 2,
  knockoutLegs: 1,
  selectedTeams: [],
  groups: {}
};

const TournamentContext = createContext<ContextShape>({
  tournamentConfig: defaultTournamentConfig,
  setTournamentConfig: () => {},
  tournament: undefined,
  setTournament: () => {},
  resetTournament: () => {}
});

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournamentConfig, setTournamentConfig] = useState<TournamentConfig>(() => {
    const storedTournamentConfig = sessionStorage.getItem('tournamentConfig');
    return storedTournamentConfig ? JSON.parse(storedTournamentConfig) : defaultTournamentConfig;
  });

  const [tournament, setTournament] = useState<Tournament | undefined>(); // -> (undefined) ?

  // Persist only the config
  useEffect(() => {
    sessionStorage.setItem('tournamentConfig', JSON.stringify(tournamentConfig));
  }, [tournamentConfig]);

  const resetTournament = () => {
    sessionStorage.removeItem('tournamentConfig');
    setTournamentConfig(defaultTournamentConfig);
    setTournament(undefined);
  };

  return (
    <TournamentContext.Provider 
      value={{ tournamentConfig, setTournamentConfig, tournament, setTournament, resetTournament }}
    >
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournamentContext() {
  const context = useContext(TournamentContext);
  if (!context) 
    throw new Error('useTournamentContext must be inside a TournamentProvider!');

  return context;
}