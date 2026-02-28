// API configuration - set your backend URL here
const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Servidor não retornou JSON. Verifique se o backend está rodando e VITE_API_URL está configurado.');
  }
}

export function getAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(email: string, password: string) {
  const res = await fetch(getApiUrl('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
  return data;
}

export async function checkSession() {
  try {
    const res = await fetch(getApiUrl('/verifica-sessao'), { credentials: 'include' });
    const data = await parseResponse(res);
    return data.logado;
  } catch {
    return false;
  }
}

export async function logout() {
  await fetch(getApiUrl('/logout'), { credentials: 'include' });
}

export async function uploadBaseImage(file: File, token: string) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(getApiUrl('/upload-base'), {
    method: 'POST',
    body: formData,
    headers: { 'Authorization': `Bearer ${token}` },
    credentials: 'include',
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'Erro ao enviar imagem');
  return data.imageUrl;
}

export async function generateImage(params: Record<string, unknown>, token: string) {
  const res = await fetch(getApiUrl('/generate-image'), {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(params),
    credentials: 'include',
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'Erro ao gerar imagem');
  return data.processedImageUrl;
}

export async function clearStorage(token: string) {
  const res = await fetch(getApiUrl('/clear-storage'), {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
    credentials: 'include',
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'Erro ao limpar');
  return data.message;
}
