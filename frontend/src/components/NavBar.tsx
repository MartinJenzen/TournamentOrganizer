import React, { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import UniversalModal, { ModalMode } from './UniversalModal';
import { signUp, login } from '../services/authService';
import '../styles/NavBar.css';

export default function NavBar() {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('login');
  const [serverResponse, setServerResponse] = useState<string | null>(null);

  const openModal = (mode: ModalMode) => {
    setModalMode(mode);
    setModalIsOpen(true);
  }

  const handleCancel = () => setModalIsOpen(false);
  
  // Invoked when user presses a confirming button in the modal (e.g., "Ok", "Sign Up" or "Login")
  const handleConfirm = async (data?: any) => {
    try {
      if (modalMode === 'signup') {
        const user = await signUp(data);
        console.log('Signup successful!', user);
      }
      else if (modalMode === 'login') {
        const user = await login(data);
        console.log('Login successful!', user);
      }
    } 
    catch (err: any) {
      setServerResponse(err.response?.data?.error ?? err.message);
      console.error('Error during authentication:', err);
    }
    finally {
      setModalIsOpen(false);
      setTimeout(() => setServerResponse(null), 3000); // Clear message after 3 sec.
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

          {/* Sign Up */}
          <button
            onClick={() => openModal('signup')}
            className="navbar-btn"
          >
            Sign Up
          </button>

          {/* Login */}
          <button
            onClick={() => openModal('login')}
            className="navbar-btn navbar-btn-login"
          >
            Login
          </button>

          {/* About */}
          <button
            onClick={() => openModal('info')}
            className="navbar-btn navbar-btn-login"
          >
            About
          </button>
        </div>
      </nav>

      <UniversalModal
        isOpen={modalIsOpen}
        mode={modalMode}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </Fragment>
  )
}