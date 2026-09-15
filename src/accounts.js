const accounts = [];

export function addAccount(userId, email) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Email tidak valid.');
  }

  const exists = accounts.some((account) => account.email === normalized);
  if (exists) throw new Error('Email sudah ada di stok.');

  const account = {
    id: crypto.randomUUID(),
    userId,
    email: normalized,
    status: 'available',
    createdAt: Date.now()
  };

  accounts.push(account);
  return account;
}

export function takeAvailableAccount(userId) {
  return accounts.find((account) => account.userId === userId && account.status === 'available') || null;
}

export function setAccountStatus(id, status) {
  const account = accounts.find((item) => item.id === id);
  if (!account) return null;
  account.status = status;
  return account;
}

export function getAccounts(userId) {
  return accounts.filter((account) => account.userId === userId);
}
