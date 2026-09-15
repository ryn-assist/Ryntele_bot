const pending = new Map();

export function waitForOtp(jobId, userId, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(jobId);
      reject(new Error('OTP timeout.'));
    }, timeoutMs);

    pending.set(jobId, {
      userId,
      resolve: (otp) => {
        clearTimeout(timer);
        pending.delete(jobId);
        resolve(otp);
      }
    });
  });
}

export function submitOtp(jobId, userId, otp) {
  const request = pending.get(jobId);
  if (!request || request.userId !== userId) return false;

  const value = String(otp).trim();
  if (!/^\d{4,8}$/.test(value)) return false;

  request.resolve(value);
  return true;
}

export function hasPendingOtp(jobId) {
  return pending.has(jobId);
}
