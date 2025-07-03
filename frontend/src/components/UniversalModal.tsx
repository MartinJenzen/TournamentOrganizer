import React, { Fragment, useEffect, useState } from 'react'
import '../styles/UniversalModal.css'

export type ModalMode = 'login' | 'signup' | 'confirm' | 'info'

export type ModalProps = {
  isOpen: boolean
  mode: ModalMode
  message?: string        // for confirm/info
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
export default function UniversalModal({
  isOpen,
  mode,
  message,
  onConfirm,
  onCancel,
}: ModalProps) {
  
  const initialForm = { email: '', password: '', username: '' }
  // State to manage form inputs for login/signup modes
  const [form, setForm] = useState(initialForm)

  // Clear out the form whenever isOpen flips to false
  // This ensures the form is reset when the modal closes
  useEffect(() => {
    if (!isOpen) 
      setForm(initialForm)
  }, [isOpen])

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
    setForm(initialForm)
  }

  // Render nothing if modal is not open
  if (!isOpen) 
    return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>  {/* Prevents misclicks inside modal from closing it */}
        <div className="modal-body">
          
          {/* Login Modal */}
          {mode === 'login' && (
            <Fragment>
              <h2>Login</h2>

              {/* Input fields */}
              
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

          {/* Sign Up Modal */}
          {mode === 'signup' && (
            <Fragment>
              <h2>Sign Up</h2>
              
              {/* Input fields */}

              {/* Username */}
              <input
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
          
          {/* Confirm/Info Modal */}
          {(mode === 'confirm' || mode === 'info') && (
            <Fragment>
              <h2>{mode === 'confirm' ? 'Confirm' : 'Info'}</h2>
              <p>{message}</p>
            </Fragment>
          )}
        </div>

        {/* Footer with buttons */}
        <div className="modal-footer">
          
          {/* Cancel */}
          <button className="modal-btn modal-btn-cancel" onClick={handleCancel}>
            {mode === 'info' ? 'Close' : 'Cancel'}
          </button>
          
          {/* Login/signup */}
          {(mode === 'login' || mode === 'signup') && (
            <button className="modal-btn modal-btn-confirm" onClick={handleConfirm}>
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          )}
          
          {/* Confirmation */}
          {mode === 'confirm' && (
            <button className="modal-btn modal-btn-confirm" onClick={handleConfirm}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  )
}