import React, { useState } from 'react';
import './LoginScreen.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { username, password, rememberMe });
  };

  return (
    <div className="auth-page-wrapper min-vh-100 d-flex flex-column">
      {/* Background */}
      <div className="auth-one-bg-position auth-one-bg" id="auth-particles">
        <canvas className="particles-js-canvas-el"></canvas>
      </div>
      
      {/* Content */}
      <div className="auth-page-content flex-grow-1 d-flex align-items-center">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center mt-sm-5 mb-4 text-white-50">
                <div>
                  <a href="#" className="d-inline-block auth-logo">
                    <img src="/Logo2eiu.png" alt="EIU Logo" height="120" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Login Form */}
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6 col-xl-5">
              <div className="card mt-4">
                <div className="card-body p-4">
                  <div className="text-center mt-2">
                    <h5 className="text-primary">! 💕 Welcome Back 💕 !</h5>
                    <p className="text-muted">💕 Sign in to access your account 💕</p>
                  </div>
                  
                  <div className="p-2 mt-4">
                    <form onSubmit={handleLogin}>
                      <div className="mb-3">
                        <label htmlFor="username" className="form-label">
                          Username or Email
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Please enter your username"
                          required
                        />
                      </div>
                      
                      <div className="mb-3">
                        <div className="float-end">
                          <a href="#" className="text-muted">
                            Forgot Password?
                          </a>
                        </div>
                        <label className="form-label" htmlFor="password-input">
                          Password
                        </label>
                        <div className="position-relative auth-pass-inputgroup mb-3">
                          <input
                            type="password"
                            className="form-control pe-5"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Please enter your password"
                            id="password"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          id="auth-remember-check"
                        />
                        <label className="form-check-label" htmlFor="auth-remember-check">
                          Remember me
                        </label>
                      </div>

                      <div className="mt-4">
                        <button className="btn btn-success w-100" type="submit">
                          Sign In!
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="mb-0 register-text">
                  Don't have an account?{' '}
                  <a href="#" className="fw-semibold register-link">
                    Register Now
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="footer mt-auto">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center">
                <p className="mb-0 text-muted">
                  © {new Date().getFullYear()} EIU SmartPresence{' '}
                  <i className="text-danger">❤️</i>
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginScreen;
