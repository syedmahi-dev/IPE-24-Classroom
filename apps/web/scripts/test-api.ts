import { GET } from './src/app/api/v1/admin/files/route';
import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: () => Promise.resolve({
    user: { id: 'test-user', role: 'super_admin' }
  })
}));

async function test() {
  const req = new Request('http://localhost:3000/api/v1/admin/files?page=1&limit=15');
  const res = await GET(req);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

test().catch(console.error);
