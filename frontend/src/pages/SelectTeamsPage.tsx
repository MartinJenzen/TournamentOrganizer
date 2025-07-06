import React from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/SelectTeamsPage.css';


export default function SelectTeamsPage() {
  const location = useLocation();
  const tournamentDetails = location.state?.tournamentDetails;


  return (
    <div>
      <h1>Select Teams</h1>
      <p>Tournament Name: {tournamentDetails?.tournamentName}</p>
      {/* Team selection logic goes here */}
    </div>
  );
}
