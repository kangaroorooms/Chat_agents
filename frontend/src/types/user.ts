export interface User {
  id: string;
  username: string;
  email: string;
  // optional role provided by backend: 'CUSTOMER' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN'
  role?: string;
  companyId?: string;
  isActive?: boolean;
  createdAt?: string;
}