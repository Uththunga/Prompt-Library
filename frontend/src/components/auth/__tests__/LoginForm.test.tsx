import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '../LoginForm';

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
  }),
}));

describe('LoginForm', () => {
  const mockOnSwitchToSignup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />);
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    // HTML5 validation should prevent submission
    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeInvalid();
  });

  it('calls onSwitchToSignup when signup link is clicked', () => {
    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />);
    
    const signupLink = screen.getByText('Sign up');
    fireEvent.click(signupLink);
    
    expect(mockOnSwitchToSignup).toHaveBeenCalledTimes(1);
  });

  it('toggles password visibility', () => {
    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />);
    
    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
