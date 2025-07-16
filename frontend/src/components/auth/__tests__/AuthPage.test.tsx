import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthPage } from '../AuthPage';
import { useAuth } from '../../../contexts/AuthContext';
import { ToastProvider } from '../../common/Toast';

// Mock auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('AuthPage', () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockSignInWithGoogle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: vi.fn(),
      signInWithGoogle: mockSignInWithGoogle
    });
  });

  it('renders sign in form by default', () => {
    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches to sign up form', () => {
    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const signUpLink = screen.getByText(/don't have an account/i);
    fireEvent.click(signUpLink);

    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('validates email format', async () => {
    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('validates password confirmation in sign up', async () => {
    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    // Switch to sign up
    const signUpLink = screen.getByText(/don't have an account/i);
    fireEvent.click(signUpLink);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signIn with valid credentials', async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls signUp with valid data', async () => {
    mockSignUp.mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    // Switch to sign up
    const signUpLink = screen.getByText(/don't have an account/i);
    fireEvent.click(signUpLink);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls signInWithGoogle when Google button is clicked', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
  });

  it('shows loading state during authentication', async () => {
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(signInButton).toBeDisabled();

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  it('handles authentication errors', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'));

    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('shows loading state from auth context', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: true,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: vi.fn(),
      signInWithGoogle: mockSignInWithGoogle
    });

    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('clears form when switching between sign in and sign up', () => {
    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Fill in sign in form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Switch to sign up
    const signUpLink = screen.getByText(/don't have an account/i);
    fireEvent.click(signUpLink);

    // Form should be cleared
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
    expect(screen.getByLabelText(/^password/i)).toHaveValue('');
  });

  it('handles Google sign in errors', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('Google sign in failed'));

    render(
      <TestWrapper>
        <AuthPage />
      </TestWrapper>
    );

    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/google sign in failed/i)).toBeInTheDocument();
    });
  });
});
