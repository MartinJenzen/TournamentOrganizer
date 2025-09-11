import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext';
import { TournamentProvider } from './context/TournamentContext';
import NavBar from './components/NavBar';
import SidePanel from './components/SidePanel';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CreateTournamentPage from './pages/CreateTournamentPage';
import SelectTeamsPage from './pages/SelectTeamsPage';
import OrganizeTeamsPage from './pages/OrganizeTeamsPage';
import TournamentPage from './pages/TournamentPage';
import LoadTournamentPage from './pages/LoadTournamentPage';

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <Router>
          <NavBar />
          <Routes>
            {/* Public routes without SidePanel */}
            <Route path="/" element={<LandingPage />} />

              {/* (Protected?) routes with SidePanel */}
              <Route element={<SidePanel />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create-tournament" element={<CreateTournamentPage />} />
                <Route path="/select-teams" element={<SelectTeamsPage />} />
                <Route path="/organize-teams" element={<OrganizeTeamsPage />} />
                <Route path="/tournament" element={<TournamentPage />} />
                <Route path="/load-tournament" element={<LoadTournamentPage />} />
              </Route>
          </Routes>
        </Router>
      </TournamentProvider>
    </AuthProvider>
  );
}