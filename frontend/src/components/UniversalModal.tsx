import React, { Fragment, useEffect, useState, useRef } from 'react'
import '../styles/UniversalModal.css'

export type ModalMode = 'login' | 'signup' | 'confirm' | 'info'

export type ModalProps = {
  isOpen: boolean
  mode: ModalMode
  title?: string
  message?: string
  confirmButtonText?: string
  isDangerous?: boolean
  onConfirm?: (data?: any) => void
  onCancel: () => void
}

/**
 * A reusable modal dialog component that supports multiple modes:
 ** 'login':    renders email/password fields
 ** 'signup':   renders username/email/password fields
 ** 'confirm':  displays a confirmation message with OK/Cancel buttons
 ** 'info':     displays an informational message with just a Close button
 *
 * Props:
 ** isOpen:     whether the modal is visible
 ** mode:       which UI to render (login/signup/confirm/info)
 ** message:    text for confirm/info modes
 ** onConfirm:  callback invoked with form data or undefined
 ** onCancel:   callback invoked when the user cancels or closes
 */
export default function UniversalModal({ isOpen, mode, title, message, confirmButtonText, isDangerous = false, onConfirm, onCancel }: ModalProps) {
  
  const initialForm = { email: '', password: '', username: '' }
  const firstInputFieldRef = useRef<HTMLInputElement>(null);

  // State to manage form inputs for login/signup modes
  const [form, setForm] = useState(initialForm);

  // Clear form when modal closes
  useEffect(() => {
    if (!isOpen) 
      setForm(initialForm)
  }, [isOpen])

  // Focus first input field when modal opens in login/signup mode
  useEffect(() => {
    if (isOpen && (mode === 'login' || mode === 'signup'))
      firstInputFieldRef.current?.focus();
  }, [isOpen, mode])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Update form state with input values
    setForm({ ...form, [event.target.name]: event.target.value }) // [event.target.name] is a computed property name (meaning it can be any string)
  }

  // Reset form on Cancel
  const handleCancel = () => {
    setForm(initialForm)
    onCancel()  // Call the onCancel callback to notify parent component
  }

  const handleConfirm = () => {
    onConfirm?.(
      mode === 'login' || mode === 'signup'
        ? form
        : undefined
    )

    // Reset form after short delay
    setTimeout(() => setForm(initialForm), 1000) 
  }

  const handleEnterKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (mode === 'login' || mode === 'signup')) {
      event.preventDefault();
      handleConfirm();
    }
  }

  // Render nothing if modal is not open
  if (!isOpen) 
    return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div 
        className="modal-content" 
        onClick={event => event.stopPropagation()} // Prevents misclicks inside modal from closing it
        onKeyDown={handleEnterKey}
      >  
        <div className="modal-body">
          
          {/* Login modal */}
          {mode === 'login' && (
            <Fragment>
              <h2>Login</h2>

              {/* Input fields */}
              
              {/* Email */}
              <input
                ref={firstInputFieldRef}
                name="email"
                type="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="Email"
              />

              {/* Password */}
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleInputChange}
                placeholder="Password"
              />
            </Fragment>
          )}

          {/* Sign Up modal */}
          {mode === 'signup' && (
            <Fragment>
              <h2>Sign Up</h2>
              
              {/* Input fields */}

              {/* Username */}
              <input
                ref={firstInputFieldRef}
                name="username"
                type="text"
                value={form.username}
                onChange={handleInputChange}
                placeholder="Username (optional)"
              />

              {/* Email */}
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="Email"
              />

              {/* Password */}
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleInputChange}
                placeholder="Password"
              />
            </Fragment>
          )}
          
          {/* Confirm modal */}
          {(mode === 'confirm' || mode === 'info') && (
            <Fragment>
              <h2>{title}</h2>
              <p>{message}</p>
            </Fragment>
          )}
        </div>

        {/* Footer with buttons */}
        <div className="modal-footer">
          
          {/* Cancel */}
          {mode !== 'info' && (
            <button className="modal-btn cancel" onClick={handleCancel}>
              Cancel
            </button>
          )}
          
          {/* Login/Signup */}
          {(mode === 'login' || mode === 'signup') && (
            <button className="modal-btn blue" onClick={handleConfirm}>
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          )}
          
          {/* Confirmation/Info */}
          {(mode === 'confirm' || mode === 'info') && (
            <button
              className={`modal-btn ${isDangerous ? 'danger' : 'blue'}`}
              onClick={handleConfirm}
            >
              {confirmButtonText || 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}