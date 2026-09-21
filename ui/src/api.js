const API_BASE = "http://127.0.0.1:8000";

async function requestJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export async function createProject(payload) {
  return requestJson("/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function listProjects() {
  return requestJson("/v1/projects");
}

export async function getProject(projectId) {
  return requestJson(`/v1/projects/${projectId}`);
}

export async function updateProject(projectId, payload) {
  return requestJson(`/v1/projects/${projectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function saveRoomSpec(projectId, payload) {
  return requestJson(`/v1/projects/${projectId}/room-spec`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getRoomSpec(projectId) {
  return requestJson(`/v1/projects/${projectId}/room-spec`);
}

export async function saveProjectLayout(projectId, payload) {
  return requestJson(`/v1/projects/${projectId}/layouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function listProjectLayouts(projectId) {
  return requestJson(`/v1/projects/${projectId}/layouts`);
}

export async function createProjectQuote(projectId, payload) {
  return requestJson(`/v1/projects/${projectId}/quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getProjectQuote(id) {
  return requestJson(`/v1/quotes/${id}`);
}

export async function createQuote(payload) {
  if (payload?.project_id) {
    const { project_id: projectId, ...quotePayload } = payload;
    return createProjectQuote(projectId, quotePayload);
  }

  return requestJson("/quotes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getQuote(id) {
  try {
    return await getProjectQuote(id);
  } catch {
    // Fallback to legacy quote endpoint.
  }

  return requestJson(`/quotes/${id}`);
}