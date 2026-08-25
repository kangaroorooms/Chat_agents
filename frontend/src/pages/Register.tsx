import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { AxiosError } from "axios"
import authService from "../services/auth.service"
import { ROUTES } from '../config/routes'

interface ErrorResponse {
  message: string;
}

export default function Register(): React.ReactElement {
  const navigate = useNavigate()

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    if (!username.trim()) {
      setError("Username is required");
      return false;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!password) {
      setError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        username,
        email,
        password,
      });

      // Redirect to login after successful registration
      navigate(ROUTES.customerLogin)
    } catch (error) {
      // registration error handled below
      const axiosError = error as AxiosError<ErrorResponse>
      const errorMessage =
        axiosError?.response?.data?.message ||
        axiosError?.message ||
        "Registration failed. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = () => {
    if (error) setError("");
  };

  return (
    <div className="container-page">
      <div className="card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join our chat community</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                handleInputChange();
              }}
              disabled={loading}
              autoComplete="username"
              className={error ? "input-error" : ""}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                handleInputChange();
              }}
              disabled={loading}
              autoComplete="email"
              className={error ? "input-error" : ""}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleInputChange();
                }}
                disabled={loading}
                autoComplete="new-password"
                className={error ? "input-error" : ""}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  handleInputChange();
                }}
                disabled={loading}
                autoComplete="new-password"
                className={error ? "input-error" : ""}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to={ROUTES.customerLogin} className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}