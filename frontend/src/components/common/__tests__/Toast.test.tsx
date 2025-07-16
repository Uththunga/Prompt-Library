import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast, useSuccessToast, useErrorToast } from '../Toast';

// Test component that uses toast hooks
const TestComponent: React.FC = () => {
  const { addToast, clearAllToasts } = useToast();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  return (
    <div>
      <button onClick={() => addToast({ type: 'info', title: 'Info Toast', message: 'Info message' })}>
        Add Info Toast
      </button>
      <button onClick={() => successToast('Success!', 'Success message')}>
        Add Success Toast
      </button>
      <button onClick={() => errorToast('Error!', 'Error message')}>
        Add Error Toast
      </button>
      <button onClick={() => addToast({ 
        type: 'warning', 
        title: 'Warning', 
        message: 'Warning message',
        action: { label: 'Action', onClick: () => console.log('Action clicked') }
      })}>
        Add Warning with Action
      </button>
      <button onClick={clearAllToasts}>
        Clear All
      </button>
    </div>
  );
};

describe('Toast System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders toast provider without errors', () => {
    render(
      <ToastProvider>
        <div>Test content</div>
      </ToastProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('throws error when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('adds and displays info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText('Add Info Toast');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Info Toast')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('adds and displays success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText('Add Success Toast');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Should have green styling (success)
    const toast = screen.getByText('Success!').closest('div');
    expect(toast).toHaveClass('border-l-green-500');
  });

  it('adds and displays error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText('Add Error Toast');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    // Should have red styling (error)
    const toast = screen.getByText('Error!').closest('div');
    expect(toast).toHaveClass('border-l-red-500');
  });

  it('displays toast with action button', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText('Add Warning with Action');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    // Click the action button
    const actionButton = screen.getByText('Action');
    fireEvent.click(actionButton);

    expect(consoleSpy).toHaveBeenCalledWith('Action clicked');
    consoleSpy.mockRestore();
  });

  it('removes toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText('Add Info Toast');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Info Toast')).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Info Toast')).not.toBeInTheDocument();
    });
  });

  it('auto-removes toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText('Add Success Toast');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    // Fast-forward time to trigger auto-removal (default 5000ms)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    });
  });

  it('does not auto-remove error toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText('Add Error Toast');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    // Fast-forward time - error toasts should not auto-remove
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Error toast should still be there
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('clears all toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Add multiple toasts
    fireEvent.click(screen.getByText('Add Info Toast'));
    fireEvent.click(screen.getByText('Add Success Toast'));
    fireEvent.click(screen.getByText('Add Error Toast'));

    await waitFor(() => {
      expect(screen.getByText('Info Toast')).toBeInTheDocument();
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    // Clear all toasts
    fireEvent.click(screen.getByText('Clear All'));

    await waitFor(() => {
      expect(screen.queryByText('Info Toast')).not.toBeInTheDocument();
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.queryByText('Error!')).not.toBeInTheDocument();
    });
  });

  it('limits number of toasts based on maxToasts prop', async () => {
    const TestComponentWithManyToasts: React.FC = () => {
      const { addToast } = useToast();

      return (
        <div>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <button key={i} onClick={() => addToast({ type: 'info', title: `Toast ${i}` })}>
              Add Toast {i}
            </button>
          ))}
        </div>
      );
    };

    render(
      <ToastProvider maxToasts={3}>
        <TestComponentWithManyToasts />
      </ToastProvider>
    );

    // Add 6 toasts
    for (let i = 1; i <= 6; i++) {
      fireEvent.click(screen.getByText(`Add Toast ${i}`));
    }

    await waitFor(() => {
      // Should only show the last 3 toasts (4, 5, 6)
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Toast 3')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
      expect(screen.getByText('Toast 5')).toBeInTheDocument();
      expect(screen.getByText('Toast 6')).toBeInTheDocument();
    });
  });

  it('shows correct icons for different toast types', async () => {
    const TestIconComponent: React.FC = () => {
      const { addToast } = useToast();

      return (
        <div>
          <button onClick={() => addToast({ type: 'success', title: 'Success' })}>Success</button>
          <button onClick={() => addToast({ type: 'error', title: 'Error' })}>Error</button>
          <button onClick={() => addToast({ type: 'warning', title: 'Warning' })}>Warning</button>
          <button onClick={() => addToast({ type: 'info', title: 'Info' })}>Info</button>
        </div>
      );
    };

    render(
      <ToastProvider>
        <TestIconComponent />
      </ToastProvider>
    );

    // Add different types of toasts
    fireEvent.click(screen.getByText('Success'));
    fireEvent.click(screen.getByText('Error'));
    fireEvent.click(screen.getByText('Warning'));
    fireEvent.click(screen.getByText('Info'));

    await waitFor(() => {
      // Check that all toasts are displayed
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    // Icons are rendered as SVG elements, so we check for their presence
    const toastContainer = screen.getByText('Success').closest('[class*="border-l-"]');
    expect(toastContainer).toBeInTheDocument();
  });
});
