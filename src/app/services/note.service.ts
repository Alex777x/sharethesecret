import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Note {
  id: string;
  content?: string;
  file?: {
    name: string;
    data: ArrayBuffer;
  };
  hasPassword: boolean;
  ttl: string;
  content_iv?: Uint8Array;
  file_iv?: Uint8Array;
}

@Injectable({ providedIn: 'root' })
export class NoteService {
  private api = `${environment.apiUrl}/notes`;

  constructor(private http: HttpClient) {}

  createNote(formData: FormData) {
    return this.http.post<{ id: string }>(this.api, formData);
  }

  getNote(id: string) {
    return this.http.get<Note>(`${this.api}/${id}`);
  }

  deleteNote(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
