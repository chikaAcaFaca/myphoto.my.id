import type {
  User,
  FileMetadata,
  Album,
  PaginatedResponse,
  UploadUrlResponse,
  FileUploadConfirmation,
  SearchRequest,
  SearchFilters,
  Subscription,
  Family,
  Memory,
} from '@myphoto/shared';

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.config.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        error.message || 'An error occurred',
        error.code
      );
    }

    return response.json();
  }

  // ============ User API ============
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/users/me');
  }

  async updateUserSettings(settings: Partial<User['settings']>): Promise<User> {
    return this.request<User>('/api/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  async getUserStorage(): Promise<{ used: number; limit: number }> {
    return this.request('/api/users/me/storage');
  }

  // ============ Files API ============
  async getFiles(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    albumId?: string;
    isFavorite?: boolean;
    isArchived?: boolean;
    isTrashed?: boolean;
  }): Promise<PaginatedResponse<FileMetadata>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/files${query ? `?${query}` : ''}`);
  }

  async getFile(fileId: string): Promise<FileMetadata> {
    return this.request(`/api/files/${fileId}`);
  }

  async getUploadUrl(params: {
    filename: string;
    mimeType: string;
    size: number;
  }): Promise<UploadUrlResponse> {
    return this.request('/api/files/upload-url', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async confirmUpload(data: FileUploadConfirmation): Promise<FileMetadata> {
    return this.request('/api/files/confirm-upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFile(
    fileId: string,
    data: Partial<Pick<FileMetadata, 'name' | 'isFavorite' | 'isArchived' | 'albumIds'>>
  ): Promise<FileMetadata> {
    return this.request(`/api/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteFiles(fileIds: string[]): Promise<void> {
    return this.request('/api/files/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    });
  }

  async restoreFile(fileId: string): Promise<FileMetadata> {
    return this.request(`/api/files/${fileId}/restore`, {
      method: 'POST',
    });
  }

  async permanentlyDeleteFile(fileId: string): Promise<void> {
    return this.request(`/api/files/${fileId}/permanent`, {
      method: 'DELETE',
    });
  }

  async emptyTrash(): Promise<void> {
    return this.request('/api/files/trash/empty', {
      method: 'DELETE',
    });
  }

  async getDownloadUrl(fileId: string): Promise<{ url: string }> {
    return this.request(`/api/files/${fileId}/download-url`);
  }

  // ============ Albums API ============
  async getAlbums(): Promise<Album[]> {
    return this.request('/api/albums');
  }

  async getAlbum(albumId: string): Promise<Album> {
    return this.request(`/api/albums/${albumId}`);
  }

  async createAlbum(data: {
    name: string;
    description?: string;
  }): Promise<Album> {
    return this.request('/api/albums', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAlbum(
    albumId: string,
    data: Partial<Pick<Album, 'name' | 'description' | 'coverFileId'>>
  ): Promise<Album> {
    return this.request(`/api/albums/${albumId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAlbum(albumId: string): Promise<void> {
    return this.request(`/api/albums/${albumId}`, {
      method: 'DELETE',
    });
  }

  async addFilesToAlbum(albumId: string, fileIds: string[]): Promise<void> {
    return this.request(`/api/albums/${albumId}/files`, {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    });
  }

  async removeFilesFromAlbum(albumId: string, fileIds: string[]): Promise<void> {
    return this.request(`/api/albums/${albumId}/files`, {
      method: 'DELETE',
      body: JSON.stringify({ fileIds }),
    });
  }

  async getAlbumFiles(
    albumId: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<FileMetadata>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/albums/${albumId}/files${query ? `?${query}` : ''}`);
  }

  async shareAlbum(albumId: string): Promise<{ shareLink: string }> {
    return this.request(`/api/albums/${albumId}/share`, {
      method: 'POST',
    });
  }

  async unshareAlbum(albumId: string): Promise<void> {
    return this.request(`/api/albums/${albumId}/share`, {
      method: 'DELETE',
    });
  }

  // ============ Search API ============
  async search(request: SearchRequest): Promise<PaginatedResponse<FileMetadata>> {
    return this.request('/api/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async searchSuggestions(query: string): Promise<string[]> {
    return this.request(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  // ============ Subscription API ============
  async getSubscriptions(): Promise<Subscription[]> {
    return this.request('/api/subscriptions');
  }

  async getCheckoutUrl(tier: number): Promise<{ url: string }> {
    return this.request('/api/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  }

  async getPortalUrl(): Promise<{ url: string }> {
    return this.request('/api/subscriptions/portal');
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    return this.request(`/api/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    });
  }

  // ============ Family API ============
  async getFamily(): Promise<Family | null> {
    return this.request('/api/family');
  }

  async createFamily(name: string): Promise<Family> {
    return this.request('/api/family', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async inviteToFamily(email: string): Promise<void> {
    return this.request('/api/family/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async joinFamily(inviteCode: string): Promise<Family> {
    return this.request('/api/family/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  }

  async leaveFamily(): Promise<void> {
    return this.request('/api/family/leave', {
      method: 'DELETE',
    });
  }

  async removeFamilyMember(userId: string): Promise<void> {
    return this.request(`/api/family/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // ============ Memories API ============
  async getMemories(): Promise<Memory[]> {
    return this.request('/api/memories');
  }

  async getOnThisDay(): Promise<FileMetadata[]> {
    return this.request('/api/memories/on-this-day');
  }

  // ============ People API ============
  async getPeople(): Promise<
    Array<{ id: string; name?: string; photoCount: number; sampleUrl?: string }>
  > {
    return this.request('/api/people');
  }

  async renamePerson(personId: string, name: string): Promise<void> {
    return this.request(`/api/people/${personId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  }

  async getPersonPhotos(
    personId: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<FileMetadata>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/people/${personId}/photos${query ? `?${query}` : ''}`);
  }

  // ============ Duplicates API ============
  async getDuplicates(): Promise<Array<{ group: FileMetadata[]; similarity: number }>> {
    return this.request('/api/duplicates');
  }

  async dismissDuplicate(fileId: string): Promise<void> {
    return this.request(`/api/duplicates/${fileId}/dismiss`, {
      method: 'POST',
    });
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export default ApiClient;
