import React, { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UniversalModal, { ModalMode } from './UniversalModal';
import { signUp, login, logout } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import '../styles/NavBar.css';

export default function NavBar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('login');

  const modalTitle = modalMode === 'info' ? 'About' : undefined;
  const modalMessage = modalMode === 'info' ? 'Creator: Martin Jensen\nDate: July 2025' : undefined;

  const openModal = (mode: ModalMode) => {
    setModalMode(mode);
    setModalIsOpen(true);
  }

  const handleCancel = () => setModalIsOpen(false);
  
  // Invoked when user presses a confirming button in the modal (e.g., "Ok", "Sign Up" or "Login")
  const handleConfirm = async (data?: any) => {
    try {
      let user = null;
      
      if (modalMode === 'signup') {
        user = await signUp(data);
        console.log('Signup successful!', user);
      }
      else if (modalMode === 'login') {
        user = await login(data);
        console.log('Login successful!', user);
      }

      if (user) {
        setUser(user);
        navigate('/dashboard');
      }
      
      setModalIsOpen(false);
    } 
    catch (error: any) {
      console.error('Error during authentication:', error);
    }
  }

  const handleLogout = async () => {
    try {
      setUser(null);
      await logout();    // Clears cookie on server and in browser
      navigate('/');
      console.log('Logout successful.');
    }
    catch (error) {
      console.error('Logout error:', error);
    }
  }

  return (
    <Fragment>
      <nav className="navbar">
        
        {/* Title */}
        <div className="navbar-title">
          <Link to="/">Tournament Organizer</Link>
        </div>
        
        {/* Buttons */}
        <div className="navbar-buttons">

          {user ? (
            <Fragment>
              <span className="navbar-username">{user.username || user.email}</span>
              
              {/* Logout */}
              <button onClick={handleLogout} className="transparent">
                Logout
              </button>
            </Fragment>
          ) : (
            <Fragment>
              {/* Sign Up */}
              <button
                onClick={() => openModal('signup')}
                className="blue"
              >
                Sign Up
              </button>

              {/* Login */}
              <button
                onClick={() => openModal('login')}
                className="transparent"
              >
                Login
              </button>
            </Fragment>
          )}

          {/* About */} 
          <button
            onClick={() => openModal('info')}
            className="transparent"
          >
            About
          </button>
        </div>
      </nav>

      <UniversalModal
        isOpen={modalIsOpen}
        mode={modalMode}
        title={modalTitle}
        message={modalMessage}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </Fragment>
  )
}