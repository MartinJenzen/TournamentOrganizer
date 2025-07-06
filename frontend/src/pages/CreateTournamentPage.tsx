import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CreateTournamentPage.css';

export default function CreateTournamentPage() {
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentType, setTournamentType] = useState('LEAGUE');
  const [teamsCount, setTeamsCount] = useState(8);
  const [matchesPerTeam, setMatchesPerTeam] = useState(2);
  const [teamsPerGroupOptions, setTeamsPerGroupOptions] = useState([2, 4, 8]);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [groupsCount, setGroupsCount] = useState(2);
  const [teamsAdvancingPerGroup, setTeamsAdvancingPerGroup] = useState(2);
  const [knockoutLegs, setKnockoutLegs] = useState(1);
  const navigate = useNavigate();

  // Different options for total number of teams, based on tournament type
  const teamsCountOptions = useMemo(() => {
    const leagueTeamsCountOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20];
    const groupTeamsCountOptions = [4, 8, 16, 32, 64];
    const cupTeamsCountOptions = [2, 4, 8, 16, 32, 64];

    if (tournamentType === 'LEAGUE') 
      return leagueTeamsCountOptions;
    else if (tournamentType === 'GROUP_AND_KNOCKOUT') 
      return groupTeamsCountOptions;
    else if (tournamentType === 'CUP') 
      return cupTeamsCountOptions;
    return leagueTeamsCountOptions;    // Default to league options
    
  }, [tournamentType]);
  
  // Reset teamsCount from the proper range when tournament type changes
  useEffect(() => {
    if (!teamsCountOptions.includes(teamsCount)) {
      setTeamsCount(teamsCountOptions[0]);
    }
  }, [tournamentType, teamsCount, teamsCountOptions]);

  // Compute possible number of teams per group whenever teamsCount changes
  useEffect(() => {
    if (tournamentType === 'GROUP_AND_KNOCKOUT') {
      const options: number[] = [];

      for (let i = 2; i <= teamsCount; i++) {
        if (teamsCount % i === 0)
          options.push(i);
      }

      setTeamsPerGroupOptions(options);
      console.log('Teams per group options:', options); // TODO: REMOVE

      // Reset teamsPerGroup if the current teamsPerGroup value is no longer valid
      if (!options.includes(teamsPerGroup)) {
        setTeamsPerGroup(options[0]);
      }
    }
  }, [teamsCount, teamsPerGroup, tournamentType]);

  // Compute number of groups based on teamsCount and teamsPerGroup
  useEffect(() => {
    if (tournamentType === 'GROUP_AND_KNOCKOUT') {
      if (teamsPerGroup > 0) {
        console.log('Teams per group:', teamsPerGroup); // TODO: REMOVE
        console.log('Teams count:', teamsCount);        // TODO: REMOVE
        const groupsCount = teamsCount / teamsPerGroup;
        setGroupsCount(groupsCount);
        console.log('Groups count:', groupsCount);      // TODO: REMOVE
      }
    }
  }, [teamsCount, teamsPerGroup, tournamentType]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();    // Prevent the default form submission behavior

    // Redirect to the SelectTeamsPage with the tournament details
    const tournamentDetails = {
      tournamentName,
      tournamentType,
      teamsCount,
      matchesPerTeam:          tournamentType === 'CUP' ? 0 : matchesPerTeam,
      groupsCount:            (tournamentType === 'LEAGUE' || tournamentType === 'CUP') ? 0 : groupsCount,
      teamsPerGroup:          (tournamentType === 'LEAGUE' || tournamentType === 'CUP') ? 0 : teamsPerGroup,
      teamsAdvancingPerGroup: (tournamentType === 'LEAGUE' || tournamentType === 'CUP') ? 0 : teamsAdvancingPerGroup,
      knockoutLegs:            tournamentType === 'LEAGUE' ? 0 : knockoutLegs,
    };

    console.log('Tournament Details:', tournamentDetails); // TODO: REMOVE

    // Redirect to the SelectTeamsPage with the tournament details
    navigate('/select-teams', { state: { tournamentDetails } });
  };

  return (
    <div className="create-tournament-container">
      <h1>Create New Tournament</h1>

      <form onSubmit={handleSubmit} className="create-tournament-form">

        {/* Tournament name */}
        <div className="form-group">
          <label className="form-label" htmlFor="tournamentName">Tournament Name</label>
          <input
            className="form-input"
            type="text"
            id="tournamentName"
            value={tournamentName}
            onChange={(event) => setTournamentName(event.target.value)}
            required
          />
        </div>

        {/* Tournament type */}
        <div className="form-group">
          <label className="form-label" htmlFor="tournamentType">Tournament Type</label>
          <select
            id="tournamentType"
            className="form-input"
            value={tournamentType}
            onChange={(event) => setTournamentType(event.target.value)}
          >
            <option value="LEAGUE">League</option>
            <option value="GROUP_AND_KNOCKOUT">Group and Knockout</option>
            <option value="CUP">Cup</option>
          </select>
        </div>

        {/* Total number of teams */}
        <div className="form-group">
          <label className="form-label" htmlFor="teamsCount">Number of Teams</label>
          <select
            id="teamsCount"
            className="form-input"
            value={teamsCount}
            onChange={(event) => setTeamsCount(Number(event.target.value))}
            required
          >
            {teamsCountOptions.map((number) => (
              <option key={number} value={number}>
                {number}
              </option>
            ))}
          </select>
        </div>
        
        {/* 'League' or 'Group & Knockout' tournament type */}
        {(tournamentType === 'LEAGUE' || tournamentType === 'GROUP_AND_KNOCKOUT') && (
          
          // Number of league/group matches (legs) per team
          <div className="form-group">

            {/* League Legs */}
            {tournamentType === 'LEAGUE' && (
              <label className="form-label" htmlFor="matchesPerTeam">League Legs</label>
            )}

            {/* Group Legs */}
            {tournamentType === 'GROUP_AND_KNOCKOUT' && (
              <label className="form-label" htmlFor="matchesPerTeam">Group Legs</label>
            )}

            <select
              id="matchesPerTeam"
              className="form-input"
              value={matchesPerTeam}
              onChange={(event) => setMatchesPerTeam(Number(event.target.value))}
              required
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
        )}

        {/* 'Group & Knockout' tournament type*/}
        {tournamentType === 'GROUP_AND_KNOCKOUT' && (
          
          <Fragment>
            {/* Number of teams per group */}
            <div className="form-group">
              <label className="form-label" htmlFor="teamsPerGroup">Teams Per Group</label>
              <select
                id="teamsPerGroup"
                className="form-input"
                value={teamsPerGroup}
                onChange={(event) => setTeamsPerGroup(Number(event.target.value))}
                required
              >
                {teamsPerGroupOptions.map((number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>
            </div>

            {/* Number of top teams advancing per group */}
            <div className="form-group">
              <label className="form-label" htmlFor="teamsAdvancing">Teams Advancing</label>
              <select
                id="teamsAdvancing"
                className="form-input"
                value={teamsAdvancingPerGroup}
                onChange={(event) => setTeamsAdvancingPerGroup(Number(event.target.value))}
                required
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
          </Fragment>
        )}

        {/* 'Cup' or 'Group & Knockout' tournament type */}
        {(tournamentType === 'CUP' || tournamentType === 'GROUP_AND_KNOCKOUT') && (
          
          // Number of knockout matches
          <div className="form-group">
            <label className="form-label" htmlFor="knockoutLegs">Knockout Legs</label>
            <select
              id="knockoutLegs"
              className="form-input"
              value={knockoutLegs}
              onChange={(event) => setKnockoutLegs(Number(event.target.value))}
              required
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>

        )}

        {/* Create button */}
        <button className="primary-btn create-button" type="submit">
          Select Teams
        </button>
      </form>
    </div>
  );
}