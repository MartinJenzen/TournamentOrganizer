import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leagues } from '../data/leagues';
import { useTournamentDetails } from '../context/TournamentContext';
import '../styles/SelectTeamsPage.css';

export default function SelectTeamsPage() {
  const navigate = useNavigate();
  const { tournamentDetails, setTournamentDetails } = useTournamentDetails();

  const [selectedLeague, setSelectedLeague] = useState("Bundesliga");
  const [availableTeams, setAvailableTeams] = useState<string[]>(() =>
    leagues[selectedLeague].filter(
      // Filter out teams already selected in tournamentDetails
      team => !(tournamentDetails.selectedTeams).includes(team)
    )
  );
  const [selectedTeams, setSelectedTeams] = useState(tournamentDetails.selectedTeams);

  // States for checkboxes: store names of teams that are checked in each list.
  const [checkedAvailableTeams, setCheckedAvailableTeams] = useState<string[]>([]);
  const [checkedSelectedTeams, setCheckedSelectedTeams] = useState<string[]>([]);

  // Maximum number of teams allowed to select
  const maxTeams = tournamentDetails.teamsCount;

  // Update available teams and clear any checked items when selected league changes
  useEffect(() => {
    setAvailableTeams(
      leagues[selectedLeague].filter(team => !selectedTeams.includes(team))
    );
    setCheckedAvailableTeams([]);
    setCheckedSelectedTeams([]);
  }, [selectedLeague, selectedTeams]);

  // Update tournament details when selectedTeams change
  useEffect(() => {
    setTournamentDetails(prev => ({
      ...prev,         // Spread previous tournamentDetails into new object
      selectedTeams    // And merge in new selectedTeams
    }));
  }, [selectedTeams, setTournamentDetails]);

  // Toggle checkbox for team in availableTeams list
  const toggleAvailableTeamCheckbox = (teamToToggle: string) => {
    if (checkedAvailableTeams.includes(teamToToggle))   // Remove team if already checked
      setCheckedAvailableTeams(checkedAvailableTeams.filter(team => team !== teamToToggle));
    else    // Add team if not already checked
      setCheckedAvailableTeams([...checkedAvailableTeams, teamToToggle]);  
  };

  // Toggle checkbox for team in selectedTeams list
  const toggleSelectedTeamCheckbox = (teamToToggle: string) => {
    if (checkedSelectedTeams.includes(teamToToggle))
      setCheckedSelectedTeams(checkedSelectedTeams.filter(selectedTeam => selectedTeam !== teamToToggle));
    else
      setCheckedSelectedTeams([...checkedSelectedTeams, teamToToggle]);
  };

  // Move checked teams from availableTeams to selectedTeams
  const handleAddTeams = () => {
    if (checkedAvailableTeams.length) {
      setAvailableTeams(availableTeams.filter(team => !checkedAvailableTeams.includes(team)));
      setSelectedTeams([...selectedTeams, ...checkedAvailableTeams]);
      setCheckedAvailableTeams([]);
    }
  };

  // Remove checked selected teams from selectedTeams list
  const handleRemoveTeams = () => {
    if (checkedSelectedTeams.length) {
      setSelectedTeams(selectedTeams.filter(team => !checkedSelectedTeams.includes(team)));
      setAvailableTeams([...availableTeams, ...checkedSelectedTeams]);
      setCheckedSelectedTeams([]);
    }
  };

  // Add all available teams to selectedTeams list
  const handleAddAllTeams = () => {
    setSelectedTeams([...selectedTeams, ...availableTeams]);
    setAvailableTeams([]);
  };

  // Remove all teams from selectedTeams list
  const handleRemoveAllTeams = () => {
    setAvailableTeams([...availableTeams, ...selectedTeams]);
    setSelectedTeams([]);
  };

  return (
    <div className="select-teams-container">
      <h1>Select Teams</h1>
      <div className="league-selection-container">
        <label className="league-label">League</label>
        
        {/* Select league */}
        <select 
          className="league-select"
          value={selectedLeague}
          onChange={(event) => setSelectedLeague(event.target.value)}
        >
          {/* League options */}
          {Object.keys(leagues).map(league => (
            <option key={league} value={league}>{league}</option>
          ))}
        </select>
      </div>

      <div className="lists-row">

        {/* Available teams */}
        <div className="column-container">
          <h2 className="column-header">Available Teams <span className="teams-count-label">({availableTeams.length})</span></h2>
          <ul className="teams-list">
            {availableTeams
              .slice()                               // Creates shallow copy to avoid mutating state directly
              .sort((a, b) => a.localeCompare(b))    // Sorts teams alphabetically
              .map(team => (                         // Maps each team to a list item  
                <li key={team} className="team-item">
                  <label className="team-checkbox-label">
                    <input
                      type="checkbox"
                      checked={checkedAvailableTeams.includes(team)}
                      onChange={() => toggleAvailableTeamCheckbox(team)}
                    />{' '}    {/* Adds a space between checkbox and label */}
                    {team}
                  </label>
                </li>
            ))}
          </ul>
        </div>

        {/* Middle buttons */}
        <div className="buttons-column">

          {/* Add */}
          <button 
            onClick={handleAddTeams} 
            className="middle-button" 
            disabled={checkedAvailableTeams.length === 0 || selectedTeams.length + checkedAvailableTeams.length > maxTeams}
          >
            Add &gt;&gt;
          </button>

          {/* Remove */}
          <button 
            onClick={handleRemoveTeams} 
            className="middle-button" 
            disabled={checkedSelectedTeams.length === 0}
          >
            &lt;&lt; Remove
          </button>

          {/* Add all */}
          <button
            onClick={handleAddAllTeams}
            className="middle-button"
            disabled={availableTeams.length === 0 || selectedTeams.length + availableTeams.length > maxTeams}
          >
            Add All &gt;&gt;
          </button>

          {/* Remove all */}
          <button
            onClick={handleRemoveAllTeams}
            className="middle-button"
            disabled={selectedTeams.length === 0}
          >
            &lt;&lt; Remove All
          </button>

          {/* Settings (go back to CreateTournamentPage) */}
          <button 
            className="middle-button" 
            onClick={() => navigate('/create-tournament')}
          >
            Settings
          </button>

          {/* Continue */}
          <button 
            className="middle-button continue"
            disabled={!(selectedTeams.length === maxTeams)}
            onClick={() => navigate('/create-tournament')}
          >
            Continue
          </button>
        </div>

        {/* Selected Teams Column */}
        <div className="column-container">
          <h2 className="column-header">Selected Teams <span className="teams-count-label">({selectedTeams.length}/{maxTeams})</span></h2>
          <ul className="teams-list">
            {selectedTeams
              .slice()
              .sort((a, b) => a.localeCompare(b))
              .map(team => (
                <li key={team} className="team-item">
                  <label className="team-checkbox-label">
                    <input
                      type="checkbox"
                      checked={checkedSelectedTeams.includes(team)}
                      onChange={() => toggleSelectedTeamCheckbox(team)}
                    />{' '}
                    {team}
                  </label>
                </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}