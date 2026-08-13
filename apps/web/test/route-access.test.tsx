import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../src/features/auth/route-access.js';
import { useAuthStore } from '../src/store/auth-store.js';

const administrator = {
  id: '507f1f77bcf86cd799439011',
  universityId: '507f191e810c19729de860ea',
  email: 'admin@lmu.edu.ng',
  fullName: 'Chidinma Okeke',
  role: 'university_admin' as const,
};
const student = { ...administrator, id: '507f1f77bcf86cd799439012', role: 'student' as const };

function Subject() {
  return (
    <MemoryRouter initialEntries={['/secure']}>
      <Routes>
        <Route path="/login" element={<p>Sign-in destination</p>} />
        <Route
          path="/secure"
          element={
            <ProtectedRoute permissions={['settings:write']}>
              <p>Secure settings</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => useAuthStore.getState().clearSession());
  it('redirects guests to sign in', () => {
    useAuthStore.getState().clearSession();
    render(<Subject />);
    expect(screen.getByText('Sign-in destination')).toBeVisible();
  });
  it('admits roles with the required permission', () => {
    useAuthStore.getState().setSession(administrator, 'test-token');
    render(<Subject />);
    expect(screen.getByText('Secure settings')).toBeVisible();
  });
  it('renders the 403 experience for a signed-in role without permission', () => {
    useAuthStore.getState().setSession(student, 'test-token');
    render(<Subject />);
    expect(screen.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
  });
});
