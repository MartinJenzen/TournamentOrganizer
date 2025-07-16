import React, { useEffect } from 'react'
import { useTournamentDetails } from '../context/TournamentContext';
import '../styles/Dashboard.css'

export default function Dashboard() {
  const { resetTournament } = useTournamentDetails();

  useEffect(() => {
    resetTournament();
  }, [resetTournament]);

  return (
    <div>
      <h2>Welcome to the Tournament Organizer</h2>
      <p>Select an option from the side panel to get started.</p>
    </div>
  )
}