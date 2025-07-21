import React, { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';

export interface TournamentDetails {
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

interface ContextShape {
  tournamentDetails: TournamentDetails;
  setTournamentDetails: Dispatch<SetStateAction<TournamentDetails>>;
  resetTournament: () => void;
}

const defaultTournamentDetails: TournamentDetails = {
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
  tournamentDetails: defaultTournamentDetails,
  setTournamentDetails: () => {},
  resetTournament: () => {}
});

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetails>(() => {
    const storedTournamentDetails = sessionStorage.getItem('tournamentDetails');
    return storedTournamentDetails ? JSON.parse(storedTournamentDetails) : defaultTournamentDetails;
  });

  // Persist on every change
  useEffect(() => {
    sessionStorage.setItem('tournamentDetails', JSON.stringify(tournamentDetails));
  }, [tournamentDetails]);

  const resetTournament = () => {
    sessionStorage.removeItem('tournamentDetails');
    setTournamentDetails(defaultTournamentDetails);
  };

  return (
    <TournamentContext.Provider value={{ tournamentDetails, setTournamentDetails, resetTournament }}>
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournamentDetails() {
  const context = useContext(TournamentContext);
  if (!context) 
    throw new Error('useTournament must be inside a TournamentProvider!');

  return context;
}