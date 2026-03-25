import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/AuthContext.jsx";
import { env } from "../config/env.js";

function extractToken(responseData) {
  return (
    responseData?.accessToken ||
    responseData?.token ||
    responseData?.jwt ||
    responseData?.data?.accessToken ||
    responseData?.data?.token ||
    responseData?.result?.accessToken ||
    responseData?.result?.token ||
    ""
  );
}

function extractUser(responseData) {
  return (
    responseData?.user ||
    responseData?.data?.user ||
    responseData?.result?.user ||
    null
  );
}

function extractErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Login failed. Please check your credentials."
  );
}

export default function LoginPage() {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.isAdmin ? "/admin" : "/chat", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your username/email and password.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        [env.lmsLoginIdentifierField]: identifier.trim(),
        [env.lmsLoginPasswordField]: password,
      };

      const response = await axios.post(env.lmsLoginUrl, payload, {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseData = response.data;
      const token = extractToken(responseData);

      if (!token) {
        setError(
          "Login succeeded, but no access token was returned by LMS API.",
        );
        return;
      }

      const storedUser = extractUser(responseData);

      login({
        token,
        storedUser,
        roleHint: role,
      });

      const redirectTo = location.state?.from?.pathname;
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        const isAdmin =
          String(
            storedUser?.role ||
              storedUser?.userRole ||
              storedUser?.roles?.[0] ||
              "",
          )
            .toUpperCase()
            .includes("ADMIN") || role === "ADMIN";

        navigate(isAdmin ? "/admin" : "/chat", { replace: true });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="eyebrow">{env.appTitle}</div>
        <h1>Enter chat</h1>
        <p className="muted">
          Sign in using your LMS account to access the chat service.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>{env.lmsLoginIdentifierLabel}</span>
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={`Enter your ${env.lmsLoginIdentifierLabel.toLowerCase()}`}
              autoComplete="username"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          <label>
            <span>Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>

          {error && <div className="error-banner">{error}</div>}

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Enter chat"}
          </button>
        </form>

        <div className="login-help muted small">
          This page uses your LMS login API and stores the returned access token
          for chat access.
        </div>
      </div>
    </div>
  );
}
