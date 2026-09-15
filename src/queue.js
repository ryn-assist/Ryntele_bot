const jobs = [];

export function enqueue(job) {
  jobs.push({ ...job, status: 'queued', createdAt: Date.now() });
  return jobs.length;
}

export function dequeue() {
  const job = jobs.find((item) => item.status === 'queued');
  if (!job) return null;
  job.status = 'running';
  return job;
}

export function updateJob(id, patch) {
  const job = jobs.find((item) => item.id === id);
  if (!job) return null;
  Object.assign(job, patch);
  return job;
}

export function getJobs(userId) {
  return jobs.filter((item) => item.userId === userId);
}

export function getQueue() {
  return [...jobs];
}
