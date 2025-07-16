import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Component that throws an error on button click
const ThrowErrorOnClick: React.FC = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error('Button click error');
  }

  return (
    <button onClick={() => setShouldThrow(true)}>
      Throw Error
    </button>
  );
};

describe('ErrorBoundary', () => {
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('resets error state when retry button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('navigates to home when go home button is clicked', () => {
    // Mock window.location.href
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' };

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const goHomeButton = screen.getByRole('button', { name: /go home/i });
    fireEvent.click(goHomeButton);

    expect(window.location.href).toBe('/');

    // Restore original location
    window.location = originalLocation;
  });

  it('renders custom fallback UI when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('catches errors that occur after initial render', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorOnClick />
      </ErrorBoundary>
    );

    expect(screen.getByText('Throw Error')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /throw error/i });
    fireEvent.click(button);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('catches errors in wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('uses custom fallback in HOC', () => {
      const customFallback = <div>HOC custom error</div>;
      const WrappedComponent = withErrorBoundary(ThrowError, customFallback);

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('HOC custom error')).toBeInTheDocument();
    });

    it('calls custom onError in HOC', () => {
      const customOnError = vi.fn();
      const WrappedComponent = withErrorBoundary(ThrowError, undefined, customOnError);

      render(<WrappedComponent shouldThrow={true} />);

      expect(customOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('sets correct display name for wrapped component', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';

      const WrappedComponent = withErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });

    it('handles components without display name', () => {
      const TestComponent = () => <div>Test</div>;

      const WrappedComponent = withErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });
  });

  describe('Error boundary state management', () => {
    it('maintains error state across re-renders', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Re-render with same error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('resets error state when new error occurs', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry to reset
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Re-render with different error
      const ThrowDifferentError = () => {
        throw new Error('Different error');
      };

      rerender(
        <ErrorBoundary>
          <ThrowDifferentError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
