import { useState, useEffect } from 'react';

export function useCurrentUser<T = any>(): T | null {
  const [user, setUser] = useState<T | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  return user;
}
